import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";
import { setupMFARoutes } from "./mfa";
import { setupDeviceRoutes } from "./devices";
import { setupEmailChangeRoutes } from "./emailChange";
import { db } from "@db";
import { users, stores } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);

  // Stripe関連のルートを設定（デバッグログを有効化）
  setupStripeRoutes(app, { debug: true });

  // 店舗管理関連のルートを設定
  setupStoreRoutes(app);

  // MFA関連のルートを設定
  setupMFARoutes(app);

  // デバイス管理関連のルートを設定
  setupDeviceRoutes(app);

  // メールアドレス変更関連のルートを設定
  setupEmailChangeRoutes(app);

  // Kintoneトークンテスト用エンドポイント
  app.get('/api/test-kintone', async (req, res) => {
    try {
      const { getRepairHistoryBySerialNumber } = await import('./services/kintone');
      console.log('Kintoneテストエンドポイント呼び出し');
      
      // テスト用デバイス番号で修理履歴を取得
      const testDeviceId = "RN-J00001";
      const repairHistory = await getRepairHistoryBySerialNumber(testDeviceId);
      
      res.json({
        success: true,
        testDeviceId,
        repairHistoryCount: repairHistory.length,
        repairHistory: repairHistory.slice(0, 3), // 最初の3件のみ表示
        message: 'Kintone APIトークンは正常に動作しています',
        tokenLength: process.env.KINTONE_API_TOKEN?.length || 0
      });
    } catch (error: any) {
      console.error('Kintoneテストエラー:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Kintone APIトークンの設定に問題があります',
        tokenLength: process.env.KINTONE_API_TOKEN?.length || 0
      });
    }
  });

  // Stripe顧客作成のAPIエンドポイント
  app.post('/api/stores/create-stripe-customer', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const {
        storeName,
        agencyCode,
        shippingName,
        shippingPostalCode,
        shippingState,
        shippingAddress1,
        shippingAddress2,
        billingName,
        billingPostalCode,
        billingState,
        billingAddress1,
        billingAddress2,
        phoneNumber
      } = req.body;

      // 入力値の検証
      if (!storeName || !agencyCode || !shippingName || !phoneNumber) {
        return res.status(400).json({ message: '必須項目が入力されていません' });
      }

      if (!/^[A-Za-z0-9]{6}$/.test(agencyCode)) {
        return res.status(400).json({ message: '代理店コードは6文字の英数字で入力してください' });
      }

      if (!/^\d{7}$/.test(shippingPostalCode) || !/^\d{7}$/.test(billingPostalCode)) {
        return res.status(400).json({ message: '郵便番号は7桁の数字で入力してください' });
      }

      if (!/^0\d{9,10}$/.test(phoneNumber)) {
        return res.status(400).json({ message: '日本の電話番号形式で入力してください' });
      }

      // Stripe顧客を作成
      const customer = await stripe.customers.create({
        name: billingName,
        email: req.user!.email,
        phone: phoneNumber.startsWith('0') ? '+81' + phoneNumber.slice(1) : phoneNumber,
        address: {
          city: billingAddress1,
          country: 'JP',
          line1: billingAddress1,
          line2: billingAddress2 || '',
          postal_code: billingPostalCode,
          state: billingState,
        },
        shipping: {
          name: shippingName,
          address: {
            city: shippingAddress1,
            country: 'JP',
            line1: shippingAddress1,
            line2: shippingAddress2 || null,
            postal_code: shippingPostalCode,
            state: shippingState,
          },
        },
        metadata: {
          サロン名: storeName,
          代理店名: agencyCode,
        },
      });

      res.json({
        message: '店舗が正常に登録されました',
        customerId: customer.id,
      });
    } catch (error) {
      console.error('Stripe顧客作成エラー:', error);
      res.status(500).json({ message: 'Stripe顧客の作成に失敗しました' });
    }
  });

  // Stripe顧客削除のAPIエンドポイント
  app.delete('/api/stores/delete-stripe-customer/:customerId', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const { customerId } = req.params;

      // 削除前にサブスクリプションの確認
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
      });

      // アクティブなサブスクリプションがあるかチェック
      const activeSubscriptions = subscriptions.data.filter(
        sub => sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
      );

      if (activeSubscriptions.length > 0) {
        return res.status(400).json({
          message: 'アクティブなサブスクリプションがあるため削除できません',
          activeSubscriptions: activeSubscriptions.length,
        });
      }

      // 未払いの請求書があるかチェック
      const invoices = await stripe.invoices.list({
        customer: customerId,
        status: 'open',
        limit: 100,
      });

      if (invoices.data.length > 0) {
        return res.status(400).json({
          message: '未払いの請求書があるため削除できません',
          unpaidInvoices: invoices.data.length,
        });
      }

      // 顧客を削除
      await stripe.customers.del(customerId);

      res.json({
        message: '顧客が正常に削除されました',
        customerId,
      });
    } catch (error) {
      console.error('Stripe顧客削除エラー:', error);
      res.status(500).json({ message: 'Stripe顧客の削除に失敗しました' });
    }
  });

  // プロフィール編集のAPIエンドポイント
  app.put('/api/profile', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const { username, phoneNumber } = req.body;
      
      // 更新するフィールドを構築
      const updateData: any = {};
      
      if (username !== undefined) {
        if (!username || typeof username !== 'string') {
          return res.status(400).json({ message: '名前は必須です' });
        }
        if (username.trim().length === 0) {
          return res.status(400).json({ message: '名前を入力してください' });
        }
        updateData.username = username.trim();
      }
      
      if (phoneNumber !== undefined) {
        if (phoneNumber && typeof phoneNumber === 'string') {
          // 日本の電話番号形式の検証
          if (!/^0\d{9,10}$/.test(phoneNumber)) {
            return res.status(400).json({ message: '日本の電話番号形式で入力してください（例：09012345678）' });
          }
          updateData.phoneNumber = phoneNumber;
        } else {
          updateData.phoneNumber = null; // 空文字列は null に変換
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: '更新する項目がありません' });
      }

      // データベースを更新
      await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, req.user!.id));

      // 成功メッセージを構築
      const updatedFields = Object.keys(updateData);
      let message = '';
      if (updatedFields.includes('username')) message += '名前';
      if (updatedFields.includes('phoneNumber')) {
        if (message) message += 'と';
        message += '電話番号';
      }
      message += 'が更新されました';

      res.json({ message });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'プロフィールの更新に失敗しました' });
    }
  });

  // 価格計算APIエンドポイント
  app.post('/api/calculate-pricing', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const { quantity, promoCode } = req.body;
      
      if (!quantity || quantity < 1 || quantity > 20) {
        return res.status(400).json({ message: '数量は1-20の範囲で指定してください' });
      }

      // 段階的価格計算
      const priceBreakdown = [];
      let totalAmount = 0;

      // 1台目
      if (quantity >= 1) {
        const firstPrice = await stripe.prices.retrieve('price_1NwwacAPdno01lSPWH92pzrl');
        const amount = firstPrice.unit_amount!;
        priceBreakdown.push({
          name: 'Revol Oneサブスクリプション',
          quantity: 1,
          amount: amount,
          priceId: 'price_1NwwacAPdno01lSPWH92pzrl'
        });
        totalAmount += amount;
      }

      // 2-4台目
      if (quantity >= 2) {
        const secondToFourthCount = Math.min(quantity - 1, 3);
        const secondPrice = await stripe.prices.retrieve('price_1OCCkvAPdno01lSP44FyPiZ3');
        const amount = secondPrice.unit_amount! * secondToFourthCount;
        priceBreakdown.push({
          name: 'レボナイザー追加利用ライセンス（2-4台目）',
          quantity: secondToFourthCount,
          amount: amount,
          priceId: 'price_1OCCkvAPdno01lSP44FyPiZ3'
        });
        totalAmount += amount;
      }

      // 5台目以降
      if (quantity >= 5) {
        const fifthAndMoreCount = quantity - 4;
        const fifthPrice = await stripe.prices.retrieve('price_1OED1uAPdno01lSP3UESyV7C');
        const amount = fifthPrice.unit_amount! * fifthAndMoreCount;
        priceBreakdown.push({
          name: 'レボナイザー追加利用ライセンス（5台目以降）',
          quantity: fifthAndMoreCount,
          amount: amount,
          priceId: 'price_1OED1uAPdno01lSP3UESyV7C'
        });
        totalAmount += amount;
      }

      let discount = 0;
      if (promoCode) {
        try {
          const coupon = await stripe.coupons.retrieve(promoCode);
          if (coupon.valid) {
            if (coupon.percent_off) {
              discount = Math.floor(totalAmount * (coupon.percent_off / 100));
            } else if (coupon.amount_off) {
              discount = coupon.amount_off;
            }
          }
        } catch (error) {
          // プロモーションコードが無効な場合は無視
        }
      }

      res.json({
        breakdown: priceBreakdown,
        subtotal: totalAmount,
        discount: discount,
        total: totalAmount - discount
      });
    } catch (error) {
      console.error('Price calculation error:', error);
      res.status(500).json({ message: '価格計算に失敗しました' });
    }
  });

  // プロモーションコード検証APIエンドポイント
  app.post('/api/validate-promo-code', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const { promoCode } = req.body;
      
      if (!promoCode) {
        return res.status(400).json({ message: 'プロモーションコードが必要です' });
      }

      const coupon = await stripe.coupons.retrieve(promoCode);
      
      if (!coupon.valid) {
        return res.status(400).json({ message: 'このプロモーションコードは無効です' });
      }

      // 有効期限チェック
      if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
        return res.status(400).json({ message: 'このプロモーションコードは期限切れです' });
      }

      // 使用回数チェック
      if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
        return res.status(400).json({ message: 'このプロモーションコードは使用回数の上限に達しています' });
      }

      res.json({
        valid: true,
        amount: coupon.percent_off || coupon.amount_off!,
        type: coupon.percent_off ? 'percent' : 'amount',
        name: coupon.name || 'プロモーション割引'
      });
    } catch (error: any) {
      console.error('Promo code validation error:', error);
      if (error.type === 'StripeInvalidRequestError') {
        res.status(400).json({ message: '無効なプロモーションコードです' });
      } else {
        res.status(500).json({ message: 'プロモーションコードの検証に失敗しました' });
      }
    }
  });

  // 複数決済方法対応のSetupIntent作成エンドポイント
  app.post('/api/stripe/setup-intent', async (req, res) => {
    try {
      const setupIntent = await stripe.setupIntents.create({
        usage: 'off_session',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always'
        }
      });

      res.json({
        clientSecret: setupIntent.client_secret,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY
      });
    } catch (error) {
      console.error('SetupIntent作成エラー:', error);
      res.status(500).json({ message: 'SetupIntent作成中にエラーが発生しました' });
    }
  });

  // 店舗とサブスクリプションの作成APIエンドポイント
  app.post('/api/stores/create-with-subscription', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const { storeData, subscriptionData } = req.body;
      
      // 入力値検証
      if (!storeData.storeName || !storeData.dealerCode || !storeData.shippingAddress) {
        return res.status(400).json({ message: '必須項目が不足しています' });
      }

      if (!subscriptionData.revonizerQuantity || subscriptionData.revonizerQuantity < 1) {
        return res.status(400).json({ message: '数量は1以上である必要があります' });
      }

      // Stripeカスタマー作成
      const customer = await stripe.customers.create({
        email: storeData.email,
        name: storeData.storeName,
        address: storeData.billingAddress,
        shipping: {
          name: storeData.storeName,
          phone: storeData.shippingPhone,
          address: storeData.shippingAddress
        },
        metadata: {
          'サロン名': storeData.storeName,
          '取引先代理店コード': storeData.dealerCode
        }
      });

      // サブスクリプションアイテムの作成
      const subscriptionItems = [];
      const quantity = subscriptionData.revonizerQuantity;

      // 1台目
      if (quantity >= 1) {
        subscriptionItems.push({
          price: 'price_1NwwacAPdno01lSPWH92pzrl',
          quantity: 1
        });
      }

      // 2-4台目
      if (quantity >= 2) {
        const secondToFourthCount = Math.min(quantity - 1, 3);
        subscriptionItems.push({
          price: 'price_1OCCkvAPdno01lSP44FyPiZ3',
          quantity: secondToFourthCount
        });
      }

      // 5台目以降
      if (quantity >= 5) {
        const fifthAndMoreCount = quantity - 4;
        subscriptionItems.push({
          price: 'price_1OED1uAPdno01lSP3UESyV7C',
          quantity: fifthAndMoreCount
        });
      }

      // サブスクリプション作成オプション
      const subscriptionOptions: any = {
        customer: customer.id,
        items: subscriptionItems,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        }
      };

      // 無料期間の設定（35日固定）
      subscriptionOptions.trial_period_days = 35;

      // プロモーションコードの適用
      if (subscriptionData.promoCode) {
        subscriptionOptions.coupon = subscriptionData.promoCode;
      }

      const subscription = await stripe.subscriptions.create(subscriptionOptions);

      // ローカルデータベースに店舗情報を保存
      await db.insert(stores).values({
        name: storeData.storeName,
        address: `${storeData.shippingAddress.line1} ${storeData.shippingAddress.line2 || ''}`,
        phone: storeData.shippingPhone,
        email: storeData.email,
        stripeCustomerId: customer.id,
        userId: req.user!.id,
        metadata: {
          dealerCode: storeData.dealerCode,
          shippingAddress: storeData.shippingAddress,
          billingAddress: storeData.billingAddress
        }
      });

      res.json({
        success: true,
        customerId: customer.id,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      });
    } catch (error: any) {
      console.error('Store creation error:', error);
      
      // エラーが発生した場合、作成済みのStripeリソースを削除
      // (実際のプロダクションでは、より詳細なロールバック処理を実装)
      
      res.status(500).json({ 
        message: error.message || '店舗の作成に失敗しました' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}