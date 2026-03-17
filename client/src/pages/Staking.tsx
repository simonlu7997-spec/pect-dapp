import { ArrowUp, ArrowDown, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Staking() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const c2CoinBalance = 50000;
  const stakedAmount = 25000;
  const totalStaked = 25000000;
  const monthlyReward = 1234.56;
  const apy = 45;

  const handleStake = async () => {
    if (!stakeAmount) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setStakeAmount("");
    setIsLoading(false);
  };

  const handleUnstake = async () => {
    if (!unstakeAmount) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setUnstakeAmount("");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="container">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">质押 C2-Coin</h1>
        <p className="text-gray-600 mb-12">
          质押 C2-Coin 获得每月 USDT 奖励
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* C2-Coin Balance */}
          <Card className="bg-white border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">我的 C2-Coin</p>
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {c2CoinBalance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">可用余额</p>
          </Card>

          {/* Staked Amount */}
          <Card className="bg-white border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">已质押</p>
              <ArrowUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stakedAmount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">C2-Coin</p>
          </Card>

          {/* APY */}
          <Card className="bg-white border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">年化收益率</p>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 mb-1">
              {apy}%
            </p>
            <p className="text-xs text-gray-500">APY</p>
          </Card>

          {/* Monthly Reward */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">本月待领取</p>
              <ArrowDown className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 mb-1">
              ${monthlyReward.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">USDT</p>
          </Card>
        </div>

        {/* Stake/Unstake Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Stake Card */}
          <Card className="bg-white border-emerald-100 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">质押 C2-Coin</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  质押数量
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="输入质押数量"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setStakeAmount(c2CoinBalance.toString())}
                    className="px-4"
                  >
                    全部
                  </Button>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">可用余额:</span>
                  <span className="font-semibold text-gray-900">
                    {c2CoinBalance.toLocaleString()} C2-Coin
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">预期年收益:</span>
                  <span className="font-semibold text-emerald-600">
                    ${((parseInt(stakeAmount || "0") * apy) / 100).toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <Button
                onClick={handleStake}
                disabled={isLoading || !stakeAmount}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-lg font-semibold"
              >
                {isLoading ? "处理中..." : "质押"}
              </Button>
            </div>
          </Card>

          {/* Unstake Card */}
          <Card className="bg-white border-emerald-100 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">解除质押</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  解押数量
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="输入解押数量"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setUnstakeAmount(stakedAmount.toString())}
                    className="px-4"
                  >
                    全部
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">已质押:</span>
                  <span className="font-semibold text-gray-900">
                    {stakedAmount.toLocaleString()} C2-Coin
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">解押后余额:</span>
                  <span className="font-semibold text-gray-900">
                    {(stakedAmount - parseInt(unstakeAmount || "0")).toLocaleString()} C2-Coin
                  </span>
                </div>
              </div>

              <Button
                onClick={handleUnstake}
                disabled={isLoading || !unstakeAmount}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg rounded-lg font-semibold"
              >
                {isLoading ? "处理中..." : "解除质押"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Claim Rewards */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                领取质押奖励
              </h3>
              <p className="text-gray-600 mb-4">
                每月自动计算您的质押奖励，点击下方按钮领取
              </p>
              <div className="text-3xl font-bold text-emerald-600">
                ${monthlyReward.toFixed(2)} USDT
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-lg font-semibold whitespace-nowrap">
              领取奖励
            </Button>
          </div>
        </Card>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ 质押说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 质押 C2-Coin 可获得每月 USDT 奖励</li>
            <li>• 奖励在每月月度发放周期内进行计算和发放</li>
            <li>• 可随时解除质押，无锁定期限制</li>
            <li>• 质押和解押操作需要支付少量 Gas 费用</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
