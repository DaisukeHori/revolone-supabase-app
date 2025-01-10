import { type Express } from "express";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// レボナイザー製品の設定
const REVONAIZER_PRODUCTS = {
  TIER1: {
    price_id: 'price_1NwwacAPdno01lSPWH92pzrl',
    product_id: 'prod_OkRTix5Mimwc9p',
    min_quantity: 1,
    max_quantity: 1,
  },
  TIER2: {
    price_id: 'price_1OCCkvAPdno01lSP44FyPiZ3',
    product_id: 'prod_P0DB3wRLVlz8GV',
    min_quantity: 0,
    max_quantity: 3,
  },
  TIER3: {
    price_id: 'price_1OED1uAPdno01lSP3UESyV7C',
    product_id: 'prod_P1IWo9CT6gNkX2',
    min_quantity: 0,
    max_quantity: Infinity,
  },
} as const;

// レボナイザー製品かどうかを判定する関数
function isRevonaizerProduct(productId: string): boolean {
  return Object.values(REVONAIZER_PRODUCTS).some(
    product => product.product_id === productId
  );
}

// 数量計算関数
function calculateProductQuantities(totalQuantity: number) {
  if (totalQuantity < 1) {
    throw new Error('数量は1以上である必要があります');
  }

  const quantities: Record<string, number> = {
    [REVONAIZER_PRODUCTS.TIER1.product_id]: 1,
  };

  if (totalQuantity === 1) {
    return quantities;
  }

  // 2-4台目はTIER2
  const tier2Quantity = Math.min(3, totalQuantity - 1);
  if (tier2Quantity > 0) {
    quantities[REVONAIZER_PRODUCTS.TIER2.product_id] = tier2Quantity;
  }

  // 5台目以降はTIER3
  const remainingQuantity = totalQuantity - 1 - (quantities[REVONAIZER_PRODUCTS.TIER2.product_id] || 0);
  if (remainingQuantity > 0) {
    quantities[REVONAIZER_PRODUCTS.TIER3.product_id] = remainingQuantity;
  }

  return quantities;
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

// 他のエンドポイントハンドラーは変更なし
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
  app.post("/api/stripe/subscription/:id/update-quantities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionId = req.params.id;
    const { items } = req.body as { items: { id: string; quantity: number }[] };

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

      // 更新対象のアイテムを分類（レボナイザー製品とその他）
      const revoItems: typeof items = [];
      const otherItems: typeof items = [];

      items.forEach(item => {
        const subItem = subscription.items.data.find(i => i.id === item.id);
        if (subItem && typeof subItem.price.product === 'object' &&
            isRevonaizerProduct(subItem.price.product.id)) {
          revoItems.push(item);
        } else {
          otherItems.push(item);
        }
      });

      // レボナイザー製品の数量を更新
      if (revoItems.length > 0) {
        // 合計数量を計算
        const totalQuantity = revoItems.reduce((sum, item) => sum + item.quantity, 0);
        const newQuantities = calculateProductQuantities(totalQuantity);

        // 既存のアイテムを更新または削除
        for (const item of subscription.items.data) {
          if (typeof item.price.product === 'object' && isRevonaizerProduct(item.price.product.id)) {
            const newQuantity = newQuantities[item.price.product.id] || 0;
            if (newQuantity > 0) {
              await stripe.subscriptionItems.update(item.id, {
                quantity: newQuantity,
              });
            } else {
              await stripe.subscriptionItems.del(item.id);
            }
          }
        }

        // 新しいアイテムを追加
        for (const [productId, quantity] of Object.entries(newQuantities)) {
          const existingItem = subscription.items.data.find(
            item => typeof item.price.product === 'object' && item.price.product.id === productId
          );

          if (!existingItem && quantity > 0) {
            const priceId = Object.values(REVONAIZER_PRODUCTS).find(
              p => p.product_id === productId
            )?.price_id;

            if (priceId) {
              await stripe.subscriptionItems.create({
                subscription: subscriptionId,
                price: priceId,
                quantity,
              });
            }
          }
        }
      }

      // その他の製品の数量を更新
      for (const item of otherItems) {
        await stripe.subscriptionItems.update(item.id, {
          quantity: item.quantity,
        });
      }

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