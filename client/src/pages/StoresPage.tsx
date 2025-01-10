import { useQuery } from "@tanstack/react-query";
import { SelectStore } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Store, MapPin, Phone, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function StoresPage() {
  const [, setLocation] = useLocation();
  const { data: stores, isLoading } = useQuery<SelectStore[]>({
    queryKey: ['/api/stores'],
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">店舗一覧</h1>
          <Button
            onClick={() => setLocation("/stores/new")}
            className="bg-primary/90 hover:bg-primary transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規店舗を登録
          </Button>
        </div>

        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" variants={container}>
          {stores?.map((store) => (
            <motion.div key={store.id} variants={item}>
              <Card
                className="bg-background/95 backdrop-blur-sm border-primary/10 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setLocation(`/stores/${store.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{store.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{store.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{store.phoneNumber}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {stores?.length === 0 && (
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>登録されている店舗がありません</p>
                <Button
                  onClick={() => setLocation("/stores/new")}
                  variant="link"
                  className="mt-2"
                >
                  新規店舗を登録する
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AppLayout>
  );
}
