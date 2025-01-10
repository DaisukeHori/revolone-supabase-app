import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const storeFormSchema = z.object({
  name: z.string(),
  postalCode: z.string(),
  state: z.string(),
  city: z.string(),
  line1: z.string(),
  line2: z.string(),
  phoneNumber: z.string(),
  shippingPostalCode: z.string(),
  shippingState: z.string(),
  shippingCity: z.string(),
  shippingLine1: z.string(),
  shippingLine2: z.string(),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

type CustomerType = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
  shipping: {
    address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    };
    name: string | null;
    phone: string | null;
  } | null;
  metadata: {
    サロン名?: string;
    [key: string]: string | undefined;
  };
};

interface StoreEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerType;
  onSubmit: (values: StoreFormValues) => Promise<void>;
}

export function StoreEditModal({
  isOpen,
  onClose,
  customer,
  onSubmit,
}: StoreEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: customer?.metadata?.サロン名 || '',
      postalCode: customer?.address?.postal_code || '',
      state: customer?.address?.state || '',
      city: customer?.address?.city || '',
      line1: customer?.address?.line1 || '',
      line2: customer?.address?.line2 || '',
      phoneNumber: customer?.phone || '',
      shippingPostalCode: customer?.shipping?.address?.postal_code || '',
      shippingState: customer?.shipping?.address?.state || '',
      shippingCity: customer?.shipping?.address?.city || '',
      shippingLine1: customer?.shipping?.address?.line1 || '',
      shippingLine2: customer?.shipping?.address?.line2 || '',
    },
  });

  const handleSubmit = async (values: StoreFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error('店舗情報更新エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>店舗情報の編集</DialogTitle>
          <DialogDescription>
            店舗情報、請求先住所、配送先住所を編集できます。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="overflow-y-auto pr-6 -mr-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>店舗名</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="店舗名を入力" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 請求先住所フォーム */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">請求先住所</h3>
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>郵便番号</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="郵便番号を入力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>都道府県</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="都道府県を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>市区町村</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="市区町村を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住所1（番地など）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="住所1を入力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住所2（建物名など）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="住所2を入力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 配送先住所フォーム */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">配送先住所</h3>
                <FormField
                  control={form.control}
                  name="shippingPostalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>郵便番号</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="郵便番号を入力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="shippingState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>都道府県</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="都道府県を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>市区町村</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="市区町村を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="shippingLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住所1（番地など）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="住所1を入力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shippingLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住所2（建物名など）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="住所2を入力" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>電話番号</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="電話番号を入力" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 mt-6 pb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  保存
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}