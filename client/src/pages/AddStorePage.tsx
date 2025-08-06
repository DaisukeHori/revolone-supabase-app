import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, CreditCard, MapPin, Truck, Calculator, Gift, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { calculateRevonizerQuantities } from "@/lib/revonizerCalculation";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const storeSchema = z.object({
  // 作成モード
  creationMode: z.enum(["with-subscription", "store-only"]),
  
  storeName: z.string().min(1, "店舗名は必須です"),
  dealerCode: z.string()
    .min(1, "取引先代理店コードは必須です")
    .regex(/^\d{6}$/, "半角数字6桁で入力してください"),
  
  // 配送先住所
  shippingName: z.string().min(1, "配送先名前は必須です"),
  shippingPostalCode: z.string().min(1, "郵便番号は必須です"),
  shippingState: z.string().min(1, "都道府県は必須です"),
  shippingLine1: z.string().min(1, "住所は必須です"),
  shippingLine2: z.string().optional(),
  shippingPhone: z.string().min(1, "電話番号は必須です"),
  
  // 請求先住所
  useSameAddress: z.boolean().default(false),
  billingName: z.string().optional(),
  billingPostalCode: z.string().optional(),
  billingState: z.string().optional(),
  billingLine1: z.string().optional(),
  billingLine2: z.string().optional(),
  
  // カード名義人（サブスクリプションありの場合のみ必須）
  cardholderName: z.string().optional(),
  
  // サブスクリプション（サブスクリプションありの場合のみ必須）
  revonizerQuantity: z.number().optional(),
  
  // オプション
  promoCode: z.string().optional(),
}).refine((data) => {
  // サブスクリプションありの場合は必須項目をチェック
  if (data.creationMode === "with-subscription") {
    return data.cardholderName && data.revonizerQuantity && data.revonizerQuantity >= 1 && data.revonizerQuantity <= 20;
  }
  return true;
}, {
  message: "サブスクリプション作成時は、カード名義人名とレボナイザー数量（1-20台）が必要です",
  path: ["cardholderName"]
});

type StoreForm = z.infer<typeof storeSchema>;

const JAPANESE_PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

function AddStoreForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<{ amount: number; type: string } | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isLegalCheckLoading, setIsLegalCheckLoading] = useState(true);
  const stripe = useStripe();
  const elements = useElements();

  const form = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      creationMode: 'with-subscription',
      storeName: '',
      dealerCode: '',
      shippingName: '',
      shippingPostalCode: '',
      shippingState: '',
      shippingLine1: '',
      shippingLine2: '',
      shippingPhone: '',
      useSameAddress: true,
      billingName: '',
      billingPostalCode: '',
      billingState: '',
      billingLine1: '',
      billingLine2: '',
      cardholderName: '',
      revonizerQuantity: 1,
      promoCode: '',
    },
  });

  const watchedValues = form.watch();

  // 郵便番号による住所自動補完
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    if (!postalCode || postalCode.length !== 7) return;
    
    setIsAddressLoading(true);
    try {
      console.log('郵便番号検索開始:', postalCode);
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
      const data = await response.json();
      console.log('API レスポンス:', data);
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log('住所情報:', result);
        
        // フォームの値を更新
        form.setValue('shippingState', result.address1, { shouldValidate: true });
        form.setValue('shippingLine1', result.address2 + result.address3, { shouldValidate: true });
        
        // 同じ住所を使用する場合は請求先も更新
        if (form.getValues('useSameAddress')) {
          form.setValue('billingState', result.address1, { shouldValidate: true });
          form.setValue('billingLine1', result.address2 + result.address3, { shouldValidate: true });
        }
        
        toast({
          title: "住所を自動入力しました",
          description: `${result.address1} ${result.address2}${result.address3}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "郵便番号が見つかりません",
          description: "正しい7桁の郵便番号を入力してください",
        });
      }
    } catch (error) {
      console.error('住所取得エラー:', error);
      toast({
        variant: "destructive",
        title: "住所検索エラー",
        description: "住所の検索に失敗しました。もう一度お試しください。",
      });
    } finally {
      setIsAddressLoading(false);
    }
  };

  // 請求先郵便番号による住所自動補完
  const fetchBillingAddressFromPostalCode = async (postalCode: string) => {
    if (!postalCode || postalCode.length !== 7) return;
    
    setIsAddressLoading(true);
    try {
      console.log('請求先郵便番号検索開始:', postalCode);
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
      const data = await response.json();
      console.log('請求先API レスポンス:', data);
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log('請求先住所情報:', result);
        
        // 請求先フォームの値を更新
        form.setValue('billingState', result.address1, { shouldValidate: true });
        form.setValue('billingLine1', result.address2 + result.address3, { shouldValidate: true });
        
        toast({
          title: "請求先住所を自動入力しました",
          description: `${result.address1} ${result.address2}${result.address3}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "郵便番号が見つかりません",
          description: "正しい7桁の郵便番号を入力してください",
        });
      }
    } catch (error) {
      console.error('請求先住所取得エラー:', error);
      toast({
        variant: "destructive",
        title: "住所検索エラー",
        description: "住所の検索に失敗しました。もう一度お試しください。",
      });
    } finally {
      setIsAddressLoading(false);
    }
  };

  // Check for legal document acceptance on component mount
  useEffect(() => {
    console.log('AddStorePage: Checking legal document acceptance');
    const termsAccepted = localStorage.getItem('termsAccepted');
    const privacyAccepted = localStorage.getItem('privacyAccepted');
    console.log('Terms accepted:', termsAccepted, 'Privacy accepted:', privacyAccepted);
    
    if (termsAccepted !== 'true' || privacyAccepted !== 'true') {
      console.log('Legal documents not accepted. Redirecting to /stores/new');
      // Clear any partial acceptance and redirect
      localStorage.removeItem('termsAccepted');
      localStorage.removeItem('privacyAccepted');
      setLocation('/stores/new');
      return;
    }
    console.log('Legal documents accepted. AddStorePage loaded successfully.');
    setIsLegalCheckLoading(false);
  }, [setLocation]);

  // 郵便番号変更時の住所自動補完
  useEffect(() => {
    if (watchedValues.shippingPostalCode && watchedValues.shippingPostalCode.length === 7) {
      fetchAddressFromPostalCode(watchedValues.shippingPostalCode);
    }
  }, [watchedValues.shippingPostalCode]);

  // 価格計算
  const calculatePricing = async (quantity: number, promoCode?: string) => {
    try {
      const response = await apiRequest('POST', '/api/calculate-pricing', {
        quantity,
        promoCode: promoCode || undefined,
      });
      
      if (response.ok) {
        const data = await response.json();
        setPriceBreakdown(data);
        return data;
      }
    } catch (error) {
      console.error('価格計算エラー:', error);
    }
    return null;
  };

  // プロモーションコードの適用
  const handlePromoCodeApply = async () => {
    const promoCode = form.getValues('promoCode');
    if (!promoCode) return;

    try {
      const response = await apiRequest('POST', '/api/validate-promo-code', {
        promoCode,
      });

      if (response.ok) {
        const data = await response.json();
        setPromoDiscount(data);
        toast({
          title: "プロモーションコードを適用しました",
          description: `${data.type === 'percent' ? data.amount + '%' : '¥' + data.amount}の割引が適用されます`,
        });
        calculatePricing(watchedValues.revonizerQuantity || 1, promoCode);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "無効なプロモーションコード",
          description: error.message || "プロモーションコードが無効です",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "プロモーションコードの検証に失敗しました",
      });
    }
  };

  // 数量変更時の価格再計算
  const handleQuantityChange = (quantity: number) => {
    form.setValue('revonizerQuantity', quantity);
    calculatePricing(quantity, watchedValues.promoCode);
  };

  // 店舗のみ作成処理
  const handleStoreOnlySubmit = async (data: StoreForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stores/create-store-only', {
        storeData: {
          storeName: data.storeName,
          dealerCode: data.dealerCode,
          shippingName: data.shippingName,
          shippingPostalCode: data.shippingPostalCode,
          shippingState: data.shippingState,
          shippingLine1: data.shippingLine1,
          shippingLine2: data.shippingLine2,
          shippingPhone: data.shippingPhone,
          useSameAddress: data.useSameAddress,
          billingName: data.billingName,
          billingPostalCode: data.billingPostalCode,
          billingState: data.billingState,
          billingLine1: data.billingLine1,
          billingLine2: data.billingLine2,
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "店舗を追加しました",
          description: result.message,
        });

        // ホームページに戻る
        setLocation('/');
      } else {
        const error = await response.json();
        throw new Error(error.message || '店舗作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Store only creation error:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "店舗作成中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 確認画面表示
  const handleShowConfirmation = () => {
    setShowConfirmation(true);
  };

  // 最終的な店舗追加処理
  const handleSubmit = async (data: StoreForm) => {
    // 店舗のみ作成モードの場合
    if (data.creationMode === 'store-only') {
      return handleStoreOnlySubmit(data);
    }

    // サブスクリプション作成モードの場合
    if (!stripe || !elements) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "決済システムの準備ができていません",
      });
      return;
    }

    setIsLoading(true);
    try {
      // PaymentElementを使用した決済確認
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // 請求先住所の処理
      const billingAddress = data.useSameAddress ? {
        postal_code: data.shippingPostalCode,
        state: data.shippingState,
        line1: data.shippingLine1,
        line2: data.shippingLine2,
        country: 'JP',
      } : {
        postal_code: data.billingPostalCode!,
        state: data.billingState!,
        line1: data.billingLine1!,
        line2: data.billingLine2,
        country: 'JP',
      };

      // 店舗とサブスクリプションの作成
      const response = await apiRequest('POST', '/api/stores/create-with-subscription', {
        storeData: {
          storeName: data.storeName,
          dealerCode: data.dealerCode,
          email: user?.email,
          shippingName: data.shippingName,
          shippingAddress: {
            postal_code: data.shippingPostalCode,
            state: data.shippingState,
            line1: data.shippingLine1,
            line2: data.shippingLine2,
            country: 'JP',
          },
          billingName: data.useSameAddress ? data.shippingName : data.billingName,
          billingAddress,
          shippingPhone: data.shippingPhone,
          cardholderName: data.cardholderName,
        },
        subscriptionData: {
          revonizerQuantity: data.revonizerQuantity,
          promoCode: data.promoCode,
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        // 複数決済方法対応の支払い確認
        const { error } = await stripe.confirmPayment({
          elements,
          clientSecret: result.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/payment-success`,
            shipping: {
              name: data.shippingName,
              address: {
                postal_code: data.shippingPostalCode,
                state: data.shippingState,
                line1: data.shippingLine1,
                line2: data.shippingLine2,
                country: 'JP',
              },
              phone: data.shippingPhone,
            },
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        toast({
          title: "店舗が正常に追加されました",
          description: "サブスクリプションの契約が完了しました",
        });

        setLocation('/');
      } else {
        const error = await response.json();
        throw new Error(error.message || '店舗の追加に失敗しました');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "店舗の追加に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show loading screen while checking legal document acceptance
  if (isLegalCheckLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">利用規約の確認中...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showConfirmation) {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">店舗追加の確認</h1>
            <p className="text-gray-600">入力内容を確認してください</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>店舗情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">店舗名</Label>
                    <p className="text-lg">{watchedValues.storeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">メールアドレス</Label>
                    <p className="text-lg">{user.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">取引先代理店コード</Label>
                  <p className="text-lg">{watchedValues.dealerCode}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>配送先住所</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {watchedValues.shippingName}<br />
                  〒{watchedValues.shippingPostalCode}<br />
                  {watchedValues.shippingState} {watchedValues.shippingLine1}<br />
                  {watchedValues.shippingLine2 && <>{watchedValues.shippingLine2}<br /></>}
                  TEL: {watchedValues.shippingPhone}
                </p>
              </CardContent>
            </Card>

            {watchedValues.creationMode === 'with-subscription' && (
              <Card>
                <CardHeader>
                  <CardTitle>サブスクリプション</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Revonizer</Label>
                      <p className="text-lg">{watchedValues.revonizerQuantity}台</p>
                    </div>
                  
                  {priceBreakdown && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">月額料金</Label>
                      {priceBreakdown.breakdown.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.name} × {item.quantity}台</span>
                          <span>¥{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {promoDiscount && (
                        <div className="flex justify-between text-green-600">
                          <span>プロモーション割引</span>
                          <span>-¥{priceBreakdown.discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>合計</span>
                          <span>¥{priceBreakdown.total.toLocaleString()}/月</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      35日間の無料期間が適用されます
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
              </Card>
            )}

            {watchedValues.creationMode === 'with-subscription' && (
              <Card>
                <CardHeader>
                  <CardTitle>支払い情報</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">
                    カード名義人: {watchedValues.cardholderName}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={isLoading}
              >
                戻る
              </Button>
              <Button 
                onClick={() => handleSubmit(watchedValues)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '処理中...' : 
                  watchedValues.creationMode === 'store-only' ? '店舗を追加' : 'サブスクリプションを契約して店舗を追加'
                }
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">新規店舗追加</h1>
          <p className="text-gray-600">店舗情報とサブスクリプションを設定します</p>
        </div>

        <form onSubmit={form.handleSubmit(handleShowConfirmation)} className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">店舗名 *</Label>
                  <Input
                    id="storeName"
                    {...form.register('storeName')}
                    placeholder="店舗名を入力"
                  />
                  {form.formState.errors.storeName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.storeName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    value={user.email}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dealerCode">取引先代理店コード *</Label>
                <Input
                  id="dealerCode"
                  {...form.register('dealerCode')}
                  placeholder="123456"
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
                <p className="text-sm text-gray-500 mt-1">半角数字6桁で入力してください</p>
                {form.formState.errors.dealerCode && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.dealerCode.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 作成モード選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                作成タイプ
              </CardTitle>
              <CardDescription>
                店舗の作成方法を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="with-subscription"
                    value="with-subscription"
                    {...form.register('creationMode')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="with-subscription" className="flex-1">
                    <div className="font-medium">今すぐサブスクリプションを開始する</div>
                    <div className="text-sm text-gray-600">店舗作成と同時にRevonizerのサブスクリプションを契約します（35日間無料）</div>
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="store-only"
                    value="store-only"
                    {...form.register('creationMode')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="store-only" className="flex-1">
                    <div className="font-medium">店舗情報だけを登録する</div>
                    <div className="text-sm text-gray-600">後でサブスクリプションを設定する場合はこちらを選択してください</div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 配送先住所 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                配送先住所
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shippingName">氏名 *</Label>
                <Input
                  id="shippingName"
                  {...form.register('shippingName')}
                  placeholder="配送先の氏名を入力"
                />
                {form.formState.errors.shippingName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.shippingName.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingPostalCode">郵便番号 *</Label>
                  <div className="relative">
                    <Input
                      id="shippingPostalCode"
                      {...form.register('shippingPostalCode')}
                      placeholder="1234567"
                      maxLength={7}
                      pattern="[0-9]{7}"
                      onChange={(e) => {
                        console.log('郵便番号入力:', e.target.value);
                        // React Hook Formの値を更新
                        form.setValue('shippingPostalCode', e.target.value);
                        // 7桁入力時に住所検索を実行
                        if (e.target.value.length === 7 && /^\d{7}$/.test(e.target.value)) {
                          console.log('7桁郵便番号検出、検索開始:', e.target.value);
                          fetchAddressFromPostalCode(e.target.value);
                        }
                      }}
                    />
                    {isAddressLoading && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">ハイフンなし7桁で入力してください（住所が自動入力されます）</p>
                  {form.formState.errors.shippingPostalCode && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.shippingPostalCode.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="shippingState">都道府県 *</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('shippingState', value)}
                    value={watchedValues.shippingState}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="都道府県を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {JAPANESE_PREFECTURES.map((prefecture) => (
                        <SelectItem key={prefecture} value={prefecture}>
                          {prefecture}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.shippingState && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.shippingState.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="shippingLine1">住所 (1行目) *</Label>
                <Input
                  id="shippingLine1"
                  {...form.register('shippingLine1')}
                  placeholder="市区町村・番地を入力"
                />
                {form.formState.errors.shippingLine1 && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.shippingLine1.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="shippingLine2">住所 (2行目)</Label>
                <Input
                  id="shippingLine2"
                  {...form.register('shippingLine2')}
                  placeholder="建物名・部屋番号（オプション）"
                />
              </div>

              <div>
                <Label htmlFor="shippingPhone">電話番号 *</Label>
                <Input
                  id="shippingPhone"
                  {...form.register('shippingPhone')}
                  placeholder="03-1234-5678"
                />
                {form.formState.errors.shippingPhone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.shippingPhone.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 請求先住所 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                請求先住所
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useSameAddress"
                  checked={watchedValues.useSameAddress}
                  onCheckedChange={(checked) => {
                    form.setValue('useSameAddress', checked as boolean);
                    if (checked) {
                      // 配送先の情報を請求先にコピー
                      form.setValue('billingName', watchedValues.shippingName);
                      form.setValue('billingPostalCode', watchedValues.shippingPostalCode);
                      form.setValue('billingState', watchedValues.shippingState);
                      form.setValue('billingLine1', watchedValues.shippingLine1);
                      form.setValue('billingLine2', watchedValues.shippingLine2);
                    }
                  }}
                />
                <Label htmlFor="useSameAddress">配送先と同じ住所を使用</Label>
              </div>

              {!watchedValues.useSameAddress && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="billingName">氏名 *</Label>
                    <Input
                      id="billingName"
                      {...form.register('billingName')}
                      placeholder="請求先の氏名を入力"
                    />
                    {form.formState.errors.billingName && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.billingName.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingPostalCode">郵便番号 *</Label>
                      <div className="relative">
                        <Input
                          id="billingPostalCode"
                          {...form.register('billingPostalCode')}
                          placeholder="1234567"
                          maxLength={7}
                          pattern="[0-9]{7}"
                          onChange={(e) => {
                            // React Hook Formの値を更新
                            form.setValue('billingPostalCode', e.target.value);
                            // 7桁入力時に住所検索を実行
                            if (e.target.value.length === 7 && /^\d{7}$/.test(e.target.value)) {
                              fetchBillingAddressFromPostalCode(e.target.value);
                            }
                          }}
                        />
                        {isAddressLoading && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">ハイフンなし7桁で入力してください（住所が自動入力されます）</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="billingState">都道府県 *</Label>
                      <Select onValueChange={(value) => form.setValue('billingState', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="都道府県を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {JAPANESE_PREFECTURES.map((prefecture) => (
                            <SelectItem key={prefecture} value={prefecture}>
                              {prefecture}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="billingLine1">住所 (1行目) *</Label>
                    <Input
                      id="billingLine1"
                      {...form.register('billingLine1')}
                      placeholder="市区町村・番地を入力"
                    />
                  </div>

                  <div>
                    <Label htmlFor="billingLine2">住所 (2行目)</Label>
                    <Input
                      id="billingLine2"
                      {...form.register('billingLine2')}
                      placeholder="建物名・部屋番号（オプション）"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* サブスクリプション（サブスクリプション作成モード時のみ表示） */}
          {watchedValues.creationMode === 'with-subscription' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  サブスクリプション
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="revonizerQuantity">Revonizer台数 *</Label>
                <Select 
                  onValueChange={(value) => handleQuantityChange(parseInt(value))}
                  defaultValue="1"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="台数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}台
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.revonizerQuantity && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.revonizerQuantity.message}
                  </p>
                )}
              </div>

              {/* 価格表示 */}
              {priceBreakdown && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">月額料金</h4>
                  <div className="space-y-2">
                    {priceBreakdown.breakdown.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} × {item.quantity}台</span>
                        <span>¥{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {promoDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>プロモーション割引</span>
                        <span>-¥{priceBreakdown.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>合計</span>
                        <span>¥{priceBreakdown.total.toLocaleString()}/月</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 無料期間表示 */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  35日間の無料期間が適用されます
                </AlertDescription>
              </Alert>

              {/* プロモーションコード */}
              <div className="space-y-2">
                <Label htmlFor="promoCode">プロモーションコード</Label>
                <div className="flex gap-2">
                  <Input
                    id="promoCode"
                    {...form.register('promoCode')}
                    placeholder="プロモーションコードを入力"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePromoCodeApply}
                    disabled={!watchedValues.promoCode}
                  >
                    適用
                  </Button>
                </div>
              </div>
            </CardContent>
            </Card>
          )}

          {/* 支払い方法（サブスクリプション作成モード時のみ表示） */}
          {watchedValues.creationMode === 'with-subscription' && (
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                支払い方法
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cardholderName">カード名義人（ローマ字）*</Label>
                <Input
                  id="cardholderName"
                  {...form.register('cardholderName')}
                  placeholder="YAMADA TARO"
                />
                {form.formState.errors.cardholderName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.cardholderName.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label>支払い情報</Label>
                <div className="p-4 border rounded-lg">
                  <PaymentElement
                    options={{
                      layout: 'tabs',
                      paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'paypal', 'bank_transfer'],
                      business: {
                        name: 'Revonizer',
                      },
                    }}
                  />
                </div>
              </div>
            </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLocation('/')}
            >
              キャンセル
            </Button>
            <Button type="submit" className="flex-1">
              確認画面へ
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function AddStorePage() {
  const [stripePromise, setStripePromise] = useState<any>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    async function initializeStripe() {
      try {
        const response = await apiRequest('POST', '/api/stripe/setup-intent');
        
        if (response.ok) {
          const data = await response.json();
          setStripePromise(loadStripe(data.publishableKey));
          setClientSecret(data.clientSecret);
        }
      } catch (error) {
        console.error('Stripe初期化エラー:', error);
      }
    }

    initializeStripe();
  }, []);

  if (!stripePromise || !clientSecret) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">決済システムを初期化中...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{
        clientSecret: clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0070f3',
          }
        }
      }}
    >
      <AddStoreForm />
    </Elements>
  );
}