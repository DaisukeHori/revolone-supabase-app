import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Settings, PackageSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// アニメーション設定
const animations = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }
};

type PriceTier = {
  id: number;
  name: string;
  description: string | null;
  minQuantity: number;
  maxQuantity: number | null;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  orderIndex: number;
  stripeProductId: string;
  stripePriceId: string;
  unitAmount: number;
  currency: string;
};

type ProductGroup = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  minTotalQuantity: number;
  maxTotalQuantity: number | null;
  metadata: Record<string, unknown>;
  priceTiers: PriceTier[];
};

export default function AdminProductGroupsPage() {
  const { toast } = useToast();

  // 商品グループのデータを取得
  const { data: productGroups, isLoading, error } = useQuery<ProductGroup[]>({
    queryKey: ['/api/admin/product-groups'],
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-destructive">
          エラーが発生しました: {error instanceof Error ? error.message : '不明なエラー'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        variants={animations.container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">商品グループ管理</h1>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新規グループを作成
          </Button>
        </div>

        <motion.div variants={animations.item} className="grid gap-6">
          {productGroups?.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription>{group.description}</CardDescription>
                    )}
                  </div>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">合計数量制限:</span>{' '}
                      {group.minTotalQuantity}
                      {group.maxTotalQuantity
                        ? ` - ${group.maxTotalQuantity}`
                        : ' 以上'}
                    </div>
                    <div>
                      <span className="font-medium">ステータス:</span>{' '}
                      {group.isActive ? '有効' : '無効'}
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>価格帯名</TableHead>
                        <TableHead>数量範囲</TableHead>
                        <TableHead>注文制限</TableHead>
                        <TableHead className="text-right">単価</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.priceTiers.map((tier) => (
                        <TableRow key={tier.id}>
                          <TableCell className="font-medium">
                            {tier.name}
                          </TableCell>
                          <TableCell>
                            {tier.minQuantity}
                            {tier.maxQuantity
                              ? ` - ${tier.maxQuantity}`
                              : ' 以上'}
                          </TableCell>
                          <TableCell>
                            {tier.minOrderQuantity}
                            {tier.maxOrderQuantity
                              ? ` - ${tier.maxOrderQuantity}`
                              : ' 以上'}
                          </TableCell>
                          <TableCell className="text-right">
                            {tier.unitAmount.toLocaleString()}{' '}
                            {tier.currency.toUpperCase()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
