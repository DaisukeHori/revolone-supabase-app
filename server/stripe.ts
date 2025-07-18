import { type Express } from "express";
import Stripe from 'stripe';
import { currentConfig } from './config';

// Product型の定義
interface StripeProduct {
  id: string;
  name?: string;
  description?: string | null;
  active?: boolean;
  // 他の必要なプロパティを追加
}

if (!currentConfig.stripe.secretKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(currentConfig.stripe.secretKey);

// setupStripeRoutesの型定義を修正
type SetupOptions = {
  debug?: boolean;
};

export function setupStripeRoutes(app: Express, options: SetupOptions = {}) {
  const debug = options.debug ?? false;

  // 新規サブスクリプション作成エンドポイントを追加
  app.post("/api/stripe/customer/:id/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const customerId = req.params.id;
    const { items } = req.body as {
      items: Array<{
        price: string;
        quantity: number;
      }>;
    };

    try {
      // ユーザーの認証確認
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData?.some(data => data.customer.id === customerId)) {
        return res.status(403).json({ message: "この顧客情報にアクセスする権限がありません" });
      }

      console.log('[Stripe] Creating subscription for customer:', customerId);
      console.log('[Stripe] Items:', items);

      // 既存の支払い方法を取得
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      // デフォルトの支払い方法を取得
      const customer = await stripe.customers.retrieve(customerId);
      const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

      // サブスクリプションを作成
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: items.map(item => ({
          price: item.price,
          quantity: item.quantity,
        })),
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card', 'us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        default_payment_method: defaultPaymentMethod || undefined,
      });

      const invoice = subscription.latest_invoice;
      let clientSecret = null;

      if (typeof invoice !== 'string' && invoice?.payment_intent) {
        const paymentIntent = typeof invoice.payment_intent === 'string' 
          ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
          : invoice.payment_intent;
        clientSecret = paymentIntent.client_secret;
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret,
        paymentMethods: paymentMethods.data,
        defaultPaymentMethod,
      });
    } catch (error) {
      console.error('[Stripe] サブスクリプション作成エラー:', error);
      res.status(500).json({ message: "サブスクリプションの作成中にエラーが発生しました" });
    }
  });

  // 新しいエンドポイントを追加
  app.get("/api/stripe/subscription-item/:id/price", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const subscriptionItemId = req.params.id;
      const priceId = await getPriceIdFromSubscriptionItem(subscriptionItemId);

      if (!priceId) {
        return res.status(404).json({ message: "Price IDが見つかりませんでした" });
      }

      res.json({ priceId });
    } catch (error) {
      console.error('[Stripe] APIエラー:', error);
      res.status(500).json({ message: "Price IDの取得中にエラーが発生しました" });
    }
  });


  // 既存のエンドポイント定義は変更なし
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

  // 顧客メタデータの更新エンドポイントを修正
  app.post("/api/stripe/customer/:id/metadata", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const customerId = req.params.id;
    const { metadata, address, shipping, phone } = req.body;

    try {
      // ユーザーの認証確認
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData?.some(data => data.customer.id === customerId)) {
        return res.status(403).json({ message: "この顧客情報にアクセスする権限がありません" });
      }

      console.log('[Stripe] Updating customer with data:', {
        customerId,
        metadata,
        address,
        shipping,
        phone
      });

      // 顧客情報を更新（メタデータ、住所、電話番号、配送先）
      const customer = await stripe.customers.update(customerId, {
        metadata,
        address: {
          ...address,
          country: 'JP'
        },
        shipping: shipping ? {
          address: {
            ...shipping.address,
            country: 'JP'
          },
          name: shipping.name || null,
          phone: shipping.phone || null
        } : null,
        phone
      });

      console.log('[Stripe] Updated customer:', {
        id: customer.id,
        metadata: customer.metadata,
        address: customer.address,
        shipping: customer.shipping,
        phone: customer.phone
      });

      res.json({
        message: "顧客情報を更新しました",
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          metadata: customer.metadata,
          address: customer.address,
          shipping: customer.shipping,
          phone: customer.phone,
        },
      });
    } catch (error) {
      console.error('[Stripe] 顧客情報更新エラー:', error);
      res.status(500).json({ message: "顧客情報の更新中にエラーが発生しました" });
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

  app.post("/api/stripe/subscription/:id/quantities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionId = req.params.id;
    const { items } = req.body as { items: Array<{
      subscription_item_id?: string;
      price?: string;
      quantity: number;
    }> };

    console.log('[Stripe] Updating quantities for subscription:', subscriptionId);
    console.log('[Stripe] Update items:', items);

    try {
      const customersData = await getCustomersByEmail(req.user.email);

      if (!customersData?.some(data =>
        data.subscriptions.some(sub => sub.id === subscriptionId)
      )) {
        return res.status(403).json({ message: "このサブスクリプションにアクセスする権限がありません" });
      }

      // サブスクリプションの詳細を取得
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });

      console.log('[Stripe] Current subscription items:', subscription.items.data.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price.id,
      })));

      // 各アイテムの数量を更新
      const updateResults = await Promise.all(items.map(async (item) => {
        console.log('[Stripe] Processing item:', item);
        try {
          if (item.subscription_item_id) {
            // 既存のアイテムを更新
            const updated = await stripe.subscriptionItems.update(item.subscription_item_id, {
              quantity: item.quantity,
            });
            console.log('[Stripe] Successfully updated item:', {
              id: updated.id,
              quantity: updated.quantity,
            });
            return updated;
          } else if (item.price) {
            // 新規アイテムを追加
            const added = await stripe.subscriptionItems.create({
              subscription: subscriptionId,
              price: item.price,
              quantity: item.quantity,
            });
            console.log('[Stripe] Successfully added new item:', {
              id: added.id,
              price: added.price.id,
              quantity: added.quantity,
            });
            return added;
          }
        } catch (error) {
          console.error('[Stripe] Error updating/adding item:', error);
          throw error;
        }
      }));

      console.log('[Stripe] All items updated:', updateResults);

      // 更新後のサブスクリプションを返す
      const updatedSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });

      console.log('[Stripe] Final subscription state:', updatedSubscription.items.data.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price.id,
      })));

      res.json({ message: "数量を更新しました", subscription: updatedSubscription });
    } catch (error) {
      console.error('[Stripe] 数量更新エラー:', error);
      res.status(500).json({ message: "数量の更新中にエラーが発生しました" });
    }
  });

  // サブスクリプションアイテムの削除エンドポイントを追加
  app.delete("/api/stripe/subscription-item/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionItemId = req.params.id;

    try {
      // アクセス権限の確認
      const item = await stripe.subscriptionItems.retrieve(subscriptionItemId);
      const subscription = await stripe.subscriptions.retrieve(item.subscription as string);
      const customersData = await getCustomersByEmail(req.user.email);

      if (!customersData?.some(data =>
        data.subscriptions.some(sub => sub.id === subscription.id)
      )) {
        return res.status(403).json({ message: "このサブスクリプションアイテムにアクセスする権限がありません" });
      }

      // サブスクリプションアイテムを削除
      await stripe.subscriptionItems.del(subscriptionItemId);
      console.log('[Stripe] Successfully deleted subscription item:', subscriptionItemId);

      res.json({ message: "サブスクリプションアイテムを削除しました" });
    } catch (error) {
      console.error('[Stripe] Error deleting subscription item:', error);
      res.status(500).json({ message: "サブスクリプションアイテムの削除中にエラーが発生しました" });
    }
  });

  // 価格データ取得
  app.get('/api/stripe/prices', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "ログインが必要です" });
    }
    try {
      const priceIds = [
        'price_1NwwacAPdno01lSPWH92pzrl',
        'price_1OCCkvAPdno01lSP44FyPiZ3', 
        'price_1OED1uAPdno01lSP3UESyV7C'
      ];

      const prices = await Promise.all(
        priceIds.map(priceId => stripe.prices.retrieve(priceId))
      );

      res.json(prices);
    } catch (error) {
      console.error('価格データ取得エラー:', error);
      res.status(500).send('価格データの取得に失敗しました');
    }
  });

  // サブスクリプション詳細取得
  app.get('/api/stripe/subscription/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "ログインが必要です" });
    }
  });

}

// subscription_item_idからpriceIdを取得する関数を追加
async function getPriceIdFromSubscriptionItem(subscriptionItemId: string): Promise<string | null> {
  try {
    const subscriptionItem = await stripe.subscriptionItems.retrieve(subscriptionItemId);
    if (typeof subscriptionItem.price === 'string') {
      return subscriptionItem.price;
    }
    return subscriptionItem.price.id;
  } catch (error) {
    console.error('[Stripe] Error getting priceId:', error);
    return null;
  }
}

// 既存のコードは変更なし
export async function getCustomersByEmail(email: string) {
  console.log(`[Stripe] Searching for customers with email: ${email}`);
  const customers = await stripe.customers.list({
    email,
    limit: 100,
    expand: ['data.subscriptions'],
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
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 100,
      expand: ['data.charge'], // chargeオブジェクトを展開して取得
    });

    // 支払い履歴を整形
    const formattedPaymentHistory = await Promise.all(invoices.data.map(async (invoice) => {
      // chargeオブジェクトから領収書URLを取得
      let receipt_url = null;
      if (invoice.charge && typeof invoice.charge !== 'string') {
        receipt_url = invoice.charge.receipt_url;
      }

      return {
        id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        invoice_pdf: invoice.invoice_pdf,
        receipt_url: receipt_url,
        hosted_invoice_url: invoice.hosted_invoice_url,
      };
    }));

    // サブスクリプションデータを整形
    const formattedSubscriptions = await Promise.all(subscriptions.data.map(async subscription => {
      const items = subscription.items.data;

      // 各アイテムの詳細情報を取得
      const itemDetails = await Promise.all(items.map(async item => {
        const price = await stripe.prices.retrieve(item.price.id, {
          expand: ['product'],
        });

        // Product型を適切に処理
        const product = typeof price.product === 'object' ? price.product as StripeProduct : null;

        return {
          subscription_item_id: item.id,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          quantity: item.quantity,
          product: {
            name: product?.name ?? 'Product',
            description: product?.description ?? null,
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
        items: itemDetails,
      };
    }));

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        created: customer.created,
        phone: customer.phone,
        address: customer.address ? {
          line1: customer.address.line1,
          line2: customer.address.line2,
          city: customer.address.city,
          state: customer.address.state,
          postal_code: customer.address.postal_code,
          country: customer.address.country,
        } : null,
        shipping: customer.shipping ? {
          address: {
            line1: customer.shipping.address?.line1 || null,
            line2: customer.shipping.address?.line2 || null,
            city: customer.shipping.address?.city || null,
            state: customer.shipping.address?.state || null,
            postal_code: customer.shipping.address?.postal_code || null,
          },
          name: customer.shipping.name,
          phone: customer.shipping.phone,
        } : null,
        metadata: customer.metadata || {},
      },
      subscriptions: formattedSubscriptions,
      payment_history: formattedPaymentHistory,
    };
  }));

  return customersData;
}