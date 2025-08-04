import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const addStoreSchema = z.object({
  storeName: z.string().min(1, "店舗名は必須です"),
  agencyCode: z.string().regex(/^[A-Za-z0-9]{6}$/, "代理店コードは6文字の英数字で入力してください"),
  shippingName: z.string().min(1, "配送先氏名は必須です"),
  shippingPostalCode: z.string().regex(/^\d{7}$/, "郵便番号は7桁の数字で入力してください"),
  shippingState: z.string().min(1, "都道府県は必須です"),
  shippingAddress1: z.string().min(1, "住所1行目は必須です"),
  shippingAddress2: z.string().optional(),
  billingName: z.string().min(1, "請求先氏名は必須です"),
  billingPostalCode: z.string().regex(/^\d{7}$/, "郵便番号は7桁の数字で入力してください"),
  billingState: z.string().min(1, "都道府県は必須です"),
  billingAddress1: z.string().min(1, "住所1行目は必須です"),
  billingAddress2: z.string().optional(),
  phoneNumber: z.string().regex(/^0\d{9,10}$/, "日本の電話番号形式で入力してください"),
  useSameAsBilling: z.boolean().optional(),
});

type AddStoreForm = z.infer<typeof addStoreSchema>;

interface AddStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddStoreModal({ open, onOpenChange, onSuccess }: AddStoreModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [useSameAddress, setUseSameAddress] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddStoreForm>({
    resolver: zodResolver(addStoreSchema),
    defaultValues: {
      storeName: "",
      agencyCode: "",
      shippingName: "",
      shippingPostalCode: "",
      shippingState: "",
      shippingAddress1: "",
      shippingAddress2: "",
      billingName: "",
      billingPostalCode: "",
      billingState: "",
      billingAddress1: "",
      billingAddress2: "",
      phoneNumber: "",
      useSameAsBilling: false,
    },
  });

  const watchShipping = form.watch([
    "shippingName",
    "shippingPostalCode", 
    "shippingState",
    "shippingAddress1",
    "shippingAddress2"
  ]);

  // 配送先住所と同じにするチェックボックスの処理
  const handleSameAddressChange = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked) {
      form.setValue("billingName", watchShipping[0]);
      form.setValue("billingPostalCode", watchShipping[1]);
      form.setValue("billingState", watchShipping[2]);
      form.setValue("billingAddress1", watchShipping[3]);
      form.setValue("billingAddress2", watchShipping[4] || "");
    }
  };

  const onSubmit = async (data: AddStoreForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/stores/create-stripe-customer", data);

      if (response.ok) {
        toast({
          title: "店舗登録完了",
          description: "新しい店舗がStripeに登録されました",
        });
        form.reset();
        setUseSameAddress(false);
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "登録エラー",
          description: error.message || "店舗の登録に失敗しました",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "通信エラー",
        description: "サーバーとの通信に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新規店舗登録</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">基本情報</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="storeName">店舗名 *</Label>
                <Input
                  id="storeName"
                  {...form.register("storeName")}
                  placeholder="店舗名を入力"
                />
                {form.formState.errors.storeName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.storeName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="agencyCode">取引先代理店コード *</Label>
                <Input
                  id="agencyCode"
                  {...form.register("agencyCode")}
                  placeholder="6文字の英数字"
                  maxLength={6}
                />
                {form.formState.errors.agencyCode && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.agencyCode.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phoneNumber">電話番号 *</Label>
                <Input
                  id="phoneNumber"
                  {...form.register("phoneNumber")}
                  placeholder="09012345678"
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 配送先住所 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">配送先住所</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="shippingName">氏名 *</Label>
                <Input
                  id="shippingName"
                  {...form.register("shippingName")}
                  placeholder="配送先の氏名"
                />
                {form.formState.errors.shippingName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.shippingName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingPostalCode">郵便番号 *</Label>
                  <Input
                    id="shippingPostalCode"
                    {...form.register("shippingPostalCode")}
                    placeholder="1234567"
                    maxLength={7}
                  />
                  {form.formState.errors.shippingPostalCode && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.shippingPostalCode.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="shippingState">都道府県 *</Label>
                  <Input
                    id="shippingState"
                    {...form.register("shippingState")}
                    placeholder="東京都"
                  />
                  {form.formState.errors.shippingState && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.shippingState.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="shippingAddress1">住所（1行目）*</Label>
                <Input
                  id="shippingAddress1"
                  {...form.register("shippingAddress1")}
                  placeholder="市区町村・番地"
                />
                {form.formState.errors.shippingAddress1 && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.shippingAddress1.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="shippingAddress2">住所（2行目）</Label>
                <Input
                  id="shippingAddress2"
                  {...form.register("shippingAddress2")}
                  placeholder="建物名・部屋番号（任意）"
                />
              </div>
            </div>
          </div>

          {/* 請求先住所 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useSameAddress"
                checked={useSameAddress}
                onCheckedChange={handleSameAddressChange}
              />
              <Label htmlFor="useSameAddress">請求先住所も配送先住所と同じ</Label>
            </div>

            <h3 className="text-lg font-medium">請求先住所</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="billingName">氏名 *</Label>
                <Input
                  id="billingName"
                  {...form.register("billingName")}
                  placeholder="請求先の氏名"
                  disabled={useSameAddress}
                />
                {form.formState.errors.billingName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.billingName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingPostalCode">郵便番号 *</Label>
                  <Input
                    id="billingPostalCode"
                    {...form.register("billingPostalCode")}
                    placeholder="1234567"
                    maxLength={7}
                    disabled={useSameAddress}
                  />
                  {form.formState.errors.billingPostalCode && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.billingPostalCode.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingState">都道府県 *</Label>
                  <Input
                    id="billingState"
                    {...form.register("billingState")}
                    placeholder="東京都"
                    disabled={useSameAddress}
                  />
                  {form.formState.errors.billingState && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.billingState.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="billingAddress1">住所（1行目）*</Label>
                <Input
                  id="billingAddress1"
                  {...form.register("billingAddress1")}
                  placeholder="市区町村・番地"
                  disabled={useSameAddress}
                />
                {form.formState.errors.billingAddress1 && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.billingAddress1.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="billingAddress2">住所（2行目）</Label>
                <Input
                  id="billingAddress2"
                  {...form.register("billingAddress2")}
                  placeholder="建物名・部屋番号（任意）"
                  disabled={useSameAddress}
                />
              </div>
            </div>
          </div>

          {/* フォーム送信ボタン */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : (
                "店舗を登録"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}