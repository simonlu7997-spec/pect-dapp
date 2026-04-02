import { useState, useMemo, useEffect } from "react";
import { ethers } from "ethers";
import { trpc } from "@/lib/trpc";
import { useWalletContext } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BarChart3, Wallet, TrendingUp, RefreshCw, ExternalLink,
  CheckCircle2, AlertCircle, Coins, ArrowUpRight, ArrowDownLeft,
} from "lucide-react";

// ─── 合约 ABI ───────────────────────────────────────────────────────────────
const STAKING_MANAGER_ABI = [
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimReward() external",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// ─── 环境变量 ────────────────────────────────────────────────────────────────
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";
const STAKING_MANAGER_ADDRESS = import.meta.env.VITE_STAKING_MANAGER_ADDRESS || "";
const C2_COIN_ADDRESS = import.meta.env.VITE_C2_COIN_ADDRESS || "";

// ─── 工具函数 ────────────────────────────────────────────────────────────────
function formatAmount(amount: string | null | undefined, decimals = 4) {
  if (!amount) return "0";
  const n = parseFloat(amount);
  if (isNaN(n)) return "0";
  return n.toLocaleString("zh-CN", { maximumFractionDigits: decimals });
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function Staking() {
  const { account: address, isConnected, signer } = useWalletContext();
  const walletAddress = useMemo(() => address || "", [address]);

  // ── 质押状态 ──
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakeTxHash, setStakeTxHash] = useState<string | null>(null);
  const [stakeTxType, setStakeTxType] = useState<"stake" | "unstake" | "claim" | null>(null);
  const [isStakeProcessing, setIsStakeProcessing] = useState(false);

  // ── 质押查询 ──
  const { data: stakingInfo, isLoading: stakingLoading, refetch: refetchStaking } =
    trpc.staking.getStakingInfo.useQuery({ walletAddress }, { enabled: !!walletAddress, refetchInterval: 30_000 });

  const { data: stakingHistory, refetch: refetchStakingHistory } =
    trpc.staking.getStakingHistory.useQuery({ walletAddress }, { enabled: !!walletAddress });

  const recordStakingTx = trpc.staking.recordStakingTx.useMutation();

  // ── 质押操作 ──
  const handleStake = async () => {
    if (!signer || !STAKING_MANAGER_ADDRESS || !C2_COIN_ADDRESS) {
      toast.error("合约地址未配置，请联系管理员"); return;
    }
    const amount = parseFloat(stakeAmount);
    if (!stakeAmount || isNaN(amount) || amount <= 0) { toast.error("请输入有效的质押数量"); return; }
    const available = parseFloat(stakingInfo?.c2Balance || "0");
    if (amount > available) { toast.error(`余额不足，当前可用 ${formatAmount(stakingInfo?.c2Balance, 2)} C2C`); return; }

    setIsStakeProcessing(true); setStakeTxType("stake");
    try {
      const amountWei = ethers.parseUnits(stakeAmount, 18);
      const c2Coin = new ethers.Contract(C2_COIN_ADDRESS, ERC20_ABI, signer);
      const currentAllowance = BigInt(ethers.parseUnits(stakingInfo?.c2Allowance || "0", 18).toString());
      if (currentAllowance < amountWei) {
        toast.info("请在钱包中确认 C2-Coin 授权...");
        const approveTx = await c2Coin.approve(STAKING_MANAGER_ADDRESS, amountWei);
        await approveTx.wait(1);
        toast.success("授权成功，正在提交质押...");
      }
      const stakingManager = new ethers.Contract(STAKING_MANAGER_ADDRESS, STAKING_MANAGER_ABI, signer);
      toast.info("请在钱包中确认质押交易...");
      const tx = await stakingManager.stake(amountWei);
      setStakeTxHash(tx.hash);
      toast.info("交易已提交，等待链上确认...");
      await recordStakingTx.mutateAsync({ walletAddress, txHash: tx.hash, txType: "stake", amount: stakeAmount, tokenSymbol: "C2C" });
      await tx.wait(1);
      toast.success(`成功质押 ${stakeAmount} C2C！`);
      setStakeAmount(""); refetchStaking(); refetchStakingHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "交易失败";
      if (msg.includes("user rejected")) toast.error("已取消交易");
      else toast.error(`质押失败：${msg.slice(0, 80)}`);
    } finally { setIsStakeProcessing(false); setStakeTxType(null); }
  };

  const handleUnstake = async () => {
    if (!signer || !STAKING_MANAGER_ADDRESS) { toast.error("合约地址未配置"); return; }
    const amount = parseFloat(unstakeAmount);
    if (!unstakeAmount || isNaN(amount) || amount <= 0) { toast.error("请输入有效的解除质押数量"); return; }
    const staked = parseFloat(stakingInfo?.stakedAmount || "0");
    if (amount > staked) { toast.error(`超出已质押数量，当前已质押 ${formatAmount(stakingInfo?.stakedAmount, 2)} C2C`); return; }

    setIsStakeProcessing(true); setStakeTxType("unstake");
    try {
      const amountWei = ethers.parseUnits(unstakeAmount, 18);
      const stakingManager = new ethers.Contract(STAKING_MANAGER_ADDRESS, STAKING_MANAGER_ABI, signer);
      toast.info("请在钱包中确认解除质押交易...");
      const tx = await stakingManager.unstake(amountWei);
      setStakeTxHash(tx.hash);
      await recordStakingTx.mutateAsync({ walletAddress, txHash: tx.hash, txType: "unstake", amount: unstakeAmount, tokenSymbol: "C2C" });
      await tx.wait(1);
      toast.success(`成功解除质押 ${unstakeAmount} C2C！`);
      setUnstakeAmount(""); refetchStaking(); refetchStakingHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "交易失败";
      if (msg.includes("user rejected")) toast.error("已取消交易");
      else toast.error(`解除质押失败：${msg.slice(0, 80)}`);
    } finally { setIsStakeProcessing(false); setStakeTxType(null); }
  };

  const handleClaimReward = async () => {
    if (!signer || !STAKING_MANAGER_ADDRESS) { toast.error("合约地址未配置"); return; }
    if (!stakingInfo?.pendingReward || parseFloat(stakingInfo.pendingReward) <= 0) { toast.error("暂无可领取的奖励"); return; }

    setIsStakeProcessing(true); setStakeTxType("claim");
    try {
      const stakingManager = new ethers.Contract(STAKING_MANAGER_ADDRESS, STAKING_MANAGER_ABI, signer);
      toast.info("请在钱包中确认领取奖励交易...");
      const tx = await stakingManager.claimReward();
      setStakeTxHash(tx.hash);
      await recordStakingTx.mutateAsync({ walletAddress, txHash: tx.hash, txType: "claim_reward", amount: stakingInfo.pendingReward, tokenSymbol: "USDT" });
      await tx.wait(1);
      toast.success("质押奖励领取成功！USDT 已到账");
      refetchStaking(); refetchStakingHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "交易失败";
      if (msg.includes("user rejected")) toast.error("已取消交易");
      else toast.error(`领取失败：${msg.slice(0, 80)}`);
    } finally { setIsStakeProcessing(false); setStakeTxType(null); }
  };

  // ── 未连接钱包 ──
  if (!isConnected || !walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-emerald-200">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">连接钱包参与质押</h2>
            <p className="text-gray-500 text-sm">请先连接您的钱包，质押 C2-Coin 获取 USDT 奖励。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container max-w-4xl py-10 space-y-8">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">C2-Coin 质押</h1>
            <p className="text-gray-500 mt-1">质押 C2-Coin 获取 USDT 奖励</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchStaking(); refetchStakingHistory(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" />刷新
          </Button>
        </div>

        {/* 合约未配置提示 */}
        {stakingInfo && !stakingInfo.contractConfigured && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              StakingManager 合约地址尚未配置。请在环境变量中设置{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_STAKING_MANAGER_ADDRESS</code> 和{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_C2_COIN_ADDRESS</code>。
            </p>
          </div>
        )}

        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "C2C 余额", value: stakingInfo?.c2Balance, unit: "C2C", icon: <Coins className="w-3.5 h-3.5" />, color: "" },
            { label: "已质押", value: stakingInfo?.stakedAmount, unit: "C2C", icon: <BarChart3 className="w-3.5 h-3.5" />, color: "bg-gradient-to-br from-blue-50 to-indigo-50" },
            { label: "待领取奖励", value: stakingInfo?.pendingReward, unit: "USDT", icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-gradient-to-br from-emerald-50 to-teal-50" },
            { label: "年化收益率", value: stakingInfo?.apy || "12", unit: "%", icon: <TrendingUp className="w-3.5 h-3.5" />, color: "" },
          ].map(({ label, value, unit, icon, color }) => (
            <Card key={label} className={`border-emerald-200 ${color}`}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-xs">{icon} {label}</CardDescription>
              </CardHeader>
              <CardContent>
                {stakingLoading ? <Skeleton className="h-8 w-24" /> : (
                  <><p className="text-2xl font-bold text-gray-900">{formatAmount(value, 2)}</p><p className="text-xs text-gray-400">{unit}</p></>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 领取奖励横幅 */}
        {stakingInfo && parseFloat(stakingInfo.pendingReward || "0") > 0 && (
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">可领取质押奖励</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{formatAmount(stakingInfo.pendingReward, 2)} USDT</p>
                </div>
                <Button onClick={handleClaimReward} disabled={isStakeProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg font-semibold" size="lg">
                  {isStakeProcessing && stakeTxType === "claim" ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />领取中...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5 mr-2" />领取奖励</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 交易进行中提示 */}
        {stakeTxHash && isStakeProcessing && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-800 font-medium">交易确认中</p>
              <p className="text-xs text-blue-600 font-mono truncate">{stakeTxHash}</p>
            </div>
            <a href={`${EXPLORER_URL}/tx/${stakeTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex-shrink-0">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* 质押/解质押操作 */}
        <Tabs defaultValue="stake">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="stake" className="gap-1.5"><ArrowUpRight className="w-4 h-4" />质押</TabsTrigger>
            <TabsTrigger value="unstake" className="gap-1.5"><ArrowDownLeft className="w-4 h-4" />解除质押</TabsTrigger>
          </TabsList>

          <TabsContent value="stake">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>质押 C2-Coin</CardTitle>
                <CardDescription>质押您的 C2-Coin 以获取 USDT 奖励（年化 {stakingInfo?.apy || "12"}%）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stake-amount">质押数量</Label>
                  <div className="flex gap-2">
                    <Input id="stake-amount" type="number" placeholder="输入质押数量" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="flex-1" min="0" />
                    <Button variant="outline" onClick={() => setStakeAmount(stakingInfo?.c2Balance || "0")} className="whitespace-nowrap">全部</Button>
                  </div>
                  <p className="text-xs text-gray-400">可用余额：{formatAmount(stakingInfo?.c2Balance, 2)} C2C</p>
                </div>
                {stakeAmount && parseFloat(stakeAmount) > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-1 text-sm">
                    <p className="text-blue-800 font-medium">预计收益</p>
                    <p className="text-blue-600">年化收益：约 {(parseFloat(stakeAmount) * parseFloat(stakingInfo?.apy || "12") / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} USDT/年</p>
                    <p className="text-xs text-blue-400">（实际收益取决于电站发电量和代币价格）</p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 space-y-1">
                  <p>• 质押前需要先授权 C2-Coin（首次质押时自动触发）</p>
                  <p>• 质押后可随时解除，无锁定期</p>
                  <p>• 奖励每月结算，可随时领取</p>
                </div>
                <Button onClick={handleStake} disabled={isStakeProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0 || !stakingInfo?.contractConfigured} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold" size="lg">
                  {isStakeProcessing && stakeTxType === "stake" ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />质押中...</>
                  ) : (
                    <><ArrowUpRight className="w-5 h-5 mr-2" />质押 C2-Coin</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unstake">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>解除质押</CardTitle>
                <CardDescription>取回您已质押的 C2-Coin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="unstake-amount">解除数量</Label>
                  <div className="flex gap-2">
                    <Input id="unstake-amount" type="number" placeholder="输入解除质押数量" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} className="flex-1" min="0" />
                    <Button variant="outline" onClick={() => setUnstakeAmount(stakingInfo?.stakedAmount || "0")} className="whitespace-nowrap">全部</Button>
                  </div>
                  <p className="text-xs text-gray-400">已质押：{formatAmount(stakingInfo?.stakedAmount, 2)} C2C</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700 space-y-1">
                  <p className="font-medium">注意</p>
                  <p>解除质押后，待领取的奖励仍可继续领取。建议先领取奖励再解除质押。</p>
                </div>
                <Button onClick={handleUnstake} disabled={isStakeProcessing || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || !stakingInfo?.contractConfigured} className="w-full py-6 text-lg font-semibold" variant="outline" size="lg">
                  {isStakeProcessing && stakeTxType === "unstake" ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />解除中...</>
                  ) : (
                    <><ArrowDownLeft className="w-5 h-5 mr-2" />解除质押</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 质押历史 */}
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle>质押历史</CardTitle>
            <CardDescription>质押、解质押和奖励领取记录</CardDescription>
          </CardHeader>
          <CardContent>
            {!stakingHistory || stakingHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>暂无质押记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stakingHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.status === "confirmed" ? "bg-emerald-500" : tx.status === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {tx.txType === "stake" ? "质押" : tx.txType === "unstake" ? "解除质押" : "领取奖励"}{" "}
                          <span className={`font-bold ${tx.txType === "unstake" ? "text-red-600" : "text-emerald-600"}`}>
                            {tx.txType === "unstake" ? "-" : "+"}{formatAmount(tx.amount, 2)} {tx.tokenSymbol}
                          </span>
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
