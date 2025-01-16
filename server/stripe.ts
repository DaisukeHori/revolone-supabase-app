import { type Express } from "express";
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

type SetupOptions = {
  debug?: boolean;
};

export function setupStripeRoutes(app: Express, options: SetupOptions = {}) {
  const debug = options.debug ?? false;

  // Fix type issues in the existing endpoints
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
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData?.some(data => data.customer.id === customerId)) {
        return res.status(403).json({ message: "この顧客情報にアクセスする権限がありません" });
      }

      console.log('[Stripe] Creating subscription for customer:', customerId);
      console.log('[Stripe] Items:', items);

      // Get existing payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      // Get customer and check for default payment method
      const customerResponse = await stripe.customers.retrieve(customerId);
      let defaultPaymentMethod: string | undefined;

      if (customerResponse && 'invoice_settings' in customerResponse && customerResponse.invoice_settings) {
        defaultPaymentMethod = customerResponse.invoice_settings.default_payment_method as string | undefined;
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: items.map(item => ({
          price: item.price,
          quantity: item.quantity,
        })),
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        default_payment_method: defaultPaymentMethod,
      });

      // Extract client secret from the subscription's latest invoice
      let clientSecret: string | undefined;
      if (
        subscription.latest_invoice &&
        typeof subscription.latest_invoice !== 'string' &&
        subscription.latest_invoice.payment_intent &&
        typeof subscription.latest_invoice.payment_intent !== 'string'
      ) {
        clientSecret = subscription.latest_invoice.payment_intent.client_secret;
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

  // Function to safely handle product data
  const getProductDetails = (product: Stripe.Product | Stripe.DeletedProduct | null) => {
    if (!product || product.deleted) {
      return {
        name: 'Deleted Product',
        description: null,
      };
    }

    return {
      name: 'name' in product ? product.name : 'Unknown Product',
      description: 'description' in product ? product.description : null,
    };
  };

  // Rest of the endpoints remain unchanged
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

  app.post("/api/stripe/customer/:id/metadata", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const customerId = req.params.id;
    const { metadata, address, shipping, phone } = req.body;

    try {
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
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });
      } else {
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

      await stripe.subscriptions.cancel(subscriptionId);

      res.json({ message: "サブスクリプションをキャンセルしました" });
    } catch (error) {
      console.error('[Stripe] サブスクリプションのキャンセルエラー:', error);
      res.status(500).json({ message: "キャンセル処理中にエラーが発生しました" });
    }
  });

  app.post("/api/stripe/setup-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const customersData = await getCustomersByEmail(req.user.email);
      if (!customersData || customersData.length === 0) {
        return res.status(404).json({ message: "Stripeの顧客情報が見つかりません" });
      }

      const customerId = customersData[0].customer.id;

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
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

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

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

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });

      console.log('[Stripe] Current subscription items:', subscription.items.data.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price.id,
      })));

      const updateResults = await Promise.all(items.map(async (item) => {
        console.log('[Stripe] Processing item:', item);
        try {
          if (item.subscription_item_id) {
            const updated = await stripe.subscriptionItems.update(item.subscription_item_id, {
              quantity: item.quantity,
            });
            console.log('[Stripe] Successfully updated item:', {
              id: updated.id,
              quantity: updated.quantity,
            });
            return updated;
          } else if (item.price) {
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

  app.delete("/api/stripe/subscription-item/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const subscriptionItemId = req.params.id;

    try {
      const item = await stripe.subscriptionItems.retrieve(subscriptionItemId);
      const subscription = await stripe.subscriptions.retrieve(item.subscription as string);
      const customersData = await getCustomersByEmail(req.user.email);

      if (!customersData?.some(data =>
        data.subscriptions.some(sub => sub.id === subscription.id)
      )) {
        return res.status(403).json({ message: "このサブスクリプションアイテムにアクセスする権限がありません" });
      }

      await stripe.subscriptionItems.del(subscriptionItemId);
      console.log('[Stripe] Successfully deleted subscription item:', subscriptionItemId);

      res.json({ message: "サブスクリプションアイテムを削除しました" });
    } catch (error) {
      console.error('[Stripe] Error deleting subscription item:', error);
      res.status(500).json({ message: "サブスクリプションアイテムの削除中にエラーが発生しました" });
    }
  });
}

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

  const customersData = await Promise.all(customers.data.map(async (customer) => {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100,
        expand: ['data.default_payment_method'],
      });

      const invoices = await stripe.invoices.list({
        customer: customer.id,
        limit: 100,
        expand: ['data.charge'],
      });

      const formattedPaymentHistory = invoices.data.map((invoice) => {
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
          receipt_url,
          hosted_invoice_url: invoice.hosted_invoice_url,
        };
      });

      const formattedSubscriptions = await Promise.all(subscriptions.data.map(async subscription => {
        const items = subscription.items.data;

        const itemDetails = await Promise.all(items.map(async item => {
          const price = await stripe.prices.retrieve(item.price.id, {
            expand: ['product'],
          });

          const productDetails = getProductDetails(
            typeof price.product === 'string' 
              ? null 
              : price.product
          );

          return {
            subscription_item_id: item.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval || 'month',
            quantity: item.quantity,
            product: productDetails,
          };
        }));

        let paymentMethod = null;
        if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
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
    } catch (error) {
      console.error(`[Stripe] Error processing customer ${customer.id}:`, error);
      throw error;
    }
  }));

  return customersData;
}