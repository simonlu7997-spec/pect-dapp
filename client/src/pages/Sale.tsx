import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Clock, Lock, Unlock } from "lucide-react";

export default function Sale() {
  const [privateAmount, setPrivateAmount] = useState("");
  const [publicAmount, setPublicAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const privateSale = {
    rate: 0.5, // 1 USDT = 0.5 PVCoin
    totalCap: 10000000,
    sold: 6500000,
    individualCap: 100000,
    userContribution: 50000,
    status: "进行中",
    endDate: "2026-03-31",
  };

  const publicSale = {
    rate: 0.4, // 1 USDT = 0.4 PVCoin
    totalCap: 15000000,
    sold: 8000000,
    status: "未开始",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
  };

  const handlePrivatePurchase = async () => {
    if (!privateAmount) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPrivateAmount("");
    setIsLoading(false);
  };

  const handlePublicPurchase = async () => {
    if (!publicAmount) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPublicAmount("");
    setIsLoading(false);
  };

  const privateProgress = (privateSale.sold / privateSale.totalCap) * 100;
  const publicProgress = (publicSale.sold / publicSale.totalCap) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="container">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">代币销售</h1>
        <p className="text-gray-600 mb-12">
          参与私募或公募，获得 PV-Coin
        </p>

        {/* Private Sale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Card className="bg-white border-emerald-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">私募 (Whitelist)</h3>
                <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                  {privateSale.status}
                </div>
              </div>

              <div className="space-y-6 mb-8">
                {/* Rate */}
                <div>
                  <p className="text-gray-600 text-sm mb-2">兑换率</p>
                  <p className="text-3xl font-bold text-gray-900">
                    1 USDT = {privateSale.rate} PV-Coin
                  </p>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-gray-600 text-sm">销售进度</p>
                    <p className="text-gray-900 font-semibold">
                      {(privateSale.sold / 1000000).toFixed(1)}M / {(privateSale.totalCap / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all"
                      style={{ width: `${privateProgress}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {privateProgress.toFixed(1)}% 已售出
                  </p>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-gray-600 text-xs mb-1">个人额度</p>
                    <p className="text-xl font-bold text-gray-900">
                      {privateSale.individualCap.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">PV-Coin</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-gray-600 text-xs mb-1">我已购买</p>
                    <p className="text-xl font-bold text-gray-900">
                      {privateSale.userContribution.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">PV-Coin</p>
                  </div>
                </div>
              </div>

              {/* Purchase Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    购买金额 (USDT)
                  </label>
                  <Input
                    type="number"
                    placeholder="输入 USDT 金额"
                    value={privateAmount}
                    onChange={(e) => setPrivateAmount(e.target.value)}
                  />
                  {privateAmount && (
                    <p className="text-sm text-emerald-600 mt-2">
                      将获得 {(parseInt(privateAmount) * privateSale.rate).toLocaleString()} PV-Coin
                    </p>
                  )}
                </div>
                <Button
                  onClick={handlePrivatePurchase}
                  disabled={isLoading || !privateAmount}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-lg font-semibold"
                >
                  {isLoading ? "处理中..." : "购买"}
                </Button>
              </div>
            </Card>
          </div>

          {/* End Date */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-amber-600" />
              <h4 className="text-lg font-semibold text-gray-900">销售截止</h4>
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-2">
              {privateSale.endDate}
            </p>
            <p className="text-gray-600 text-sm mb-6">
              私募销售将在此日期结束
            </p>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">剩余配额</p>
              <p className="text-2xl font-bold text-gray-900">
                {(privateSale.totalCap - privateSale.sold).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">PV-Coin</p>
            </div>
          </Card>
        </div>

        {/* Public Sale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Card className="bg-white border-gray-200 p-8 opacity-75">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">公募 (Open)</h3>
                <div className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                  {publicSale.status}
                </div>
              </div>

              <div className="space-y-6 mb-8">
                {/* Rate */}
                <div>
                  <p className="text-gray-600 text-sm mb-2">兑换率</p>
                  <p className="text-3xl font-bold text-gray-900">
                    1 USDT = {publicSale.rate} PV-Coin
                  </p>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-gray-600 text-sm">销售进度</p>
                    <p className="text-gray-900 font-semibold">
                      {(publicSale.sold / 1000000).toFixed(1)}M / {(publicSale.totalCap / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-gray-400 to-gray-500 h-3 rounded-full transition-all"
                      style={{ width: `${publicProgress}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {publicProgress.toFixed(1)}% 已售出
                  </p>
                </div>

                {/* Coming Soon */}
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
                  <Unlock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    公募将于 {publicSale.startDate} 开始
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    敬请期待
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Timeline */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-semibold text-gray-900">销售时间表</h4>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-amber-500 pl-4">
                <p className="text-sm font-semibold text-gray-900">私募</p>
                <p className="text-xs text-gray-600">进行中 - {privateSale.endDate}</p>
              </div>
              <div className="border-l-4 border-gray-300 pl-4">
                <p className="text-sm font-semibold text-gray-900">公募</p>
                <p className="text-xs text-gray-600">{publicSale.startDate} - {publicSale.endDate}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ 销售说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 私募仅向白名单用户开放，需要 KYC 认证</li>
            <li>• 公募将向所有用户开放，无需白名单</li>
            <li>• 购买需要支付 USDT，将直接发送到您的钱包</li>
            <li>• 所有购买操作需要支付少量 Gas 费用</li>
            <li>• 购买后的 PV-Coin 可立即用于领取分红</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
