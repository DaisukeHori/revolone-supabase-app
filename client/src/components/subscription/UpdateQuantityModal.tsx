import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: {
    subscription_item_id: string;
    amount: number | null;
    currency: string;
    interval: string;
    quantity: number;
    product: {
      name: string;
      description: string | null;
    };
  }[];
  onConfirm: (quantities: Record<string, number>) => void;
  subscriptionId?: string;
}

function QuantityInput({
  initialQuantity,
  onChange,
  min = 1,
  max = 99,
}: {
  initialQuantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    if (initialQuantity !== quantity) {
      setQuantity(initialQuantity);
    }
  }, [initialQuantity]);

  const handleChange = (value: number) => {
    const newQuantity = Math.max(min, Math.min(max, value));
    setQuantity(newQuantity);
    onChange(newQuantity);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleChange(quantity - 1)}
        disabled={quantity <= min}
        className="h-8 w-8"
      >
        -
      </Button>
      <Input
        type="number"
        value={quantity}
        onChange={(e) => handleChange(parseInt(e.target.value) || min)}
        className="h-8 w-16 text-center"
        min={min}
        max={max}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleChange(quantity + 1)}
        disabled={quantity >= max}
        className="h-8 w-8"
      >
        +
      </Button>
    </div>
  );
}

export function UpdateQuantityModal({ isOpen, onClose, items, onConfirm }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    items.forEach((item) => {
      initialQuantities[item.subscription_item_id] = item.quantity;
    });
    setQuantities(initialQuantities);
  }, [items, isOpen]);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleConfirm = () => {
    onConfirm(quantities);
    onClose();
  };

  const hasChanges = Object.entries(quantities).some(
    ([id, quantity]) => {
      const item = items.find(i => i.subscription_item_id === id);
      return item && item.quantity !== quantity;
    }
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>プランの数量を変更</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div key={item.subscription_item_id} className="p-4 bg-primary/5 rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">{item.product.name}</h4>
                  {item.product.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.product.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {item.amount?.toLocaleString()} {item.currency.toUpperCase()} / {item.interval}
                  </span>
                </div>
                <QuantityInput
                  initialQuantity={quantities[item.subscription_item_id] || item.quantity}
                  onChange={(quantity) => handleQuantityChange(item.subscription_item_id, quantity)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={!hasChanges}>
            更新する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}