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

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 100,
    });

    console.log(`[Stripe] Raw subscriptions data:`, JSON.stringify(subscriptions.data, null, 2));

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
          product: {
            name: typeof price.product === 'string' 
              ? 'Product' 
              : price.product.name,
            description: typeof price.product === 'string'
              ? null
              : price.product.description,
          }
        };
      }));

      return {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        plan: itemDetails[0], // 主要なプランを返す
      };
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
}