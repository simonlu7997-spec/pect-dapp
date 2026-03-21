import { TrendingUp, Zap, Flame, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, PieChart as PieChartComponent, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Analytics() {
  // Mock data for power station
  const powerStationData = {
    monthlyGeneration: 487884,
    monthlyRevenue: 541412,
    monthlyProfit: 387346,
    cumulativeCO2: 383,
  };

  // Mock data for generation trend (past 12 months)
  const generationTrendData = [
    { month: "2025-03", generation: 420000 },
    { month: "2025-04", generation: 450000 },
    { month: "2025-05", generation: 480000 },
    { month: "2025-06", generation: 510000 },
    { month: "2025-07", generation: 520000 },
    { month: "2025-08", generation: 515000 },
    { month: "2025-09", generation: 490000 },
    { month: "2025-10", generation: 470000 },
    { month: "2025-11", generation: 450000 },
    { month: "2025-12", generation: 460000 },
    { month: "2026-01", generation: 475000 },
    { month: "2026-02", generation: 487884 },
  ];

  // Mock data for revenue trend (past 12 months)
  const revenueTrendData = [
    { month: "2025-03", revenue: 480000 },
    { month: "2025-04", revenue: 510000 },
    { month: "2025-05", revenue: 540000 },
    { month: "2025-06", revenue: 570000 },
    { month: "2025-07", revenue: 580000 },
    { month: "2025-08", revenue: 575000 },
    { month: "2025-09", revenue: 550000 },
    { month: "2025-10", revenue: 530000 },
    { month: "2025-11", revenue: 510000 },
    { month: "2025-12", revenue: 520000 },
    { month: "2026-01", revenue: 535000 },
    { month: "2026-02", revenue: 541412 },
  ];

  // Mock data for C2-Coin buyback
  const c2CoinBuybackData = {
    monthlyBudget: 224,
    monthlyBought: 22400,
    monthlyBurned: 22400,
    cumulativeBurned: 269000,
  };

  // Mock data for buyback history
  const buybackHistory = [
    { date: "2026-03", quantity: 22400, txHash: "0x1234...5678" },
    { date: "2026-02", quantity: 22400, txHash: "0x2345...6789" },
    { date: "2026-01", quantity: 22400, txHash: "0x3456...7890" },
  ];

  // Token distribution data
  const tokenDistribution = [
    { name: "私募", value: 20, status: "已完成" },
    { name: "公募", value: 50, status: "进行中" },
    { name: "项目储备", value: 15, status: "锁仓中" },
    { name: "团队激励", value: 10, status: "锁仓中" },
    { name: "生态发展", value: 5, status: "已分配" },
  ];

  const COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

  // Market data
  const marketData = {
    pvCoinPrice: 0.10,
    c2CoinPrice: 0.0095,
    volume24h: 12500,
    liquidity: 50000,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="container">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">数据分析</h1>
        <p className="text-gray-600 mb-12">
          项目运营数据、C2-Coin 回购销毁记录
        </p>

        {/* Power Station Data */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">电站运营数据</h2>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">本月发电量</p>
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {(powerStationData.monthlyGeneration / 1000).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">kWh</p>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">本月电费收入</p>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {(powerStationData.monthlyRevenue / 1000).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">RMB (万元)</p>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">本月可分配利润</p>
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {(powerStationData.monthlyProfit / 1000).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">RMB (万元)</p>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">累计碳减排</p>
                <Flame className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600 mb-1">
                {powerStationData.cumulativeCO2}
              </p>
              <p className="text-xs text-gray-500">tons CO2</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Generation Trend */}
            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">发电量趋势（过去 12 个月）</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="generation" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue Trend */}
            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">收入趋势（过去 12 个月）</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* C2-Coin Buyback */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">C2-Coin 回购销毁</h2>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border-emerald-100 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">本月回购预算</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {c2CoinBuybackData.monthlyBudget}
              </p>
              <p className="text-xs text-gray-500">USDT</p>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">本月回购数量</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {(c2CoinBuybackData.monthlyBought / 1000).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">K C2C</p>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">本月销毁数量</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {(c2CoinBuybackData.monthlyBurned / 1000).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">K C2C</p>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">累计回购销毁</p>
              <p className="text-3xl font-bold text-emerald-600 mb-1">
                {(c2CoinBuybackData.cumulativeBurned / 1000).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">K C2C</p>
            </Card>
          </div>

          {/* Buyback History Table */}
          <Card className="bg-white border-emerald-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">回购销毁历史</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">日期</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">数量</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">交易哈希</th>
                  </tr>
                </thead>
                <tbody>
                  {buybackHistory.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-emerald-50">
                      <td className="py-3 px-4 text-gray-900">{item.date}</td>
                      <td className="py-3 px-4 text-gray-900">{(item.quantity / 1000).toFixed(0)}K C2C</td>
                      <td className="py-3 px-4 text-emerald-600 font-mono text-xs">{item.txHash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Token Distribution */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">代币分布</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">分布比例</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChartComponent>
                  <Pie
                    data={tokenDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tokenDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChartComponent>
              </ResponsiveContainer>
            </Card>

            {/* Distribution Details */}
            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">分布详情</h3>
              <div className="space-y-3">
                {tokenDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.status}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{item.value}%</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Market Data */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">市场数据</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-emerald-100 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">PV-Coin 价格</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${marketData.pvCoinPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">参考价</p>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">C2-Coin 价格</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${marketData.c2CoinPrice.toFixed(4)}
              </p>
              <p className="text-xs text-gray-500">实时价格</p>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">24h 成交量</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${marketData.volume24h.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">USDT</p>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">流动性</p>
              <p className="text-3xl font-bold text-emerald-600 mb-1">
                ${marketData.liquidity.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Uniswap</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
