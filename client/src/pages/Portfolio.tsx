import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowDownLeft, Wallet } from 'lucide-react';

/**
 * Portfolio Page - 资产页面
 * 
 * 功能：
 * - 显示用户持仓（PVCoin、C2Coin）
 * - 显示待领取的 C2Coin 奖励
 * - 显示待领取的 USDT 分红
 * - 显示待领取的质押奖励
 * - 提供领取按钮
 */

// 模拟分红历史数据
const mockDividendHistory = [
  { month: '2026-02', amount: 114, status: '已领取' },
  { month: '2026-01', amount: 114, status: '已领取' },
  { month: '2025-12', amount: 114, status: '已领取' },
  { month: '2025-11', amount: 110, status: '已领取' },
];

const chartData = mockDividendHistory.map(item => ({
  month: item.month.split('-')[1],
  amount: item.amount,
}));

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState('overview');
  const [userAddress, setUserAddress] = useState<string>('');
  const [pvCoinBalance, setPvCoinBalance] = useState('100,000');
  const [c2CoinBalance, setC2CoinBalance] = useState('8,496');
  const [usdtBalance, setUsdtBalance] = useState('10,085');

  // C2Coin 领取相关
  const [c2CoinReward, setC2CoinReward] = useState('123.45');
  const [c2CoinClaimed, setC2CoinClaimed] = useState(false);
  const [c2CoinLoading, setC2CoinLoading] = useState(false);

  // 分红领取相关
  const [revenueReward, setRevenueReward] = useState('114.00');
  const [revenueClaimed, setRevenueClaimed] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);

  // 质押奖励领取相关
  const [stakingReward, setStakingReward] = useState('85.67');
  const [stakingClaimed, setStakingClaimed] = useState(false);
  const [stakingLoading, setStakingLoading] = useState(false);

  useEffect(() => {
    // 模拟获取用户地址
    const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    setUserAddress(mockAddress);
  }, []);

  const handleClaimC2Coin = async () => {
    setC2CoinLoading(true);
    try {
      // 实际实现时，这里会调用合约的 claimC2Coin 函数
      await new Promise(resolve => setTimeout(resolve, 1000));
      setC2CoinClaimed(true);
      setC2CoinReward('0.00');
      setC2CoinBalance('8,619.45');
    } catch (error) {
      console.error('Failed to claim C2Coin:', error);
    } finally {
      setC2CoinLoading(false);
    }
  };

  const handleClaimRevenue = async () => {
    setRevenueLoading(true);
    try {
      // 实际实现时，这里会调用合约的 claimRevenue 函数
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRevenueClaimed(true);
      setRevenueReward('0.00');
      setUsdtBalance('10,199');
    } catch (error) {
      console.error('Failed to claim revenue:', error);
    } finally {
      setRevenueLoading(false);
    }
  };

  const handleClaimStakingReward = async () => {
    setStakingLoading(true);
    try {
      // 实际实现时，这里会调用合约的 claimStakingReward 函数
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStakingClaimed(true);
      setStakingReward('0.00');
      setUsdtBalance('10,284.67');
    } catch (error) {
      console.error('Failed to claim staking reward:', error);
    } finally {
      setStakingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12">
      <div className="container max-w-6xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">我的资产</h1>
          <p className="text-emerald-700">管理您的持仓和领取奖励</p>
        </div>

        {/* 用户地址卡片 */}
        <Card className="mb-6 border-emerald-200 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-gray-600">钱包地址</p>
                <p className="font-mono text-sm text-emerald-900">{userAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="c2coin">C2Coin 领取</TabsTrigger>
            <TabsTrigger value="revenue">分红领取</TabsTrigger>
            <TabsTrigger value="staking">质押奖励</TabsTrigger>
          </TabsList>

          {/* 总览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 资产概览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PVCoin 余额 */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">PVCoin 余额</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">{pvCoinBalance}</div>
                  <p className="text-xs text-gray-500 mt-1">PVC</p>
                </CardContent>
              </Card>

              {/* C2Coin 余额 */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">C2Coin 余额</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">{c2CoinBalance}</div>
                  <p className="text-xs text-gray-500 mt-1">C2C</p>
                </CardContent>
              </Card>

              {/* USDT 余额 */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">总资产价值</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900">{usdtBalance}</div>
                  <p className="text-xs text-gray-500 mt-1">USDT</p>
                </CardContent>
              </Card>
            </div>

            {/* 待领取奖励汇总 */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg">待领取奖励汇总</CardTitle>
                <CardDescription>本月可领取的所有奖励</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                    <div>
                      <p className="text-sm text-gray-600">C2Coin 奖励</p>
                      <p className="text-xl font-bold text-emerald-900">{c2CoinReward}</p>
                    </div>
                    <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                    <div>
                      <p className="text-sm text-gray-600">分红</p>
                      <p className="text-xl font-bold text-emerald-900">{revenueReward}</p>
                    </div>
                    <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                    <div>
                      <p className="text-sm text-gray-600">质押奖励</p>
                      <p className="text-xl font-bold text-emerald-900">{stakingReward}</p>
                    </div>
                    <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 收益趋势图 */}
            <Card className="border-2 border-emerald-200">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                <CardTitle className="text-emerald-700">收益趋势</CardTitle>
                <CardDescription>过去 4 个月的月度分红趋势</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `${value} USDT`}
                      contentStyle={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="月度分红"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* C2Coin 领取标签页 */}
          <TabsContent value="c2coin">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>C2Coin 月度奖励领取</CardTitle>
                <CardDescription>领取本月的 C2Coin 碳信用奖励</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">待领取金额</p>
                    <p className="text-3xl font-bold text-emerald-900">{c2CoinReward}</p>
                    <p className="text-xs text-gray-500 mt-1">C2C</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">领取状态</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {c2CoinClaimed ? '✓ 已领取' : '待领取'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>说明：</strong>C2Coin 是基于光伏电站碳减排量发行的代币。每月根据您持有的 PVCoin 比例分配 C2Coin 奖励。
                  </p>
                </div>

                <Button
                  onClick={handleClaimC2Coin}
                  disabled={c2CoinClaimed || c2CoinLoading || parseFloat(c2CoinReward) === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {c2CoinLoading ? '领取中...' : c2CoinClaimed ? '已领取' : '领取 C2Coin'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 分红领取标签页 */}
          <TabsContent value="revenue">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>USDT 月度分红领取</CardTitle>
                <CardDescription>领取本月的电站收益分红</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">待领取金额</p>
                    <p className="text-3xl font-bold text-emerald-900">{revenueReward}</p>
                    <p className="text-xs text-gray-500 mt-1">USDT</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">领取状态</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {revenueClaimed ? '✓ 已领取' : '待领取'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>说明：</strong>分红来自光伏电站的电费收入。每月根据您持有的 PVCoin 比例分配 USDT 分红。
                  </p>
                </div>

                <Button
                  onClick={handleClaimRevenue}
                  disabled={revenueClaimed || revenueLoading || parseFloat(revenueReward) === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {revenueLoading ? '领取中...' : revenueClaimed ? '已领取' : '领取分红'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 质押奖励标签页 */}
          <TabsContent value="staking">
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle>质押奖励领取</CardTitle>
                <CardDescription>领取本月的 C2Coin 质押奖励</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">待领取金额</p>
                    <p className="text-3xl font-bold text-emerald-900">{stakingReward}</p>
                    <p className="text-xs text-gray-500 mt-1">USDT</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-600 mb-1">领取状态</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {stakingClaimed ? '✓ 已领取' : '待领取'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>说明：</strong>质押奖励来自 C2Coin 质押收益。每月根据您质押的 C2Coin 数量分配 USDT 奖励。
                  </p>
                </div>

                <Button
                  onClick={handleClaimStakingReward}
                  disabled={stakingClaimed || stakingLoading || parseFloat(stakingReward) === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {stakingLoading ? '领取中...' : stakingClaimed ? '已领取' : '领取奖励'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
