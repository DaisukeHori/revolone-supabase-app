import Stripe from 'stripe';
import { type Express } from "express";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function getCustomerByEmail(email: string) {
  console.log(`[Stripe] Searching for customer with email: ${email}`);
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    console.log(`[Stripe] No customer found for email: ${email}`);
    return null;
  }

  const customer = customers.data[0];
  console.log(`[Stripe] Found customer: ${customer.id}`);

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    expand: ['data.items.data.price.product'],
  });

  // サブスクリプションデータを整形
  const formattedSubscriptions = subscriptions.data.map(subscription => {
    const items = subscription.items.data;
    const plans = items.map(item => ({
      amount: item.price.unit_amount,
      currency: item.price.currency,
      interval: item.price.recurring?.interval || 'month',
      product: {
        name: typeof item.price.product === 'string' 
          ? 'Product' 
          : item.price.product.name,
        description: typeof item.price.product === 'string'
          ? null
          : item.price.product.description,
      }
    }));

    return {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      plan: plans[0], // 主要なプランを返す
    };
  });

  return {
    customer,
    subscriptions: formattedSubscriptions,
  };
}

export function setupStripeRoutes(app: Express) {
  app.get("/api/stripe/customer", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      console.log(`[Stripe] Fetching customer data for user: ${req.user.email}`);
      const customerData = await getCustomerByEmail(req.user.email);

      if (!customerData) {
        return res.status(404).json({ message: "Stripeの顧客情報が見つかりません" });
      }

      console.log(`[Stripe] Response data:`, JSON.stringify(customerData, null, 2));
      res.json(customerData);
    } catch (error) {
      console.error('[Stripe] APIエラー:', error);
      res.status(500).json({ message: "顧客情報の取得中にエラーが発生しました" });
    }
  });
}