import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateQuantityModal({ isOpen, onClose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>数量変更</DialogTitle>
          <DialogDescription>
            準備中
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}