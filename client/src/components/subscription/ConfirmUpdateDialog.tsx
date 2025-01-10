import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  REVONIZER_PRODUCTS,
  isRevonizerProduct,
  calculateRevonizerQuantities,
  filterRevonizerItems,
} from "@/lib/revonizerCalculation";

type SubscriptionItem = {
  subscription_item_id: string;
  amount: number | null;
  currency: string;
  quantity: number;
  product: {
    name: string;
    description: string | null;
  };
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: SubscriptionItem[];
  updatedQuantities: Record<string, number>;
  onConfirm: () => void;
  isUpdating: boolean;
};

export function ConfirmUpdateDialog({
  isOpen,
  onClose,
  items,
  updatedQuantities,
  onConfirm,
  isUpdating,
}: Props) {
  // レボナイザー商品の合計台数を計算
  const revonizerItems = filterRevonizerItems(items);
  const totalRevonizerQuantity = revonizerItems.length > 0
    ? updatedQuantities[revonizerItems[0].subscription_item_id]
    : 0;

  // レボナイザー商品の内訳を計算
  const revonizerBreakdown = calculateRevonizerQuantities(totalRevonizerQuantity);

  // 商品ごとの価格を計算する関数
  const calculatePrice = (item: SubscriptionItem, quantity: number) => {
    if (!item.amount) return "価格未定";
    return `${(item.amount * quantity).toLocaleString()} ${item.currency.toUpperCase()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>変更内容の確認</DialogTitle>
          <DialogDescription>
            以下の内容で変更を適用します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* レボナイザー商品の変更内容 */}
          {revonizerItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">レボナイザー利用ライセンス</h3>
              <div className="space-y-1 text-sm">
                <p>合計: {totalRevonizerQuantity}台</p>
                <div className="pl-4 space-y-1 text-muted-foreground">
                  <p>・基本ライセンス（1台目）: {revonizerBreakdown[REVONIZER_PRODUCTS.FIRST_UNIT.productId]}台</p>
                  {revonizerBreakdown[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId] > 0 && (
                    <p>・2-4台目: {revonizerBreakdown[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId]}台</p>
                  )}
                  {revonizerBreakdown[REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId] > 0 && (
                    <p>・5台目以降: {revonizerBreakdown[REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId]}台</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* その他の商品の変更内容 */}
          {items.map(item => {
            if (!isRevonizerProduct(item.subscription_item_id)) {
              const newQuantity = updatedQuantities[item.subscription_item_id];
              const quantityDiff = newQuantity - item.quantity;
              
              return (
                <div key={item.subscription_item_id} className="space-y-1">
                  <h3 className="font-medium">{item.product.name}</h3>
                  <div className="space-y-1 text-sm pl-4 text-muted-foreground">
                    <p>変更前: {item.quantity}個（{calculatePrice(item, item.quantity)}）</p>
                    <p>変更後: {newQuantity}個（{calculatePrice(item, newQuantity)}）</p>
                    {quantityDiff !== 0 && (
                      <p className={quantityDiff > 0 ? "text-green-600" : "text-red-600"}>
                        {quantityDiff > 0 ? "+" : ""}{quantityDiff}個
                      </p>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            キャンセル
          </Button>
          <Button onClick={onConfirm} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            変更を確定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
