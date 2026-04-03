import { useState, useMemo } from "react";
import { ethers } from "ethers";
import { trpc } from "@/lib/trpc";
import { useWalletContext } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  TrendingUp,
  Coins,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";

import { REVENUEDISTRIBUTOR_ABI } from "@/contracts";
// ABI 别名（从合约仓库自动同步，勿手动修改）
const REVENUE_DISTRIBUTOR_ABI = REVENUEDISTRIBUTOR_ABI;

const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";
const REVENUE_DISTRIBUTOR_ADDRESS = import.meta.env.VITE_REVENUE_DISTRIBUTOR_ADDRESS || "";

function formatDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(amount: string, decimals = 4) {
  const n = parseFloat(amount);
  if (isNaN(n)) return "0";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: decimals });
}

export default function Revenue() {
  const { account: address, isConnected, signer } = useWalletContext();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);

  const walletAddress = useMemo(() => address || "", [address]);

  const {
    data: revenueInfo,
    isLoading,
    refetch,
  } = trpc.revenue.getRevenueInfo.useQuery(
    { walletAddress },
    { enabled: !!walletAddress, refetchInterval: 30_000 }
  );

  const { data: claimHistory, refetch: refetchHistory } =
    trpc.revenue.getClaimHistory.useQuery(
      { walletAddress },
      { enabled: !!walletAddress }
    );

  const recordClaimMutation = trpc.revenue.recordClaim.useMutation();

  const handleClaim = async () => {
    if (!signer || !REVENUE_DISTRIBUTOR_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员");
      return;
    }
    if (!revenueInfo?.claimableUsdt || parseFloat(revenueInfo.claimableUsdt) <= 0) {
      toast.error("暂无可领取的分红");
      return;
    }

    setIsClaiming(true);
    try {
      const contract = new ethers.Contract(
        REVENUE_DISTRIBUTOR_ADDRESS,
        REVENUE_DISTRIBUTOR_ABI,
        signer
      );

      toast.info("请在钱包中确认交易...");
      // 获取当前年月（格式：YYYYMM，如 202604）
      const now = new Date();
      const currentMonth = now.getFullYear() * 100 + (now.getMonth() + 1);
      const tx = await contract.claimRevenue(currentMonth);
      setClaimTxHash(tx.hash);
      toast.info("交易已提交，等待链上确认...");

      await recordClaimMutation.mutateAsync({
        walletAddress,
        txHash: tx.hash,
        usdtAmount: revenueInfo.claimableUsdt,
        claimType: "dividend",
      });

      await tx.wait(1);
      toast.success("分红领取成功！USDT 已到账");
      refetch();
      refetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "交易失败";
      if (msg.includes("user rejected")) {
        toast.error("已取消交易");
      } else {
        toast.error(`领取失败：${msg.slice(0, 80)}`);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected || !walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-emerald-200">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">连接钱包查看分红</h2>
            <p className="text-gray-500 text-sm">
              请先连接您的钱包，查看 PV-Coin 持仓和待领取的 USDT 分红。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container max-w-4xl py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PV-Coin 分红</h1>
            <p className="text-gray-500 mt-1">查看持仓收益，领取月度 USDT 分红</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetch(); refetchHistory(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        {revenueInfo && !revenueInfo.contractConfigured && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              RevenueDistributor 合约地址尚未配置。请在环境变量中设置{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_REVENUE_DISTRIBUTOR_ADDRESS</code>。
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-emerald-200 bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Coins className="w-4 h-4" /> PV-Coin 持仓
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-32" /> : (
                <>
                  <p className="text-3xl font-bold text-gray-900">{formatAmount(revenueInfo?.pvBalance || "0", 2)}</p>
                  <p className="text-xs text-gray-400 mt-1">PVC</p>
                  <p className="text-sm text-emerald-600 mt-2 font-medium">占总供应量 {revenueInfo?.holdingPercent || "0"}%</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> 待领取分红
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-32" /> : (
                <>
                  <p className="text-3xl font-bold text-emerald-700">{formatAmount(revenueInfo?.claimableUsdt || "0", 2)}</p>
                  <p className="text-xs text-gray-400 mt-1">USDT</p>
                  {revenueInfo?.hasClaimed && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> 本期已领取
                    </Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> 下次分红时间
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-32" /> : (
                <>
                  <p className="text-lg font-bold text-gray-900">{formatDate(revenueInfo?.nextDistributionTime || null)}</p>
                  <p className="text-xs text-gray-400 mt-1">累计已分配：{formatAmount(revenueInfo?.totalDistributed || "0", 2)} USDT</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle>领取 USDT 分红</CardTitle>
            <CardDescription>每月根据您持有的 PV-Coin 比例分配电站收益，可随时领取</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div>
                <p className="text-sm text-gray-600">本期可领取</p>
                <p className="text-4xl font-bold text-emerald-700 mt-1">
                  {isLoading ? <Skeleton className="h-10 w-28 inline-block" /> : `${formatAmount(revenueInfo?.claimableUsdt || "0", 2)} USDT`}
                </p>
                {revenueInfo?.lastDistributionTime && (
                  <p className="text-xs text-gray-400 mt-1">上次分红：{formatDate(revenueInfo.lastDistributionTime)}</p>
                )}
              </div>
              <Button
                onClick={handleClaim}
                disabled={isClaiming || isLoading || !revenueInfo?.contractConfigured || revenueInfo?.hasClaimed || parseFloat(revenueInfo?.claimableUsdt || "0") <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg font-semibold whitespace-nowrap"
                size="lg"
              >
                {isClaiming ? (<><RefreshCw className="w-5 h-5 mr-2 animate-spin" />领取中...</>) :
                  revenueInfo?.hasClaimed ? (<><CheckCircle2 className="w-5 h-5 mr-2" />本期已领取</>) : "领取分红"}
              </Button>
            </div>

            {claimTxHash && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-800 font-medium">交易确认中</p>
                  <p className="text-xs text-blue-600 font-mono truncate">{claimTxHash}</p>
                </div>
                <a href={`${EXPLORER_URL}/tx/${claimTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 space-y-1">
              <p>• 分红来自光伏电站的电费收入，每月按持仓比例分配</p>
              <p>• 领取操作需要支付少量 Gas 费用（MATIC）</p>
              <p>• 每个分红周期只能领取一次，未领取的分红不会消失</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle>领取历史</CardTitle>
            <CardDescription>历史分红领取记录</CardDescription>
          </CardHeader>
          <CardContent>
            {!claimHistory || claimHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无领取记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claimHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.status === "confirmed" ? "bg-emerald-500" : tx.status === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.txType === "claim_dividend" ? "USDT 分红" : "质押奖励"}{" "}
                          <span className="text-emerald-600 font-bold">+{formatAmount(tx.amount || "0", 2)} {tx.tokenSymbol}</span>
                        </p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("zh-CN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                        {tx.status === "confirmed" ? "已确认" : tx.status === "failed" ? "失败" : "确认中"}
                      </Badge>
                      <a href={`${EXPLORER_URL}/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
