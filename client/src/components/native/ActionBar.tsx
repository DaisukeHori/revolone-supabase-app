import React from 'react';
import { share, scanQr } from '../../native';
import { Button } from '@/components/ui/button';
import { Share2, QrCode } from 'lucide-react';

type Props = {
  shareText?: string;
  shareUrl?: string;
  onScanned?: (content: string) => void;
};

export default function ActionBar({ shareText, shareUrl, onScanned }: Props) {
  return (
    <div className="fixed right-4 bottom-4 flex gap-3 z-50">
      <Button
        onClick={() => share({ text: shareText, url: shareUrl, title: '共有', dialogTitle: '共有' })}
        className="shadow-lg"
        size="lg"
      >
        <Share2 className="mr-2 h-5 w-5" />
        共有
      </Button>
      <Button
        onClick={() => scanQr((c) => onScanned ? onScanned(c) : (location.href = `/devices/${encodeURIComponent(c)}`))}
        className="shadow-lg"
        size="lg"
      >
        <QrCode className="mr-2 h-5 w-5" />
        QR読み取り
      </Button>
    </div>
  );
}