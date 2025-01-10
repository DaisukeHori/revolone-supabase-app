import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuantityInputProps {
  initialQuantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  itemId?: string;
}

export function QuantityInput({
  initialQuantity,
  onChange,
  min = 1,
  max = 99,
  itemId
}: QuantityInputProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    if (initialQuantity !== quantity) {
      setQuantity(initialQuantity);
    }
  }, [initialQuantity, quantity]);

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
