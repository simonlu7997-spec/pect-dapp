import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PRIVATESALE_ABI, PUBLICSALE_ABI, PVCOIN_ABI } from "@/contracts";

// ABI 别名（从合约仓库自动同步，勿手动修改）
const PRIVATE_SALE_ABI = PRIVATESALE_ABI;
const PUBLIC_SALE_ABI = PUBLICSALE_ABI;
const ERC20_ABI = PVCOIN_ABI;

// 合约地址（从 Vite 环境变量读取）
const PRIVATE_SALE_ADDRESS = import.meta.env.VITE_PRIVATE_SALE_ADDRESS as string | undefined;
const PUBLIC_SALE_ADDRESS = import.meta.env.VITE_PUBLIC_SALE_ADDRESS as string | undefined;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS as string | undefined;
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";

type TxStep = "idle" | "approving" | "approved" | "buying" | "confirming" | "success" | "error";

export default function Buy() {
  const { account, signer, isConnected, isSignedIn } = useWallet();
  const [usdtInput, setUsdtInput] = useState("");
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [currentAllowance, setCurrentAllowance] = useState("0");

  // 查询私募轮链上信息
  const { data: saleInfo, isLoading: saleLoading, refetch: refetchSaleInfo } =
    trpc.purchase.getPrivateSaleInfo.useQuery(
      { walletAddress: account ?? undefined },
      { enabled: true, refetchInterval: 30_000 }
    );

  // 查询 KYC 状态
  const { data: kycStatus } = trpc.whitelist.checkStatus.useQuery(
    { walletAddress: account! },
    { enabled: !!account }
  );

  // 记录购买交易
  const recordPurchaseMutation = trpc.purchase.recordPurchase.useMutation();

  // 查询交易确认状态（轮询）
  const { data: txConfirm } = trpc.purchase.confirmTransaction.useQuery(
    { txHash: txHash! },
    {
      enabled: !!txHash && txStep === "confirming",
      refetchInterval: 3000,
    }
  );

  // 交易确认后更新状态
  useEffect(() => {
    if (!txConfirm) return;
    if (txConfirm.status === "confirmed") {
      setTxStep("success");
      toast.success("购买成功！PVC 代币已发送到您的钱包");
      refetchSaleInfo();
    } else if (txConfirm.status === "failed") {
      setTxStep("error");
      setTxError("链上交易执行失败，请检查合约状态");
    }
  }, [txConfirm, refetchSaleInfo]);

  // 计算 PVC 数量
  const tokenPrice = parseFloat(saleInfo?.tokenPrice || "0.10");
  const usdtAmount = parseFloat(usdtInput) || 0;
  const pvcAmount = tokenPrice > 0 ? (usdtAmount / tokenPrice).toFixed(2) : "0";

  // 验证输入
  const minPurchase = parseFloat(saleInfo?.minPurchase || "500");
  const maxPurchase = parseFloat(saleInfo?.maxPurchase || "10000");
  const userBalance = parseFloat(saleInfo?.userUsdtBalance || "0");
  const inputError = usdtInput
    ? usdtAmount < minPurchase
      ? `最低购买 ${minPurchase} USDT`
      : usdtAmount > maxPurchase
      ? `最高购买 ${maxPurchase} USDT`
      : usdtAmount > userBalance
      ? `USDT 余额不足（当前 ${userBalance.toFixed(2)} USDT）`
      : null
    : null;

  const needsApproval = parseFloat(currentAllowance) < usdtAmount;

  // 刷新授权额度
  const refreshAllowance = useCallback(async () => {
    if (!account || !USDT_ADDRESS || !PRIVATE_SALE_ADDRESS || !signer) return;
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const allowance = await usdt.allowance(account, PRIVATE_SALE_ADDRESS);
      setCurrentAllowance(ethers.formatUnits(allowance, decimals));
    } catch {
      // 忽略
    }
  }, [account, signer]);

  useEffect(() => {
    refreshAllowance();
  }, [refreshAllowance]);

  // Step 1: USDT 授权
  const handleApprove = async () => {
    if (!signer || !USDT_ADDRESS || !PRIVATE_SALE_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员");
      return;
    }
    if (!usdtInput || inputError) return;

    setTxStep("approving");
    setTxError(null);
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const amount = ethers.parseUnits(usdtInput, decimals);
      const tx = await usdt.approve(PRIVATE_SALE_ADDRESS, amount);
      toast.info("授权交易已提交，等待确认...", { duration: 5000 });
      await tx.wait();
      await refreshAllowance();
      setTxStep("approved");
      toast.success("USDT 授权成功！现在可以购买 PVC 了");
    } catch (err: unknown) {
      setTxStep("idle");
      if ((err as { code?: string }).code === "ACTION_REJECTED") {
        toast.error("您已取消授权操作");
      } else {
        setTxError("授权失败，请重试");
        toast.error("USDT 授权失败，请重试");
      }
    }
  };

  // Step 2: 购买 PVC
  const handleBuy = async () => {
    if (!signer || !PRIVATE_SALE_ADDRESS || !USDT_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员");
      return;
    }
    if (!usdtInput || inputError) return;

    setTxStep("buying");
    setTxError(null);
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const usdtWei = ethers.parseUnits(usdtInput, decimals);

      const privateSale = new ethers.Contract(PRIVATE_SALE_ADDRESS, PRIVATE_SALE_ABI, signer);
      const tx = await privateSale.purchase(usdtWei);
      setTxHash(tx.hash);
      setTxStep("confirming");
      toast.info("购买交易已提交，等待链上确认...", { duration: 8000 });

      // 异步记录到数据库
      if (account) {
        recordPurchaseMutation.mutate({
          walletAddress: account,
          txHash: tx.hash,
          usdtAmount: usdtInput,
          pvcAmount,
          saleType: "private",
        });
      }
    } catch (err: unknown) {
      setTxStep("idle");
      const error = err as { code?: string; reason?: string; message?: string };
      if (error.code === "ACTION_REJECTED") {
        toast.error("您已取消购买操作");
      } else if (error.reason?.includes("not whitelisted") || error.message?.includes("not whitelisted")) {
        setTxError("您的钱包地址未通过 KYC 白名单验证，无法参与私募");
        toast.error("KYC 验证未通过，无法购买");
      } else if (error.reason?.includes("cap") || error.message?.includes("cap")) {
        setTxError("私募轮已达到募资上限");
        toast.error("私募轮已结束");
      } else {
        setTxError("购买失败，请检查余额和授权后重试");
        toast.error("购买失败，请重试");
      }
    }
  };

  const resetFlow = () => {
    setTxStep("idle");
    setTxHash(null);
    setTxError(null);
    setUsdtInput("");
    refreshAllowance();
    refetchSaleInfo();
  };

  // ── 渲染 ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-10">
      <div className="container max-w-5xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">购买 PV-Coin</h1>
          <p className="text-gray-500">参与光伏电站收益代币的发行，享受稳定分红收益</p>
        </div>

        <Tabs defaultValue="private">
          <TabsList className="mb-6">
            <TabsTrigger value="private">私募轮</TabsTrigger>
            <TabsTrigger value="public">公募轮</TabsTrigger>
          </TabsList>

          {/* ── 私募轮 ── */}
          <TabsContent value="private" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* 左侧：私募轮信息 */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-green-700">私募轮信息</CardTitle>
                      {saleLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <button onClick={() => refetchSaleInfo()} className="text-gray-400 hover:text-gray-600">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">代币价格</span>
                      <span className="font-semibold">{saleInfo?.tokenPrice ?? "0.10"} USDT/PVC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">最低购买</span>
                      <span className="font-semibold">{saleInfo?.minPurchase ?? "500"} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">最高购买</span>
                      <span className="font-semibold">{saleInfo?.maxPurchase ?? "10,000"} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">锁仓期</span>
                      <span className="font-semibold">3 个月</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">状态</span>
                      {saleInfo?.isActive ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">进行中</Badge>
                      ) : (
                        <Badge variant="secondary">已结束</Badge>
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>募资进度</span>
                        <span>
                          {saleInfo?.totalRaised ?? "0"} / {saleInfo?.hardCap ?? "80,000"} USDT
                        </span>
                      </div>
                      <Progress value={saleInfo?.progressPercent ?? 0} className="h-2" />
                      <p className="text-right text-xs text-gray-400 mt-1">
                        {saleInfo?.progressPercent ?? 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* KYC 状态 */}
                {account && (
                  <Card className="border-gray-200">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 text-sm">
                        {kycStatus?.isKycVerified ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 font-medium">KYC 已通过，可参与私募</span>
                          </>
                        ) : kycStatus?.dbRecord?.status === "pending" ? (
                          <>
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-amber-700">KYC 审核中，请耐心等待</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700">
                              未通过 KYC，
                              <a href="/whitelist" className="underline hover:text-red-900">
                                立即申请
                              </a>
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 用户余额 */}
                {account && saleInfo && (
                  <Card className="border-gray-200">
                    <CardContent className="pt-4 pb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">USDT 余额</span>
                        <span className="font-semibold">{parseFloat(saleInfo.userUsdtBalance).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">已授权额度</span>
                        <span className="font-semibold">{parseFloat(currentAllowance).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">本轮已购</span>
                        <span className="font-semibold">{parseFloat(saleInfo.userPurchased).toFixed(2)} USDT</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 右侧：购买表单 */}
              <div className="lg:col-span-3">
                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-green-700">购买 PVC</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* 未连接钱包 */}
                    {!isConnected && (
                      <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <Wallet className="w-10 h-10 text-gray-300" />
                        <p className="text-gray-500">请先连接钱包以参与购买</p>
                      </div>
                    )}

                    {/* 已连接钱包 */}
                    {isConnected && (
                      <>
                        {/* 交易成功 */}
                        {txStep === "success" && (
                          <div className="flex flex-col items-center gap-4 py-6 text-center">
                            <CheckCircle2 className="w-14 h-14 text-green-500" />
                            <div>
                              <p className="text-lg font-semibold text-green-700">购买成功！</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {pvcAmount} PVC 已发送到您的钱包
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
                            <Button onClick={resetFlow} variant="outline" size="sm">
                              继续购买
                            </Button>
                          </div>
                        )}

                        {/* 交易进行中 */}
                        {txStep === "confirming" && (
                          <div className="flex flex-col items-center gap-4 py-6 text-center">
                            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
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

                        {/* 购买表单 */}
                        {txStep !== "success" && txStep !== "confirming" && (
                          <>
                            {/* 输入框 */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                支付 USDT 金额
                              </label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder={`最低 ${minPurchase} USDT`}
                                  value={usdtInput}
                                  onChange={(e) => {
                                    setUsdtInput(e.target.value);
                                    setTxStep("idle");
                                    setTxError(null);
                                  }}
                                  className={`pr-16 text-base ${inputError ? "border-red-400" : ""}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                  USDT
                                </span>
                              </div>
                              {inputError && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> {inputError}
                                </p>
                              )}
                            </div>

                            {/* 换算结果 */}
                            {usdtInput && !inputError && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">支付</span>
                                  <span className="font-semibold">{usdtAmount.toFixed(2)} USDT</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">获得</span>
                                  <span className="font-bold text-green-700 text-base">
                                    {parseFloat(pvcAmount).toLocaleString()} PVC
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-green-200">
                                  <span>单价</span>
                                  <span>{tokenPrice} USDT/PVC</span>
                                </div>
                              </div>
                            )}

                            {/* 错误提示 */}
                            {txError && (
                              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {txError}
                              </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="space-y-3 pt-1">
                              {/* 步骤指示 */}
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${!needsApproval || txStep === "approved" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                                  {!needsApproval || txStep === "approved" ? "✓" : "1"}
                                </div>
                                <span className={!needsApproval || txStep === "approved" ? "text-green-600" : ""}>
                                  授权 USDT
                                </span>
                                <div className="flex-1 h-px bg-gray-200" />
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-500">
                                  2
                                </div>
                                <span>购买 PVC</span>
                              </div>

                              {/* 授权按钮 */}
                              {needsApproval && txStep !== "approved" && (
                                <Button
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                  disabled={!usdtInput || !!inputError || txStep === "approving" || !saleInfo?.isActive}
                                  onClick={handleApprove}
                                >
                                  {txStep === "approving" ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      授权中...
                                    </>
                                  ) : (
                                    "第一步：授权 USDT"
                                  )}
                                </Button>
                              )}

                              {/* 购买按钮 */}
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={
                                  !usdtInput ||
                                  !!inputError ||
                                  needsApproval ||
                                  txStep === "buying" ||
                                  !saleInfo?.isActive ||
                                  !kycStatus?.isKycVerified
                                }
                                onClick={handleBuy}
                              >
                                {txStep === "buying" ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    购买中...
                                  </>
                                ) : needsApproval ? (
                                  "第二步：购买 PVC（需先授权）"
                                ) : (
                                  "购买 PVC"
                                )}
                              </Button>

                              {/* 私募未开放提示 */}
                              {saleInfo && !saleInfo.isActive && (
                                <p className="text-center text-sm text-gray-400">
                                  私募轮当前未开放
                                </p>
                              )}

                              {/* 合约未配置提示 */}
                              {saleInfo && !saleInfo.contractConfigured && (
                                <p className="text-center text-xs text-amber-500">
                                  合约地址未配置，功能暂不可用
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 风险提示 */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-semibold">投资风险提示</p>
                    <p>加密资产投资存在较高风险，请勿投入超过您承受范围的资金。私募轮代币有 3 个月锁仓期，锁仓期内无法转让。详见白皮书风险披露部分。</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 公募轮 ── */}
          <TabsContent value="public" className="space-y-6">
            <PublicSaleTab account={account} signer={signer} isConnected={isConnected} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── 公募轮子组件 ────────────────────────────────────────────────────────────
function PublicSaleTab({
  account,
  signer,
  isConnected,
}: {
  account: string | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
}) {
  const [usdtInput, setUsdtInput] = useState("");
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [currentAllowance, setCurrentAllowance] = useState("0");

  const { data: saleInfo, isLoading: saleLoading, refetch: refetchSaleInfo } =
    trpc.purchase.getPublicSaleInfo.useQuery(
      { walletAddress: account ?? undefined },
      { enabled: true, refetchInterval: 30_000 }
    );

  const recordPurchaseMutation = trpc.purchase.recordPurchase.useMutation();

  const { data: txConfirm } = trpc.purchase.confirmTransaction.useQuery(
    { txHash: txHash! },
    { enabled: !!txHash && txStep === "confirming", refetchInterval: 3000 }
  );

  useEffect(() => {
    if (!txConfirm) return;
    if (txConfirm.status === "confirmed") {
      setTxStep("success");
      toast.success("购买成功！PVC 代币已发送到您的钱包");
      refetchSaleInfo();
    } else if (txConfirm.status === "failed") {
      setTxStep("error");
      setTxError("链上交易执行失败，请检查合约状态");
    }
  }, [txConfirm, refetchSaleInfo]);

  const tokenPrice = parseFloat(saleInfo?.tokenPrice || "0.20");
  const usdtAmount = parseFloat(usdtInput) || 0;
  const pvcAmount = tokenPrice > 0 ? (usdtAmount / tokenPrice).toFixed(2) : "0";
  const minPurchase = parseFloat(saleInfo?.minPurchase || "100");
  const maxPurchase = parseFloat(saleInfo?.maxPurchase || "50000");
  const userBalance = parseFloat(saleInfo?.userUsdtBalance || "0");
  const inputError = usdtInput
    ? usdtAmount < minPurchase
      ? `最低购买 ${minPurchase} USDT`
      : usdtAmount > maxPurchase
      ? `最高购买 ${maxPurchase} USDT`
      : usdtAmount > userBalance
      ? `USDT 余额不足（当前 ${userBalance.toFixed(2)} USDT）`
      : null
    : null;
  const needsApproval = parseFloat(currentAllowance) < usdtAmount;

  const refreshAllowance = useCallback(async () => {
    if (!account || !USDT_ADDRESS || !PUBLIC_SALE_ADDRESS || !signer) return;
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const allowance = await usdt.allowance(account, PUBLIC_SALE_ADDRESS);
      setCurrentAllowance(ethers.formatUnits(allowance, decimals));
    } catch { /* 忽略 */ }
  }, [account, signer]);

  useEffect(() => { refreshAllowance(); }, [refreshAllowance]);

  const handleApprove = async () => {
    if (!signer || !USDT_ADDRESS || !PUBLIC_SALE_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员"); return;
    }
    if (!usdtInput || inputError) return;
    setTxStep("approving"); setTxError(null);
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const tx = await usdt.approve(PUBLIC_SALE_ADDRESS, ethers.parseUnits(usdtInput, decimals));
      toast.info("授权交易已提交，等待确认...", { duration: 5000 });
      await tx.wait();
      await refreshAllowance();
      setTxStep("approved");
      toast.success("USDT 授权成功！现在可以购买 PVC 了");
    } catch (err: unknown) {
      setTxStep("idle");
      if ((err as { code?: string }).code === "ACTION_REJECTED") toast.error("您已取消授权操作");
      else { setTxError("授权失败，请重试"); toast.error("USDT 授权失败，请重试"); }
    }
  };

  const handleBuy = async () => {
    if (!signer || !PUBLIC_SALE_ADDRESS || !USDT_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员"); return;
    }
    if (!usdtInput || inputError) return;
    setTxStep("buying"); setTxError(null);
    try {
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const decimals = await usdt.decimals();
      const usdtWei = ethers.parseUnits(usdtInput, decimals);
      const publicSale = new ethers.Contract(PUBLIC_SALE_ADDRESS, PUBLIC_SALE_ABI, signer);
      const tx = await publicSale.purchase(usdtWei);
      setTxHash(tx.hash); setTxStep("confirming");
      toast.info("购买交易已提交，等待链上确认...", { duration: 8000 });
      if (account) {
        recordPurchaseMutation.mutate({ walletAddress: account, txHash: tx.hash, usdtAmount: usdtInput, pvcAmount, saleType: "public" });
      }
    } catch (err: unknown) {
      setTxStep("idle");
      const error = err as { code?: string; reason?: string; message?: string };
      if (error.code === "ACTION_REJECTED") toast.error("您已取消购买操作");
      else { setTxError("购买失败，请检查余额和授权后重试"); toast.error("购买失败，请重试"); }
    }
  };

  const resetFlow = () => {
    setTxStep("idle"); setTxHash(null); setTxError(null); setUsdtInput("");
    refreshAllowance(); refetchSaleInfo();
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧：公募轮信息 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-blue-700">公募轮信息</CardTitle>
                {saleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <button onClick={() => refetchSaleInfo()} className="text-gray-400 hover:text-gray-600">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">代币价格</span>
                <span className="font-semibold">{saleInfo?.tokenPrice ?? "0.20"} USDT/PVC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最低购买</span>
                <span className="font-semibold">{saleInfo?.minPurchase ?? "100"} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最高购买</span>
                <span className="font-semibold">{saleInfo?.maxPurchase ?? "50,000"} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">锁仓期</span>
                <span className="font-semibold">无锁仓</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">状态</span>
                {saleInfo?.isActive ? (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">进行中</Badge>
                ) : (
                  <Badge variant="secondary">{saleInfo?.contractConfigured ? "已结束" : "即将开放"}</Badge>
                )}
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>募资进度</span>
                  <span>{saleInfo?.totalRaised ?? "0"} / {saleInfo?.hardCap ?? "200,000"} USDT</span>
                </div>
                <Progress value={saleInfo?.progressPercent ?? 0} className="h-2" />
                <p className="text-right text-xs text-gray-400 mt-1">{saleInfo?.progressPercent ?? 0}%</p>
              </div>
            </CardContent>
          </Card>

          {account && saleInfo && (
            <Card className="border-gray-200">
              <CardContent className="pt-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">USDT 余额</span>
                  <span className="font-semibold">{parseFloat(saleInfo.userUsdtBalance).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">已授权额度</span>
                  <span className="font-semibold">{parseFloat(currentAllowance).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">本轮已购</span>
                  <span className="font-semibold">{parseFloat(saleInfo.userPurchased).toFixed(2)} USDT</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：购买表单 */}
        <div className="lg:col-span-3">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-700">购买 PVC（公募）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isConnected && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Wallet className="w-10 h-10 text-gray-300" />
                  <p className="text-gray-500">请先连接钱包以参与购买</p>
                </div>
              )}
              {isConnected && (
                <>
                  {txStep === "success" && (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <CheckCircle2 className="w-14 h-14 text-blue-500" />
                      <div>
                        <p className="text-lg font-semibold text-blue-700">购买成功！</p>
                        <p className="text-sm text-gray-500 mt-1">{pvcAmount} PVC 已发送到您的钱包</p>
                      </div>
                      {txHash && (
                        <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          查看交易 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <Button onClick={resetFlow} variant="outline" size="sm">继续购买</Button>
                    </div>
                  )}
                  {txStep === "confirming" && (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <div>
                        <p className="text-base font-semibold">等待链上确认...</p>
                        <p className="text-sm text-gray-500 mt-1">通常需要 15-60 秒</p>
                      </div>
                      {txHash && (
                        <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          在浏览器中查看 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                  {txStep !== "success" && txStep !== "confirming" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">支付 USDT 金额</label>
                        <div className="relative">
                          <Input type="number" placeholder={`最低 ${minPurchase} USDT`} value={usdtInput}
                            onChange={(e) => { setUsdtInput(e.target.value); setTxStep("idle"); setTxError(null); }}
                            className={`pr-16 text-base ${inputError ? "border-red-400" : ""}`} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">USDT</span>
                        </div>
                        {inputError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {inputError}
                          </p>
                        )}
                      </div>
                      {usdtInput && !inputError && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">支付</span>
                            <span className="font-semibold">{usdtAmount.toFixed(2)} USDT</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">获得</span>
                            <span className="font-bold text-blue-700 text-base">{parseFloat(pvcAmount).toLocaleString()} PVC</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-blue-200">
                            <span>单价</span>
                            <span>{tokenPrice} USDT/PVC</span>
                          </div>
                        </div>
                      )}
                      {txError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{txError}
                        </div>
                      )}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${!needsApproval || txStep === "approved" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                            {!needsApproval || txStep === "approved" ? "✓" : "1"}
                          </div>
                          <span className={!needsApproval || txStep === "approved" ? "text-blue-600" : ""}>授权 USDT</span>
                          <div className="flex-1 h-px bg-gray-200" />
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-500">2</div>
                          <span>购买 PVC</span>
                        </div>
                        {needsApproval && txStep !== "approved" && (
                          <Button className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={!usdtInput || !!inputError || txStep === "approving" || !saleInfo?.isActive}
                            onClick={handleApprove}>
                            {txStep === "approving" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />授权中...</> : "第一步：授权 USDT"}
                          </Button>
                        )}
                        <Button className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={!usdtInput || !!inputError || needsApproval || txStep === "buying" || !saleInfo?.isActive}
                          onClick={handleBuy}>
                          {txStep === "buying" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />购买中...</> : needsApproval ? "第二步：购买 PVC（需先授权）" : "购买 PVC"}
                        </Button>
                        {saleInfo && !saleInfo.isActive && (
                          <p className="text-center text-sm text-gray-400">
                            {saleInfo.contractConfigured ? "公募轮当前未开放" : "公募轮合约尚未部署，敬请期待"}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-2 text-sm text-blue-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="font-semibold">公募轮说明</p>
              <p>公募轮无锁仓期，代币购买后可立即流通。公募价格高于私募价格，先到先得，募资额度有限。</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
