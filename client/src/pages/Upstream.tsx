import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, Zap, Leaf, Wind } from "lucide-react";

export default function Upstream() {
  // Mock data for power generation
  const powerData = [
    { month: "1月", power: 45000, co2: 22500 },
    { month: "2月", power: 52000, co2: 26000 },
    { month: "3月", power: 58000, co2: 29000 },
    { month: "4月", power: 62000, co2: 31000 },
    { month: "5月", power: 68000, co2: 34000 },
    { month: "6月", power: 72000, co2: 36000 },
  ];

  const monthlyData = [
    { name: "发电量", value: 72000 },
    { name: "碳信用", value: 36000 },
  ];

  const colors = ["#10b981", "#14b8a6"];

  const stats = [
    {
      icon: <Zap className="w-8 h-8 text-emerald-600" />,
      label: "本月发电量",
      value: "72,000",
      unit: "kWh",
    },
    {
      icon: <Leaf className="w-8 h-8 text-emerald-600" />,
      label: "本月碳信用",
      value: "36,000",
      unit: "吨 CO₂",
    },
    {
      icon: <Wind className="w-8 h-8 text-emerald-600" />,
      label: "实时电价",
      value: "0.85",
      unit: "CNY/kWh",
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-emerald-600" />,
      label: "本月发行 C2-Coin",
      value: "36,000",
      unit: "枚",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="container">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">上流数据</h1>
        <p className="text-gray-600 mb-12">
          实时查看电站运营数据、发电量和碳信用额度
        </p>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <Card key={idx} className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500">{stat.unit}</p>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Power Generation Chart */}
          <Card className="bg-white border-emerald-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              发电量趋势 (近6个月)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={powerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="发电量 (kWh)"
                  dot={{ fill: "#10b981", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* CO2 Reduction Chart */}
          <Card className="bg-white border-emerald-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              碳信用额度 (近6个月)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={powerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="co2"
                  fill="#14b8a6"
                  name="碳信用 (吨 CO₂)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Monthly Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Pie Chart */}
          <Card className="bg-white border-emerald-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              本月数据分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={monthlyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Data Summary */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              本月数据摘要
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 text-sm mb-2">发电量</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-emerald-600">72,000</p>
                  <p className="text-gray-600">kWh</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">相比上月增长 5.6%</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-2">碳信用额度</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-teal-600">36,000</p>
                  <p className="text-gray-600">吨 CO₂</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">相比上月增长 5.6%</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-2">发行 C2-Coin</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-amber-600">36,000</p>
                  <p className="text-gray-600">枚</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">基于碳信用额度 1:1 发行</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ 数据说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 发电量数据来自光伏电站实时监测系统</li>
            <li>• 碳信用额度根据发电量自动计算（1 kWh = 0.5 吨 CO₂）</li>
            <li>• 电价数据来自 Chainlink 预言机，实时更新</li>
            <li>• C2-Coin 按照碳信用额度 1:1 发行，用于激励用户参与</li>
            <li>• 所有数据每日更新，确保透明性和准确性</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
