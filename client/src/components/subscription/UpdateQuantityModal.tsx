import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onConfirm: (quantities: Record<string, number>) => void;
  subscriptionId?: string;
}

export function UpdateQuantityModal({ isOpen, onClose, items, onConfirm, subscriptionId }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>準備中</DialogTitle>
        </DialogHeader>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}