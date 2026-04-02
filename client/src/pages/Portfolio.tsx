import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useWalletContext } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Coins,
  TrendingUp,
  ExternalLink,
  Wallet,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  Gift,
  Zap,
  ArrowRight,
} from "lucide-react";

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
  airdrop_claim: "领取 C2 空投",
  whitelist: "KYC 白名单",
};

function StatCard({
  label,
  value,
  unit,
  loading,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  loading: boolean;
  highlight?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card className={highlight ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50" : "border-emerald-200"}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1 text-xs">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className={`text-2xl font-bold ${highlight ? "text-emerald-700" : "text-gray-900"}`}>{value}</p>
            <p className="text-xs text-gray-400">{unit}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  amount,
  unit,
  loading,
  buttonLabel,
  onClick,
  color,
  icon,
}: {
  title: string;
  description: string;
  amount: string;
  unit: string;
  loading: boolean;
  buttonLabel: string;
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
}) {
  const hasAmount = parseFloat(amount) > 0;
  return (
    <Card className={`border-2 ${hasAmount ? color : "border-gray-200"} transition-colors`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasAmount ? "bg-emerald-100" : "bg-gray-100"}`}>
              {icon}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {loading ? (
              <Skeleton className="h-6 w-20 ml-auto" />
            ) : (
              <p className={`text-lg font-bold ${hasAmount ? "text-emerald-700" : "text-gray-400"}`}>
                {formatAmount(amount, 4)} <span className="text-xs font-normal">{unit}</span>
              </p>
            )}
            <Button
              size="sm"
              variant={hasAmount ? "default" : "outline"}
              className={hasAmount ? "mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" : "mt-2 text-xs"}
              onClick={onClick}
            >
              {buttonLabel}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Portfolio() {
  const { account: address, isConnected } = useWalletContext();
  const [, navigate] = useLocation();
  const walletAddress = useMemo(() => address || "", [address]);

  const { data: purchaseHistory, isLoading: purchaseLoading, refetch: refetchPurchase } =
    trpc.purchase.getPurchaseHistory.useQuery({ walletAddress }, { enabled: !!walletAddress });

  const { data: revenueInfo, isLoading: revenueLoading, refetch: refetchRevenue } =
    trpc.revenue.getRevenueInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 60_000 });

  const { data: stakingInfo, isLoading: stakingLoading, refetch: refetchStaking } =
    trpc.staking.getStakingInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 60_000 });

  const { data: airdropInfo, isLoading: airdropLoading, refetch: refetchAirdrop } =
    trpc.airdrop.getAirdropInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 60_000 });

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

  const recentTxs = useMemo(() => {
    if (!purchaseHistory) return [];
    return [...purchaseHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [purchaseHistory]);

  const handleRefreshAll = () => {
    refetchPurchase();
    refetchRevenue();
    refetchStaking();
    refetchAirdrop();
  };

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
        {/* 页头 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的资产</h1>
            <p className="text-gray-500 mt-1 font-mono text-sm truncate max-w-xs">{walletAddress}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefreshAll} className="gap-2 text-gray-500 hover:text-gray-900">
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        {/* 资产概览 - 6 卡片 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">资产概览</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="PV-Coin 持仓"
              value={formatAmount(revenueInfo?.pvBalance, 2)}
              unit="PVC"
              loading={revenueLoading}
              icon={<Coins className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="C2-Coin 持仓"
              value={formatAmount(revenueInfo?.c2Balance, 2)}
              unit="C2C"
              loading={revenueLoading}
              icon={<Coins className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="已质押 C2C"
              value={formatAmount(stakingInfo?.stakedAmount, 2)}
              unit="C2C"
              loading={stakingLoading}
              icon={<BarChart3 className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="待领取分红"
              value={formatAmount(revenueInfo?.claimableUsdt, 2)}
              unit="USDT"
              loading={revenueLoading}
              highlight
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="可领取空投"
              value={formatAmount(airdropInfo?.claimableAmount, 2)}
              unit="C2C"
              loading={airdropLoading}
              highlight={parseFloat(airdropInfo?.claimableAmount || "0") > 0}
              icon={<Gift className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="待领取质押奖励"
              value={formatAmount(stakingInfo?.pendingReward, 2)}
              unit="USDT"
              loading={stakingLoading}
              highlight={parseFloat(stakingInfo?.pendingReward || "0") > 0}
              icon={<Zap className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* 待处理操作 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">待处理操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              title="领取 PVC 分红"
              description="持有 PV-Coin 即可按比例领取电站收益"
              amount={revenueInfo?.claimableUsdt || "0"}
              unit="USDT"
              loading={revenueLoading}
              buttonLabel="去领取"
              onClick={() => navigate("/revenue")}
              color="border-emerald-300"
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            />
            <ActionCard
              title="领取 C2 空投"
              description="符合条件的地址可免费领取 C2-Coin"
              amount={airdropInfo?.claimableAmount || "0"}
              unit="C2C"
              loading={airdropLoading}
              buttonLabel="去领取"
              onClick={() => navigate("/airdrop")}
              color="border-purple-300"
              icon={<Gift className="w-5 h-5 text-purple-600" />}
            />
            <ActionCard
              title="领取质押奖励"
              description="C2-Coin 质押奖励，每月结算"
              amount={stakingInfo?.pendingReward || "0"}
              unit="USDT"
              loading={stakingLoading}
              buttonLabel="去领取"
              onClick={() => navigate("/staking")}
              color="border-blue-300"
              icon={<Zap className="w-5 h-5 text-blue-600" />}
            />
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/buy")} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <ShoppingCart className="w-4 h-4" />购买 PVC
          </Button>
          <Button onClick={() => navigate("/staking")} variant="outline" className="gap-2">
            <BarChart3 className="w-4 h-4" />质押 C2C
          </Button>
          <Button onClick={() => navigate("/airdrop")} variant="outline" className="gap-2">
            <Gift className="w-4 h-4" />C2 空投
          </Button>
          <Button onClick={() => navigate("/revenue")} variant="outline" className="gap-2">
            <TrendingUp className="w-4 h-4" />分红管理
          </Button>
        </div>

        {/* 交易记录 */}
        <Tabs defaultValue="recent">
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            <TabsTrigger value="recent">近期操作</TabsTrigger>
            <TabsTrigger value="purchase">购买记录</TabsTrigger>
            <TabsTrigger value="all">全部交易</TabsTrigger>
          </TabsList>

          {/* 近期操作 */}
          <TabsContent value="recent">
            <Card className="border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>近期操作</CardTitle>
                  <CardDescription>最近 5 笔链上操作的实时状态</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRefreshAll}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {purchaseLoading ? (
                  <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : recentTxs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无操作记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTxs.map((tx) => (
                      <TxRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 购买记录 */}
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
                  <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : !purchaseHistory || purchaseHistory.filter(tx => tx.txType === "purchase_private" || tx.txType === "purchase_public").length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无购买记录</p>
                    <Button onClick={() => navigate("/buy")} variant="link" className="mt-2 text-emerald-600">去购买 PVC →</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.filter(tx => tx.txType === "purchase_private" || tx.txType === "purchase_public").map((tx) => (
                      <TxRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 全部交易 */}
          <TabsContent value="all">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>全部交易记录</CardTitle>
                <CardDescription>包含购买、质押、领取等所有链上操作</CardDescription>
              </CardHeader>
              <CardContent>
                {purchaseLoading ? (
                  <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : !purchaseHistory || purchaseHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无交易记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.map((tx) => (
                      <TxRow key={tx.id} tx={tx} />
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

type TxItem = {
  id: number;
  txHash: string;
  txType: string;
  amount: string | null;
  tokenSymbol: string | null;
  status: string;
  createdAt: Date;
};

function TxRow({ tx }: { tx: TxItem }) {
  const statusColor =
    tx.status === "confirmed" ? "bg-emerald-500" :
    tx.status === "failed" ? "bg-red-500" :
    "bg-amber-400 animate-pulse";

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />
        <div>
          <p className="text-sm font-semibold text-gray-900">{TX_TYPE_LABELS[tx.txType] || tx.txType}</p>
          <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("zh-CN")}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {tx.amount ? `${parseFloat(tx.amount).toLocaleString("zh-CN", { maximumFractionDigits: 4 })} ` : ""}
            <span className="text-gray-500 font-normal">{tx.tokenSymbol || ""}</span>
          </p>
          <p className="text-xs font-mono text-gray-400">{shortHash(tx.txHash)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"}
            className="text-xs"
          >
            {tx.status === "confirmed" ? "已确认" : tx.status === "failed" ? "失败" : "确认中"}
          </Badge>
          <a
            href={`${EXPLORER_URL}/tx/${tx.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-emerald-600"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
