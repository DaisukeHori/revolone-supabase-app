import { type Express } from "express";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// レボナイザー商品の定義
const REVONIZER_PRODUCTS = {
  FIRST_UNIT: {
    priceId: 'price_1NwwacAPdno01lSPWH92pzrl',
  },
  SECOND_TO_FOURTH: {
    priceId: 'price_1OCCkvAPdno01lSP44FyPiZ3',
  },
  FIFTH_AND_MORE: {
    priceId: 'price_1OED1uAPdno01lSP3UESyV7C',
  },
} as const;

// subscription_item_idからpriceIdを取得する関数
async function getPriceIdFromSubscriptionItem(subscriptionItemId: string): Promise<string | null> {
  try {
    const subscriptionItem = await stripe.subscriptionItems.retrieve(subscriptionItemId);
    return typeof subscriptionItem.price === 'string' ? subscriptionItem.price : subscriptionItem.price.id;
  } catch (error) {
    console.error('[Stripe] Error getting priceId:', error);
    return null;
  }
}

// priceIdからRevonizerの商品タイプを判定する関数
function getRevonizerProductTypeByPriceId(priceId: string): 'FIRST_UNIT' | 'SECOND_TO_FOURTH' | 'FIFTH_AND_MORE' | null {
  if (priceId === REVONIZER_PRODUCTS.FIRST_UNIT.priceId) return 'FIRST_UNIT';
  if (priceId === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId) return 'SECOND_TO_FOURTH';
  if (priceId === REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId) return 'FIFTH_AND_MORE';
  return null;
}

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

        const product = typeof price.product === 'object' ? price.product : null;

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
            country: customer.shipping.address?.country || null,
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

export function setupStripeRoutes(app: Express) {
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

  // プランアイテムの数量を更新
  app.post("/api/stripe/subscription/:id/quantities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionId = req.params.id;
    const { items } = req.body as { items: { subscription_item_id: string; quantity: number }[] };

    try {
      console.log('[Stripe] Updating subscription quantities:', {
        subscriptionId,
        items,
      });

      // ユーザーの認証確認
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData?.some(data =>
        data.subscriptions.some(sub => sub.id === subscriptionId)
      )) {
        return res.status(403).json({ message: "このサブスクリプションにアクセスする権限がありません" });
      }

      // 各アイテムのpriceIdを取得して処理
      const itemsWithPriceId = await Promise.all(items.map(async (item) => {
        const priceId = await getPriceIdFromSubscriptionItem(item.subscription_item_id);
        const productType = priceId ? getRevonizerProductTypeByPriceId(priceId) : null;
        return {
          ...item,
          priceId,
          productType,
        };
      }));

      console.log('[Stripe] Items with priceId:', itemsWithPriceId);

      // 基本ライセンス（FIRST_UNIT）は常に数量1を維持
      const updatedItems = itemsWithPriceId.map(item => ({
        id: item.subscription_item_id,
        quantity: item.productType === 'FIRST_UNIT' ? 1 : item.quantity,
      }));

      console.log('[Stripe] Updating items:', updatedItems);

      // 各アイテムの数量を個別に更新
      await Promise.all(updatedItems.map(async (item) => {
        try {
          await stripe.subscriptionItems.update(item.id, {
            quantity: item.quantity,
            proration_behavior: 'always_invoice',
          });
          console.log('[Stripe] Successfully updated item:', item);
        } catch (error) {
          console.error('[Stripe] Error updating item:', item, error);
          throw error;
        }
      }));

      // 更新後のサブスクリプションを返す
      const updatedSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });

      res.json({ message: "数量を更新しました", subscription: updatedSubscription });
    } catch (error) {
      console.error('[Stripe] 数量更新エラー:', error);
      res.status(500).json({ message: "数量の更新中にエラーが発生しました" });
    }
  });
}