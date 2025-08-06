import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReloadPromptProps {
  show: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

export function ReloadPrompt({ show, onReload, onDismiss }: ReloadPromptProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>アプリケーションエラーが発生しました</strong>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            JavaScript エラーが検出されました。ページをリロードすることで問題が解決される可能性があります。
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              ※ リロードにより、未保存のデータは失われる可能性があります
            </p>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onDismiss}
              className="flex-1"
            >
              後で
            </Button>
            <Button
              onClick={onReload}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              リロード
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}