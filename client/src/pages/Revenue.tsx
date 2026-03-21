import { ArrowDown, Clock, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function Revenue() {
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const userPVCoin = 1000000;
  const totalPVCoin = 100000000;
  const holdingPercentage = (userPVCoin / totalPVCoin) * 100;
  const currentReward = 5234.56;
  const totalClaimed = 15703.42;

  const rewardHistory = [
    { month: "2026年2月", amount: 5234.56, status: "已领取", date: "2026-02-28" },
    { month: "2026年1月", amount: 4812.30, status: "已领取", date: "2026-01-31" },
    { month: "2025年12月", amount: 5656.56, status: "已领取", date: "2025-12-31" },
  ];

  const handleClaim = async () => {
    setIsLoading(true);
    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setClaimedAmount(claimedAmount + currentReward);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="container">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">收益分红</h1>
        <p className="text-gray-600 mb-12">
          持有 PV-Coin，每月自动获得电站运营收益分红
        </p>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* My PV-Coin */}
          <Card className="bg-white border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">我的 PV-Coin</p>
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {userPVCoin.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">枚</p>
          </Card>

          {/* Holding Percentage */}
          <Card className="bg-white border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">持币占比</p>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {holdingPercentage.toFixed(4)}%
            </p>
            <p className="text-xs text-gray-500">总供应量</p>
          </Card>

          {/* Current Reward */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">本月可领取</p>
              <ArrowDown className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 mb-1">
              ${currentReward.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">USDT</p>
          </Card>

          {/* Total Claimed */}
          <Card className="bg-white border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm font-medium">已领取总额</p>
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${totalClaimed.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">USDT</p>
          </Card>
        </div>

        {/* Claim Section */}
        <Card className="bg-white border-emerald-100 p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                领取本月分红
              </h3>
              <p className="text-gray-600 mb-4">
                点击下方按钮领取本月的 USDT 分红，分红将直接发送到您的钱包
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">待领取金额:</span>{" "}
                  <span className="text-emerald-600 font-bold">
                    ${currentReward.toFixed(2)} USDT
                  </span>
                </p>
              </div>
            </div>
            <Button
              onClick={handleClaim}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-lg font-semibold whitespace-nowrap"
            >
              {isLoading ? "处理中..." : "领取分红"}
            </Button>
          </div>
        </Card>

        {/* History */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">分红历史</h2>
          <div className="space-y-4">
            {rewardHistory.map((record, idx) => (
              <Card
                key={idx}
                className="bg-white border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{record.month}</p>
                    <p className="text-sm text-gray-500">{record.date}</p>
                  </div>
                  <div className="flex-1 text-center md:text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      ${record.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">USDT</p>
                  </div>
                  <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                    {record.status}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ 分红说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 分红每月自动计算，基于您在分红时间点持有的 PV-Coin 数量</li>
            <li>• 分红金额来自电站运营收益，通过智能合约自动分配</li>
            <li>• 领取分红需要支付少量 Gas 费用（由区块链网络收取）</li>
            <li>• 分红以 USDT 形式发放到您的钱包地址</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
