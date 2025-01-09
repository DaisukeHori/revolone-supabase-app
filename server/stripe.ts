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
    expand: ['data.plan.product'],
  });

  console.log(`[Stripe] Subscriptions data:`, JSON.stringify({
    customerId: customer.id,
    subscriptionsCount: subscriptions.data.length,
    subscriptionsData: subscriptions.data.map(sub => ({
      id: sub.id,
      status: sub.status,
      planId: sub.plan?.id,
      productId: sub.plan?.product?.id,
      productName: typeof sub.plan?.product === 'string' ? 'ID_ONLY' : sub.plan?.product?.name
    }))
  }, null, 2));

  return {
    customer,
    subscriptions: subscriptions.data,
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

      const response = {
        customer: customerData.customer,
        subscriptions: customerData.subscriptions,
      };

      console.log(`[Stripe] Response data:`, JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error('[Stripe] APIエラー:', error);
      res.status(500).json({ message: "顧客情報の取得中にエラーが発生しました" });
    }
  });
}