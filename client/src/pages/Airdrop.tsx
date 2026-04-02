import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

// C2-Coin 空投合约 ABI（前端直接调用）
const AIRDROP_ABI = [
  "function claim() external",
  "function claim(uint256 amount, bytes32[] calldata merkleProof) external",
  "function isClaimed(address account) external view returns (bool)",
];

const C2_AIRDROP_ADDRESS =
  (import.meta.env.VITE_C2_AIRDROP_ADDRESS as string | undefined) ||
  (import.meta.env.VITE_C2_COIN_ADDRESS as string | undefined); // fallback
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";

type TxStep = "idle" | "claiming" | "confirming" | "success" | "error";

export default function Airdrop() {
  const { account, signer, isConnected } = useWallet();
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // 查询空投信息
  const { data: airdropInfo, isLoading, refetch } = trpc.airdrop.getAirdropInfo.useQuery(
    { walletAddress: account! },
    { enabled: !!account, refetchInterval: 30_000 }
  );

  // 记录领取交易
  const recordClaimMutation = trpc.airdrop.recordAirdropClaim.useMutation();

  // 查询历史记录
  const { data: history, refetch: refetchHistory } = trpc.airdrop.getAirdropHistory.useQuery(
    { walletAddress: account! },
    { enabled: !!account }
  );

  // 轮询交易确认状态
  const { data: txConfirm } = trpc.purchase.confirmTransaction.useQuery(
    { txHash: txHash! },
    { enabled: !!txHash && txStep === "confirming", refetchInterval: 3000 }
  );

  useEffect(() => {
    if (!txConfirm) return;
    if (txConfirm.status === "confirmed") {
      setTxStep("success");
      toast.success("C2-Coin 空投领取成功！");
      refetch();
      refetchHistory();
    } else if (txConfirm.status === "failed") {
      setTxStep("error");
      setTxError("链上交易执行失败，请稍后重试");
    }
  }, [txConfirm, refetch, refetchHistory]);

  const handleClaim = async () => {
    if (!signer || !C2_AIRDROP_ADDRESS) {
      toast.error("空投合约地址未配置，请联系管理员");
      return;
    }
    if (!account) return;

    setTxStep("claiming");
    setTxError(null);

    try {
      const airdrop = new ethers.Contract(C2_AIRDROP_ADDRESS, AIRDROP_ABI, signer);
      // 尝试无参数 claim（简单白名单版本）
      const tx = await airdrop["claim()"]();
      setTxHash(tx.hash);
      setTxStep("confirming");
      toast.info("领取交易已提交，等待链上确认...", { duration: 8000 });

      // 异步记录到数据库
      recordClaimMutation.mutate({
        walletAddress: account,
        txHash: tx.hash,
        c2Amount: airdropInfo?.claimableAmount ?? "0",
      });
    } catch (err: unknown) {
      setTxStep("idle");
      const error = err as { code?: string; reason?: string; message?: string };
      if (error.code === "ACTION_REJECTED") {
        toast.error("您已取消领取操作");
      } else if (error.reason?.includes("already claimed") || error.message?.includes("already claimed")) {
        setTxError("您已领取过空投，每个地址只能领取一次");
        toast.error("已领取过空投");
      } else if (error.reason?.includes("not eligible") || error.message?.includes("not eligible")) {
        setTxError("您的钱包地址不在空投名单中");
        toast.error("不在空投名单中");
      } else {
        setTxError("领取失败，请检查钱包状态后重试");
        toast.error("领取失败，请重试");
      }
    }
  };

  const claimableAmount = parseFloat(airdropInfo?.claimableAmount ?? "0");
  const c2Balance = parseFloat(airdropInfo?.c2Balance ?? "0");
  const c2Symbol = airdropInfo?.c2Symbol ?? "C2C";

  // 格式化截止时间
  const deadlineText = airdropInfo?.claimDeadline
    ? new Date(airdropInfo.claimDeadline).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-10">
      <div className="container max-w-5xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">C2-Coin 空投</h1>
          <p className="text-gray-500">领取您的 C2-Coin 碳排放代币，参与质押获得额外收益</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：空投信息 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 空投概况 */}
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-purple-700">空投概况</CardTitle>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <button onClick={() => refetch()} className="text-gray-400 hover:text-gray-600">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">总空投量</span>
                  <span className="font-semibold">
                    {parseFloat(airdropInfo?.totalAirdrop ?? "0").toLocaleString()} {c2Symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">已领取总量</span>
                  <span className="font-semibold">
                    {parseFloat(airdropInfo?.totalClaimed ?? "0").toLocaleString()} {c2Symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">截止日期</span>
                  <span className="font-semibold">{deadlineText}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">状态</span>
                  {airdropInfo?.isActive ? (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">进行中</Badge>
                  ) : (
                    <Badge variant="secondary">
                      {airdropInfo?.contractConfigured ? "已结束" : "即将开放"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 我的空投 */}
            {account && (
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-gray-700">我的空投</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">可领取数量</span>
                    <span className="font-bold text-purple-700 text-base">
                      {claimableAmount.toLocaleString()} {c2Symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">钱包余额</span>
                    <span className="font-semibold">
                      {c2Balance.toLocaleString()} {c2Symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">领取状态</span>
                    {airdropInfo?.isClaimed ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />已领取
                      </Badge>
                    ) : claimableAmount > 0 ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        <Gift className="w-3 h-3 mr-1" />待领取
                      </Badge>
                    ) : (
                      <Badge variant="secondary">不在名单</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：领取操作 */}
          <div className="lg:col-span-3">
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-purple-700">领取 C2-Coin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 未连接钱包 */}
                {!isConnected && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Wallet className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-500">请先连接钱包以查看并领取空投</p>
                  </div>
                )}

                {/* 已连接钱包 */}
                {isConnected && (
                  <>
                    {/* 成功 */}
                    {txStep === "success" && (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <CheckCircle2 className="w-14 h-14 text-purple-500" />
                        <div>
                          <p className="text-lg font-semibold text-purple-700">领取成功！</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {c2Symbol} 已发送到您的钱包
                          </p>
                        </div>
                        {txHash && (
                          <a
                            href={`${EXPLORER_URL}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            查看交易 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Button
                          onClick={() => { setTxStep("idle"); setTxHash(null); setTxError(null); refetch(); }}
                          variant="outline"
                          size="sm"
                        >
                          返回
                        </Button>
                      </div>
                    )}

                    {/* 确认中 */}
                    {txStep === "confirming" && (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                        <div>
                          <p className="text-base font-semibold">等待链上确认...</p>
                          <p className="text-sm text-gray-500 mt-1">通常需要 15-60 秒</p>
                        </div>
                        {txHash && (
                          <a
                            href={`${EXPLORER_URL}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            在浏览器中查看 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* 领取表单 */}
                    {txStep !== "success" && txStep !== "confirming" && (
                      <>
                        {/* 可领取金额展示 */}
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                          <p className="text-sm text-gray-500 mb-2">您可领取的 C2-Coin 数量</p>
                          <p className="text-4xl font-bold text-purple-700">
                            {claimableAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-purple-500 mt-1">{c2Symbol}</p>
                        </div>

                        {/* 错误提示 */}
                        {txError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {txError}
                          </div>
                        )}

                        {/* 已领取提示 */}
                        {airdropInfo?.isClaimed && (
                          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            您已成功领取本次空投
                          </div>
                        )}

                        {/* 不在名单提示 */}
                        {!airdropInfo?.isClaimed && claimableAmount === 0 && airdropInfo?.contractConfigured && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            当前钱包地址不在空投名单中，或可领取数量为 0
                          </div>
                        )}

                        {/* 合约未配置 */}
                        {!airdropInfo?.contractConfigured && (
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-500">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            空投合约尚未部署，敬请期待
                          </div>
                        )}

                        {/* 领取按钮 */}
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={
                            !airdropInfo?.isActive ||
                            airdropInfo?.isClaimed ||
                            claimableAmount <= 0 ||
                            txStep === "claiming"
                          }
                          onClick={handleClaim}
                        >
                          {txStep === "claiming" ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              领取中...
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              领取 C2-Coin 空投
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 领取历史 */}
        {account && history && history.length > 0 && (
          <Card className="mt-6 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-700">领取历史</CardTitle>
            </CardHeader>
            <CardContent>
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
                    {history.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-gray-500">
                          {new Date(tx.createdAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="py-2 pr-4 font-semibold text-purple-700">
                          {parseFloat(tx.amount ?? "0").toLocaleString()} {c2Symbol}
                        </td>
                        <td className="py-2 pr-4">
                          {tx.status === "confirmed" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">已确认</Badge>
                          ) : tx.status === "failed" ? (
                            <Badge variant="destructive">失败</Badge>
                          ) : (
                            <Badge variant="secondary">待确认</Badge>
                          )}
                        </td>
                        <td className="py-2">
                          <a
                            href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs"
                          >
                            {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 说明卡片 */}
        <Card className="mt-6 border-purple-200 bg-purple-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2 text-sm text-purple-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
              <div className="space-y-1">
                <p className="font-semibold">关于 C2-Coin 空投</p>
                <p>
                  C2-Coin 是碳排放代币，持有者可通过质押获得额外收益，同时支持项目的碳中和目标。
                  空投名单根据早期参与者、PV-Coin 持有量等因素综合确定，每个地址只能领取一次。
                  领取后可前往<a href="/staking" className="underline hover:text-purple-900">质押页面</a>进行质押。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
