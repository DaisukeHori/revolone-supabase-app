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
  calculateRevonizerQuantities,
  getRevonizerProductType,
} from "@/lib/revonizerCalculation";

type SubscriptionItem = {
  subscription_item_id: string;
  amount: number | null;
  currency: string;
  interval: string;
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
  onConfirm: (quantities: Record<string, number>) => Promise<void>;
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
  // 合計台数を計算（基本ライセンスは常に1台）
  const totalRevonizerQuantity = Math.max(1, Math.max(...Object.values(updatedQuantities)));

  // レボナイザー商品の内訳を計算
  const revonizerBreakdown = calculateRevonizerQuantities(totalRevonizerQuantity);

  // 商品ごとの価格を計算する関数
  const calculatePrice = (item: SubscriptionItem, quantity: number) => {
    if (!item.amount) return "価格未定";
    return `${(item.amount * quantity).toLocaleString()} ${item.currency.toUpperCase()}`;
  };

  // 削除される商品（数量が0になる商品）を特定
  // ただし、基本ライセンスは削除対象から除外
  const removedItems = items.filter(async item => {
    const newQuantity = updatedQuantities[item.subscription_item_id] || 0;
    const productType = await getRevonizerProductType(item.subscription_item_id);
    // 基本ライセンスは削除対象から除外
    if (productType === 'FIRST_UNIT') return false;
    return item.quantity > 0 && newQuantity === 0;
  });

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
          <div className="space-y-2">
            <h3 className="font-medium">レボナイザー利用ライセンス</h3>
            <div className="space-y-1 text-sm">
              <p>合計: {totalRevonizerQuantity}台</p>
              <div className="pl-4 space-y-1 text-muted-foreground">
                <p>・基本ライセンス（1台目）: 1台</p>
                {revonizerBreakdown[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] > 0 && (
                  <p>・2-4台目: {revonizerBreakdown[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]}台</p>
                )}
                {revonizerBreakdown[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] > 0 && (
                  <p>・5台目以降: {revonizerBreakdown[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]}台</p>
                )}
              </div>
            </div>
          </div>

          {/* その他の商品の変更内容 */}
          {items.map(item => {
            const newQuantity = updatedQuantities[item.subscription_item_id] || 0;
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
          })}

          {/* 警告メッセージ（基本ライセンス以外の削除対象商品がある場合のみ表示） */}
          {removedItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-yellow-800 font-medium">注意</p>
              <p className="text-sm text-yellow-700 mt-1">
                以下の商品の数量が0になるため、サブスクリプションから削除されます：
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                {removedItems.map(item => (
                  <li key={item.subscription_item_id}>{item.product.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            キャンセル
          </Button>
          <Button onClick={() => onConfirm(updatedQuantities)} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            変更を確定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}