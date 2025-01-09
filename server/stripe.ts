import Stripe from 'stripe';
import { type Express } from "express";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function getCustomersByEmail(email: string) {
  console.log(`[Stripe] Searching for customers with email: ${email}`);
  const customers = await stripe.customers.list({
    email,
    limit: 100,
  });

  if (customers.data.length === 0) {
    console.log(`[Stripe] No customers found for email: ${email}`);
    return null;
  }

  console.log(`[Stripe] Found ${customers.data.length} customers`);

  // 全ての顧客情報とそれぞれのサブスクリプション情報を取得
  const customersData = await Promise.all(customers.data.map(async (customer) => {
    console.log(`[Stripe] Processing customer: ${customer.id}`);

    // サブスクリプション情報の取得
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 100,
      expand: ['data.default_payment_method'],
    });

    // 支払い履歴の取得
    const paymentHistory = await stripe.invoices.list({
      customer: customer.id,
      limit: 100,
    });

    // サブスクリプションデータを整形
    const formattedSubscriptions = await Promise.all(subscriptions.data.map(async subscription => {
      const items = subscription.items.data;

      // 各アイテムの詳細情報を取得
      const itemDetails = await Promise.all(items.map(async item => {
        const price = await stripe.prices.retrieve(item.price.id, {
          expand: ['product'],
        });

        return {
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          quantity: item.quantity,
          product: {
            name: typeof price.product === 'object' ? price.product.name : 'Product',
            description: typeof price.product === 'object' ? price.product.description : null,
          }
        };
      }));

      // 支払い方法の情報を取得
      let paymentMethod = null;
      if (subscription.default_payment_method && typeof subscription.default_payment_method === 'object') {
        const card = subscription.default_payment_method.card;
        if (card) {
          paymentMethod = {
            card: {
              brand: card.brand,
              last4: card.last4,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
            }
          };
        }
      }

      return {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end,
        trial_start: subscription.trial_start,
        cancel_at_period_end: subscription.cancel_at_period_end,
        default_payment_method: paymentMethod,
        items: itemDetails, // 全てのアイテムを返す
      };
    }));

    // 支払い履歴を整形
    const formattedPaymentHistory = paymentHistory.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      invoice_pdf: invoice.invoice_pdf,
    }));

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        created: customer.created,
        metadata: customer.metadata,
      },
      subscriptions: formattedSubscriptions,
      payment_history: formattedPaymentHistory,
    };
  }));

  console.log(`[Stripe] Formatted response:`, JSON.stringify(customersData, null, 2));
  return customersData;
}

export function setupStripeRoutes(app: Express) {
  app.get("/api/stripe/customer", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      console.log(`[Stripe] Fetching customer data for user: ${req.user.email}`);
      const customersData = await getCustomersByEmail(req.user.email);

      if (!customersData) {
        return res.status(404).json({ message: "Stripeの顧客情報が見つかりません" });
      }

      res.json(customersData);
    } catch (error) {
      console.error('[Stripe] APIエラー:', error);
      res.status(500).json({ message: "顧客情報の取得中にエラーが発生しました" });
    }
  });

  app.post("/api/stripe/subscription/:id/auto-renewal", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionId = req.params.id;

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customersData = await getCustomersByEmail(req.user.email);

      if (!customersData?.some(data =>
        data.subscriptions.some(sub => sub.id === subscriptionId)
      )) {
        return res.status(403).json({ message: "このサブスクリプションにアクセスする権限がありません" });
      }

      if (subscription.cancel_at_period_end) {
        // 自動更新を再開
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });
      } else {
        // 次回更新時にキャンセル
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      res.json({ message: "自動更新設定を更新しました" });
    } catch (error) {
      console.error('[Stripe] 自動更新設定の更新エラー:', error);
      res.status(500).json({ message: "設定の更新中にエラーが発生しました" });
    }
  });

  app.post("/api/stripe/subscription/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionId = req.params.id;

    try {
      const customersData = await getCustomersByEmail(req.user.email);

      if (!customersData?.some(data =>
        data.subscriptions.some(sub => sub.id === subscriptionId)
      )) {
        return res.status(403).json({ message: "このサブスクリプションにアクセスする権限がありません" });
      }

      // サブスクリプションを即時キャンセル
      await stripe.subscriptions.cancel(subscriptionId);

      res.json({ message: "サブスクリプションをキャンセルしました" });
    } catch (error) {
      console.error('[Stripe] サブスクリプションのキャンセルエラー:', error);
      res.status(500).json({ message: "キャンセル処理中にエラーが発生しました" });
    }
  });

  // 支払い方法変更用のSetup Intentを作成
  app.post("/api/stripe/setup-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      // ユーザーのStripe顧客情報を取得
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData || customersData.length === 0) {
        return res.status(404).json({ message: "Stripeの顧客情報が見つかりません" });
      }

      // 最初の顧客IDを使用
      const customerId = customersData[0].customer.id;

      // Setup Intentを作成
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // 将来の支払いに使用可能
      });

      res.json({
        clientSecret: setupIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      });
    } catch (error) {
      console.error('[Stripe] Setup Intent作成エラー:', error);
      res.status(500).json({ message: "支払い方法の設定準備中にエラーが発生しました" });
    }
  });

  // 支払い方法をデフォルトに設定
  app.post("/api/stripe/set-default-payment-method", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const { paymentMethodId } = req.body;

    try {
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData || customersData.length === 0) {
        return res.status(404).json({ message: "Stripeの顧客情報が見つかりません" });
      }

      const customerId = customersData[0].customer.id;

      // 顧客のデフォルト支払い方法を更新
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // 該当顧客の全てのサブスクリプションの支払い方法も更新
      for (const customerData of customersData) {
        for (const subscription of customerData.subscriptions) {
          await stripe.subscriptions.update(subscription.id, {
            default_payment_method: paymentMethodId,
          });
        }
      }

      res.json({ message: "支払い方法を更新しました" });
    } catch (error) {
      console.error('[Stripe] 支払い方法更新エラー:', error);
      res.status(500).json({ message: "支払い方法の更新中にエラーが発生しました" });
    }
  });
}