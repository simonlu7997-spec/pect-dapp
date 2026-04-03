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
  Gift, Wallet, RefreshCw, ExternalLink, CheckCircle2,
  AlertCircle, Clock, XCircle, History,
} from "lucide-react";
import { C2COIN_ABI } from "@/contracts";
// ─── 合约 ABI ────────────────────────────────────────────────────────────────────────────
// ABI 别名（从合约仓库自动同步，勿手动修改）
const AIRDROP_ABI = C2COIN_ABI;
// ─── 环境变量 ────────────────────────────────────────────────────────────────────────────
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";
const C2_COIN_ADDRESS = import.meta.env.VITE_C2_COIN_ADDRESS || "";

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function formatAmount(amount: string | null | undefined, decimals = 4) {
  if (!amount) return "0";
  const n = parseFloat(amount);
  if (isNaN(n)) return "0";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: decimals });
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function Airdrop() {
  const { account: address, isConnected, signer } = useWalletContext();
  const walletAddress = useMemo(() => address || "", [address]);

  // ── 空投状态 ──
  const [airdropTxHash, setAirdropTxHash] = useState<string | null>(null);
  const [airdropTxStep, setAirdropTxStep] = useState<"idle" | "claiming" | "confirming" | "success">("idle");
  const [airdropTxError, setAirdropTxError] = useState<string | null>(null);

  // ── 空投查询 ──
  const { data: airdropInfo, isLoading: airdropLoading, refetch: refetchAirdrop } =
    trpc.airdrop.getAirdropInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 30_000 });

  const { data: airdropHistory, isLoading: historyLoading, refetch: refetchAirdropHistory } =
    trpc.airdrop.getAirdropHistory.useQuery({ walletAddress }, { enabled: !!walletAddress });

  const recordAirdropClaim = trpc.airdrop.recordAirdropClaim.useMutation();

  const c2Symbol = airdropInfo?.c2Symbol || "C2C";
  const claimableAmount = parseFloat(airdropInfo?.claimableAmount ?? "0");

  // ── 领取空投 ──
  const handleAirdropClaim = async () => {
    if (!signer || !C2_COIN_ADDRESS) { toast.error("合约地址未配置，请联系管理员"); return; }
    if (!airdropInfo?.isActive) { toast.error("空投活动尚未开始或已结束"); return; }
    if (airdropInfo?.isClaimed) { toast.error("您已领取过本次空投"); return; }
    if (claimableAmount <= 0) { toast.error("当前钱包地址不在空投名单中"); return; }

    setAirdropTxStep("claiming"); setAirdropTxError(null);
    try {
      const airdropContract = new ethers.Contract(C2_COIN_ADDRESS, AIRDROP_ABI, signer);
      toast.info("请在钱包中确认领取交易...");
      // 获取当前年月（格式：YYYYMM，如 202604）
      const now = new Date();
      const currentYearMonth = now.getFullYear() * 100 + (now.getMonth() + 1);
      const tx = await airdropContract.claimC2Coin(currentYearMonth);
      setAirdropTxHash(tx.hash);
      setAirdropTxStep("confirming");
      await recordAirdropClaim.mutateAsync({ walletAddress, txHash: tx.hash, c2Amount: String(claimableAmount) });
      await tx.wait(1);
      setAirdropTxStep("success");
      refetchAirdrop(); refetchAirdropHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "交易失败";
      if (msg.includes("user rejected")) {
        toast.error("已取消交易"); setAirdropTxStep("idle");
      } else {
        setAirdropTxError(msg.slice(0, 120)); setAirdropTxStep("idle");
      }
    }
  };

  // ── 未连接钱包 ──
  if (!isConnected || !walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-purple-200">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">连接钱包领取空投</h2>
            <p className="text-gray-500 text-sm">请先连接您的钱包，查询并领取 C2-Coin 空投。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container max-w-4xl py-10 space-y-8">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">C2-Coin 空投</h1>
            <p className="text-gray-500 mt-1">查询并领取您的 C2-Coin 空投</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchAirdrop(); refetchAirdropHistory(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" />刷新
          </Button>
        </div>

        {/* ═══ 空投领取区 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：空投信息 */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-purple-700">空投概况</CardTitle>
                  {airdropLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <button onClick={() => refetchAirdrop()} className="text-gray-400 hover:text-gray-600">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {airdropLoading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">总空投量</span>
                      <span className="font-semibold">{parseFloat(airdropInfo?.totalAirdrop ?? "0").toLocaleString()} {c2Symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">已领取总量</span>
                      <span className="font-semibold">{parseFloat(airdropInfo?.totalClaimed ?? "0").toLocaleString()} {c2Symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">截止日期</span>
                      <span className="font-semibold">
                        {airdropInfo?.claimDeadline
                          ? new Date(airdropInfo.claimDeadline).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">状态</span>
                      {airdropInfo?.isActive ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">进行中</Badge>
                      ) : (
                        <Badge variant="secondary">{airdropInfo?.contractConfigured ? "已结束" : "即将开放"}</Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="pb-3"><CardTitle className="text-base text-gray-700">我的空投</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {airdropLoading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">可领取数量</span>
                      <span className="font-bold text-purple-700 text-base">{claimableAmount.toLocaleString()} {c2Symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">钱包余额</span>
                      <span className="font-semibold">{parseFloat(airdropInfo?.c2Balance ?? "0").toLocaleString()} {c2Symbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">领取状态</span>
                      {airdropInfo?.isClaimed ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />已领取</Badge>
                      ) : claimableAmount > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Gift className="w-3 h-3 mr-1" />待领取</Badge>
                      ) : (
                        <Badge variant="secondary">不在名单</Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：领取操作 */}
          <div className="lg:col-span-3">
            <Card className="border-purple-200">
              <CardHeader className="pb-3"><CardTitle className="text-base text-purple-700">领取 C2-Coin</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* 成功状态 */}
                {airdropTxStep === "success" && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <CheckCircle2 className="w-14 h-14 text-purple-500" />
                    <div>
                      <p className="text-lg font-semibold text-purple-700">领取成功！</p>
                      <p className="text-sm text-gray-500 mt-1">{c2Symbol} 已发送到您的钱包</p>
                    </div>
                    {airdropTxHash && (
                      <a href={`${EXPLORER_URL}/tx/${airdropTxHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        查看交易 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <Button onClick={() => { setAirdropTxStep("idle"); setAirdropTxHash(null); setAirdropTxError(null); }} variant="outline" size="sm">返回</Button>
                  </div>
                )}

                {/* 确认中状态 */}
                {airdropTxStep === "confirming" && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <RefreshCw className="w-12 h-12 text-purple-500 animate-spin" />
                    <div>
                      <p className="text-base font-semibold">等待链上确认...</p>
                      <p className="text-sm text-gray-500 mt-1">通常需要 15-60 秒</p>
                    </div>
                    {airdropTxHash && (
                      <a href={`${EXPLORER_URL}/tx/${airdropTxHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        在浏览器中查看 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* 默认/错误状态 */}
                {airdropTxStep !== "success" && airdropTxStep !== "confirming" && (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                      <p className="text-sm text-gray-500 mb-2">您可领取的 C2-Coin 数量</p>
                      {airdropLoading ? (
                        <Skeleton className="h-10 w-32 mx-auto" />
                      ) : (
                        <>
                          <p className="text-4xl font-bold text-purple-700">{claimableAmount.toLocaleString()}</p>
                          <p className="text-sm text-purple-500 mt-1">{c2Symbol}</p>
                        </>
                      )}
                    </div>

                    {airdropTxError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{airdropTxError}
                      </div>
                    )}
                    {airdropInfo?.isClaimed && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />您已成功领取本次空投
                      </div>
                    )}
                    {!airdropInfo?.isClaimed && claimableAmount === 0 && airdropInfo?.contractConfigured && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />当前钱包地址不在空投名单中，或可领取数量为 0
                      </div>
                    )}
                    {!airdropInfo?.contractConfigured && (
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-500">
                        <Clock className="w-4 h-4 flex-shrink-0" />空投合约尚未部署，敬请期待
                      </div>
                    )}

                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={!airdropInfo?.isActive || airdropInfo?.isClaimed || claimableAmount <= 0 || airdropTxStep === "claiming"}
                      onClick={handleAirdropClaim}
                    >
                      {airdropTxStep === "claiming" ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />领取中...</>
                      ) : (
                        <><Gift className="w-4 h-4 mr-2" />领取 C2-Coin 空投</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ 空投历史（页面下方直接展示）═══ */}
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />空投领取历史
              </CardTitle>
              <CardDescription>所有空投领取记录</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchAirdropHistory()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !airdropHistory || airdropHistory.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无空投领取记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left py-2 pr-4">时间</th>
                      <th className="text-left py-2 pr-4">数量</th>
                      <th className="text-left py-2 pr-4">状态</th>
                      <th className="text-left py-2">交易哈希</th>
                    </tr>
                  </thead>
                  <tbody>
                    {airdropHistory.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4 text-gray-500">{new Date(tx.createdAt).toLocaleString("zh-CN")}</td>
                        <td className="py-3 pr-4 font-semibold text-purple-700">+{formatAmount(tx.amount, 2)} {tx.tokenSymbol}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={tx.status === "confirmed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {tx.status === "confirmed" ? "已确认" : tx.status === "failed" ? "失败" : "确认中"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <a
                            href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs"
                          >
                            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)} <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
