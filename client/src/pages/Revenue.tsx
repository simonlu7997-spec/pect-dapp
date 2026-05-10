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
  CalendarDays,
} from "lucide-react";

import { REVENUEDISTRIBUTOR_ABI } from "@/contracts";
// ABI 别名（从合约仓库自动同步，勿手动修改）
const REVENUE_DISTRIBUTOR_ABI = REVENUEDISTRIBUTOR_ABI;

const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";
const REVENUE_DISTRIBUTOR_ADDRESS = import.meta.env.VITE_REVENUE_DISTRIBUTOR_ADDRESS || "";

function formatAmount(amount: string, decimals = 4) {
  const n = parseFloat(amount);
  if (isNaN(n)) return "0";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: decimals });
}

type MonthRevenue = {
  month: number;
  label: string;
  revenueUsdt: string;
  claimed: boolean;
  claimable: boolean;
};

export default function Revenue() {
  const { account: address, isConnected, signer } = useWalletContext();
  // 记录每个月份的领取状态（month -> txHash）
  const [claimingMonths, setClaimingMonths] = useState<Set<number>>(new Set());
  const [claimTxHashes, setClaimTxHashes] = useState<Record<number, string>>({});

  const walletAddress = useMemo(() => address || "", [address]);

  const {
    data: revenueInfo,
    isLoading: isLoadingInfo,
    refetch: refetchInfo,
  } = trpc.revenue.getRevenueInfo.useQuery(
    { walletAddress },
    { enabled: !!walletAddress, refetchInterval: 30_000 }
  );

  // 查询所有历史月份的分红状态
  const {
    data: allMonthlyRevenue,
    isLoading: isLoadingMonths,
    refetch: refetchMonths,
  } = trpc.revenue.getAllMonthlyRevenue.useQuery(
    { walletAddress },
    { enabled: !!walletAddress, refetchInterval: 30_000 }
  );

  const { data: claimHistory, refetch: refetchHistory } =
    trpc.revenue.getClaimHistory.useQuery(
      { walletAddress },
      { enabled: !!walletAddress }
    );

  const recordClaimMutation = trpc.revenue.recordClaim.useMutation();

  // 计算所有月份中未领取的总金额
  const totalClaimable = useMemo(() => {
    if (!allMonthlyRevenue?.months) return "0";
    const total = allMonthlyRevenue.months
      .filter((m) => m.claimable)
      .reduce((sum, m) => sum + parseFloat(m.revenueUsdt || "0"), 0);
    return total.toFixed(6);
  }, [allMonthlyRevenue]);

  // 领取指定月份的分红
  const handleClaimMonth = async (monthData: MonthRevenue) => {
    if (!signer || !REVENUE_DISTRIBUTOR_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员");
      return;
    }
    if (!monthData.claimable) {
      toast.error("该月份暂无可领取的分红");
      return;
    }

    setClaimingMonths((prev) => new Set(prev).add(monthData.month));
    try {
      const contract = new ethers.Contract(
        REVENUE_DISTRIBUTOR_ADDRESS,
        REVENUE_DISTRIBUTOR_ABI,
        signer
      );

      toast.info(`请在钱包中确认 ${monthData.label} 分红领取交易...`);
      const tx = await contract.claimRevenue(monthData.month);
      setClaimTxHashes((prev) => ({ ...prev, [monthData.month]: tx.hash }));
      toast.info("交易已提交，等待链上确认...");

      await recordClaimMutation.mutateAsync({
        walletAddress,
        txHash: tx.hash,
        usdtAmount: monthData.revenueUsdt,
        claimType: "dividend",
      });

      await tx.wait(1);
      toast.success(`${monthData.label} 分红领取成功！${formatAmount(monthData.revenueUsdt, 2)} USDT 已到账`);
      refetchInfo();
      refetchMonths();
      refetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "交易失败";
      if (msg.includes("user rejected")) {
        toast.error("已取消交易");
      } else {
        toast.error(`领取失败：${msg.slice(0, 80)}`);
      }
    } finally {
      setClaimingMonths((prev) => {
        const next = new Set(prev);
        next.delete(monthData.month);
        return next;
      });
    }
  };

  // 一键领取所有未领取月份
  const handleClaimAll = async () => {
    if (!allMonthlyRevenue?.months) return;
    const claimableMonths = allMonthlyRevenue.months.filter((m) => m.claimable);
    if (claimableMonths.length === 0) {
      toast.error("暂无可领取的分红");
      return;
    }
    // 逐月顺序领取
    for (const monthData of claimableMonths) {
      await handleClaimMonth(monthData);
    }
  };

  const isLoading = isLoadingInfo || isLoadingMonths;

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

  const months = allMonthlyRevenue?.months || [];
  const claimableMonths = months.filter((m) => m.claimable);
  const claimedMonths = months.filter((m) => m.claimed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container max-w-4xl py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PV-Coin 分红</h1>
            <p className="text-gray-500 mt-1">查看持仓收益，领取月度 USDT 分红</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchInfo(); refetchMonths(); refetchHistory(); }}
            className="gap-2"
          >
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

        {/* 持仓概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-emerald-200 bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Coins className="w-4 h-4" /> PV-Coin 持仓
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInfo ? <Skeleton className="h-9 w-32" /> : (
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
                <TrendingUp className="w-4 h-4" /> 待领取分红（合计）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-32" /> : (
                <>
                  <p className="text-3xl font-bold text-emerald-700">{formatAmount(totalClaimable, 2)}</p>
                  <p className="text-xs text-gray-400 mt-1">USDT · 共 {claimableMonths.length} 个月份未领取</p>
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
              {isLoadingInfo ? <Skeleton className="h-9 w-32" /> : (
                <>
                  <p className="text-lg font-bold text-gray-900">
                    {(() => {
                      const now = new Date();
                      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                      return `${nextMonth.getFullYear()}年${nextMonth.getMonth() + 1}月1日`;
                    })()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {revenueInfo?.lastDistributionMonth
                      ? `上次分红：${String(revenueInfo.lastDistributionMonth).slice(0, 4)}年${String(revenueInfo.lastDistributionMonth).slice(4)}月`
                      : "暂无分红记录"
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 各月份分红列表 */}
        <Card className="border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                月度分红明细
              </CardTitle>
              <CardDescription className="mt-1">每月根据您持有的 PV-Coin 比例分配电站收益，可随时领取历史未领取分红</CardDescription>
            </div>
            {claimableMonths.length > 1 && (
              <Button
                onClick={handleClaimAll}
                disabled={claimingMonths.size > 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                size="sm"
              >
                {claimingMonths.size > 0 ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />领取中...</>
                ) : (
                  `一键领取全部（${claimableMonths.length} 个月）`
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : months.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无分红记录</p>
                <p className="text-xs mt-1">分红将在每月月底由管理员发起，请持有 PV-Coin 等待</p>
              </div>
            ) : (
              <div className="space-y-3">
                {months.map((monthData) => {
                  const isClaiming = claimingMonths.has(monthData.month);
                  const txHash = claimTxHashes[monthData.month];

                  return (
                    <div
                      key={monthData.month}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border ${
                        monthData.claimable
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          monthData.claimed ? "bg-emerald-500" : "bg-amber-400"
                        }`} />
                        <div>
                          <p className="font-semibold text-gray-900">{monthData.label}</p>
                          <p className="text-sm text-gray-500">
                            可领取：<span className="font-bold text-emerald-700">{formatAmount(monthData.revenueUsdt, 4)} USDT</span>
                          </p>
                          {txHash && (
                            <a
                              href={`${EXPLORER_URL}/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              查看交易
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        {monthData.claimed ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> 已领取
                          </Badge>
                        ) : monthData.claimable ? (
                          <Button
                            size="sm"
                            onClick={() => handleClaimMonth(monthData)}
                            disabled={isClaiming || claimingMonths.size > 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {isClaiming ? (
                              <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />领取中</>
                            ) : "领取"}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-400">
                            无可领取
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 space-y-1">
              <p>• 分红来自光伏电站的电费收入，每月按持仓比例分配</p>
              <p>• 领取操作需要支付少量 Gas 费用（MATIC）</p>
              <p>• 历史未领取的分红不会消失，可随时补领</p>
            </div>
          </CardContent>
        </Card>

        {/* 领取历史 */}
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle>领取历史</CardTitle>
            <CardDescription>历史分红领取记录（含质押奖励）</CardDescription>
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
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        tx.status === "confirmed" ? "bg-emerald-500" : tx.status === "failed" ? "bg-red-500" : "bg-amber-400"
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.txType === "claim_dividend" ? "USDT 分红" : "质押奖励"}{" "}
                          <span className="text-emerald-600 font-bold">+{formatAmount(tx.amount || "0", 2)} {tx.tokenSymbol}</span>
                        </p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString("zh-CN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="text-gray-400 hover:text-gray-600"
                      >
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
