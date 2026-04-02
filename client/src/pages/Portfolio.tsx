import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useWalletContext } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Coins, TrendingUp, ExternalLink, Wallet, ShoppingCart, BarChart3, RefreshCw } from "lucide-react";

const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";

function formatAmount(amount: string | null | undefined, decimals = 4) {
  if (!amount) return "0";
  const n = parseFloat(amount);
  if (isNaN(n)) return "0";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: decimals });
}

function shortHash(hash: string) {
  return hash.slice(0, 8) + "..." + hash.slice(-6);
}

const TX_TYPE_LABELS: Record<string, string> = {
  purchase_private: "私募购买 PVC",
  purchase_public: "公募购买 PVC",
  approve: "USDT 授权",
  stake: "质押 C2-Coin",
  unstake: "解除质押",
  claim_reward: "领取质押奖励",
  claim_dividend: "领取分红",
  whitelist: "KYC 白名单",
};

export default function Portfolio() {
  const { account: address, isConnected } = useWalletContext();
  const [, navigate] = useLocation();
  const walletAddress = useMemo(() => address || "", [address]);

  const { data: purchaseHistory, isLoading: purchaseLoading, refetch: refetchPurchase } =
    trpc.purchase.getPurchaseHistory.useQuery({ walletAddress }, { enabled: !!walletAddress });

  const { data: revenueInfo, isLoading: revenueLoading } =
    trpc.revenue.getRevenueInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 60_000 });

  const { data: stakingInfo, isLoading: stakingLoading } =
    trpc.staking.getStakingInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 60_000 });

  const totalPurchased = useMemo(() => {
    if (!purchaseHistory) return { usdt: 0, pvc: 0 };
    return purchaseHistory
      .filter((tx) => tx.txType === "purchase_private" || tx.txType === "purchase_public")
      .reduce((acc, tx) => {
        const amt = parseFloat(tx.amount || "0");
        if (tx.tokenSymbol === "USDT") acc.usdt += amt;
        if (tx.tokenSymbol === "PVC") acc.pvc += amt;
        return acc;
      }, { usdt: 0, pvc: 0 });
  }, [purchaseHistory]);

  if (!isConnected || !walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-emerald-200">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">连接钱包查看资产</h2>
            <p className="text-gray-500 text-sm">请先连接您的钱包，查看持仓、购买历史和收益数据。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container max-w-5xl py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的资产</h1>
          <p className="text-gray-500 mt-1 font-mono text-sm truncate">{walletAddress}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-xs"><Coins className="w-3.5 h-3.5" /> PV-Coin 持仓</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? <Skeleton className="h-8 w-24" /> : (
                <><p className="text-2xl font-bold text-gray-900">{formatAmount(revenueInfo?.pvBalance, 2)}</p><p className="text-xs text-gray-400">PVC</p></>
              )}
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-xs"><Coins className="w-3.5 h-3.5" /> C2-Coin 持仓</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? <Skeleton className="h-8 w-24" /> : (
                <><p className="text-2xl font-bold text-gray-900">{formatAmount(revenueInfo?.c2Balance, 2)}</p><p className="text-xs text-gray-400">C2C</p></>
              )}
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-xs"><TrendingUp className="w-3.5 h-3.5" /> 待领取分红</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? <Skeleton className="h-8 w-24" /> : (
                <><p className="text-2xl font-bold text-emerald-700">{formatAmount(revenueInfo?.claimableUsdt, 2)}</p><p className="text-xs text-gray-400">USDT</p></>
              )}
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-xs"><BarChart3 className="w-3.5 h-3.5" /> 已质押 C2C</CardDescription>
            </CardHeader>
            <CardContent>
              {stakingLoading ? <Skeleton className="h-8 w-24" /> : (
                <><p className="text-2xl font-bold text-gray-900">{formatAmount(stakingInfo?.stakedAmount, 2)}</p><p className="text-xs text-gray-400">C2C</p></>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/revenue")} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <TrendingUp className="w-4 h-4" />领取分红
          </Button>
          <Button onClick={() => navigate("/stake")} variant="outline" className="gap-2">
            <BarChart3 className="w-4 h-4" />质押 C2-Coin
          </Button>
          <Button onClick={() => navigate("/buy")} variant="outline" className="gap-2">
            <ShoppingCart className="w-4 h-4" />购买 PVC
          </Button>
        </div>

        <Tabs defaultValue="purchase">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="purchase">购买记录</TabsTrigger>
            <TabsTrigger value="all">全部交易</TabsTrigger>
          </TabsList>

          <TabsContent value="purchase">
            <Card className="border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>购买历史</CardTitle>
                  <CardDescription>
                    累计投入 {totalPurchased.usdt.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} USDT，
                    获得 {totalPurchased.pvc.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} PVC
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchPurchase()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {purchaseLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : !purchaseHistory || purchaseHistory.filter(tx => tx.txType === "purchase_private" || tx.txType === "purchase_public").length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无购买记录</p>
                    <Button onClick={() => navigate("/buy")} variant="link" className="mt-2 text-emerald-600">去购买 PVC →</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.filter(tx => tx.txType === "purchase_private" || tx.txType === "purchase_public").map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={"w-2.5 h-2.5 rounded-full flex-shrink-0 " + (tx.status === "confirmed" ? "bg-emerald-500" : tx.status === "failed" ? "bg-red-500" : "bg-amber-400 animate-pulse")} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{TX_TYPE_LABELS[tx.txType] || tx.txType}</p>
                            <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("zh-CN")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{formatAmount(tx.amount, 2)} <span className="text-gray-500 font-normal">{tx.tokenSymbol}</span></p>
                            <p className="text-xs font-mono text-gray-400">{shortHash(tx.txHash)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                              {tx.status === "confirmed" ? "已确认" : tx.status === "failed" ? "失败" : "确认中"}
                            </Badge>
                            <a href={EXPLORER_URL + "/tx/" + tx.txHash} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-600">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>全部交易记录</CardTitle>
                <CardDescription>包含购买、质押、领取等所有链上操作</CardDescription>
              </CardHeader>
              <CardContent>
                {purchaseLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : !purchaseHistory || purchaseHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无交易记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={"w-2.5 h-2.5 rounded-full flex-shrink-0 " + (tx.status === "confirmed" ? "bg-emerald-500" : tx.status === "failed" ? "bg-red-500" : "bg-amber-400 animate-pulse")} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{TX_TYPE_LABELS[tx.txType] || tx.txType}</p>
                            <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("zh-CN")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{formatAmount(tx.amount, 2)} <span className="text-gray-500 font-normal">{tx.tokenSymbol}</span></p>
                            <p className="text-xs font-mono text-gray-400">{shortHash(tx.txHash)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                              {tx.status === "confirmed" ? "已确认" : tx.status === "failed" ? "失败" : "确认中"}
                            </Badge>
                            <a href={EXPLORER_URL + "/tx/" + tx.txHash} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-600">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
