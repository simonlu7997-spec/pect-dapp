import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  Zap,
  Flame,
  BarChart3,
  Leaf,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  PieChart as PieChartComponent,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 代币分布（静态，根据白皮书）
const tokenDistribution = [
  { name: "私募", value: 20, status: "已完成" },
  { name: "公募", value: 50, status: "进行中" },
  { name: "项目储备", value: 15, status: "锁仓中" },
  { name: "团队激励", value: 10, status: "锁仓中" },
  { name: "生态发展", value: 5, status: "已分配" },
];

const PIE_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

// 格式化数字：大数字自动加单位
function formatNumber(val: number, unit = "") {
  if (val >= 10000) return `${(val / 10000).toFixed(1)}万${unit}`;
  return `${val.toLocaleString()}${unit}`;
}

// 空数据占位组件
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[240px] text-gray-400 gap-2">
      <AlertCircle className="w-8 h-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = trpc.oracle.getStats.useQuery();
  const { data: records, isLoading: recordsLoading } = trpc.oracle.getRecentRecords.useQuery();
  const { data: stationBreakdown, isLoading: stationsLoading } = trpc.oracle.getStationBreakdown.useQuery();

  // 月度趋势数据（发电量 + 收入 + 分红池）
  const monthlyTrendData = (records ?? []).map(r => ({
    month: r.periodLabel,
    generation: parseFloat(r.totalGeneration),
    revenue: parseFloat(r.totalRevenue),
    dividendPool: parseFloat(r.dividendPool),
    exchangeRate: parseFloat(r.exchangeRate),
  }));

  // 累计分红池增长数据（累加）
  const cumulativeDividendData = monthlyTrendData.reduce<
    { month: string; cumulative: number }[]
  >((acc, cur) => {
    const prev = acc[acc.length - 1]?.cumulative ?? 0;
    acc.push({ month: cur.month, cumulative: prev + cur.dividendPool });
    return acc;
  }, []);

  // 各电站发电量/收入对比
  const stationData = (stationBreakdown ?? []).map(s => ({
    name: s.name,
    generation: parseFloat(s.annualGeneration),
    revenue: parseFloat(s.annualRevenue),
    capacity: s.capacity,
    location: s.location,
  }));

  const hasRecords = monthlyTrendData.length > 0;
  const hasStations = stationData.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="container">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">数据分析</h1>
        <p className="text-gray-600 mb-12">
          项目运营数据、电站发电趋势、分红池增长及代币分布
        </p>

        {/* ── 一、汇总统计卡片 ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">运营汇总</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">累计发电量</p>
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {formatNumber(parseFloat(stats?.totalGeneration ?? "0"))}
                  </p>
                  <p className="text-xs text-gray-500">kWh</p>
                </>
              )}
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">累计电费收入</p>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {formatNumber(parseFloat(stats?.totalRevenue ?? "0"))}
                  </p>
                  <p className="text-xs text-gray-500">RMB</p>
                </>
              )}
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">累计分红池</p>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {formatNumber(parseFloat(stats?.totalDividendPool ?? "0"))}
                  </p>
                  <p className="text-xs text-gray-500">USDT</p>
                </>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">已录入期数</p>
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-emerald-600 mb-1">
                    {stats?.recordCount ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">期</p>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* ── 二、月度发电量 vs 收入（双 Y 轴柱状图） ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">月度发电量 vs 收入对比</h2>
          <Card className="bg-white border-emerald-100 p-6">
            {recordsLoading ? (
              <div className="h-[320px] bg-gray-50 rounded animate-pulse" />
            ) : !hasRecords ? (
              <EmptyState message="暂无月度数据，请在管理后台录入分红期数据" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={monthlyTrendData} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    label={{ value: "发电量 (kWh)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#6b7280" } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={v => `${(v / 10000).toFixed(1)}万`}
                    tick={{ fontSize: 11 }}
                    label={{ value: "收入 (RMB)", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 11, fill: "#6b7280" } }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "发电量") return [`${value.toLocaleString()} kWh`, name];
                      if (name === "收入") return [`¥${value.toLocaleString()}`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="generation" name="发电量" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="收入" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* ── 三、累计分红池增长（面积图） ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">累计分红池增长</h2>
          <Card className="bg-white border-emerald-100 p-6">
            {recordsLoading ? (
              <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
            ) : !hasRecords ? (
              <EmptyState message="暂无分红数据，请在管理后台录入分红期数据" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cumulativeDividendData} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={v => `${v.toLocaleString()}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} USDT`, "累计分红池"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="累计分红池"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#dividendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* ── 四、月度分红池趋势（折线图） ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">月度分红池趋势</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">发电量趋势</h3>
              {recordsLoading ? (
                <div className="h-[260px] bg-gray-50 rounded animate-pulse" />
              ) : !hasRecords ? (
                <EmptyState message="暂无数据" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} kWh`, "发电量"]} />
                    <Line type="monotone" dataKey="generation" name="发电量" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">分红池趋势</h3>
              {recordsLoading ? (
                <div className="h-[260px] bg-gray-50 rounded animate-pulse" />
              ) : !hasRecords ? (
                <EmptyState message="暂无数据" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v.toLocaleString()}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} USDT`, "分红池"]} />
                    <Line type="monotone" dataKey="dividendPool" name="分红池" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>

        {/* ── 五、各电站发电量/收入对比（水平柱状图） ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">各电站发电量对比</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">年发电量（kWh）</h3>
              {stationsLoading ? (
                <div className="h-[260px] bg-gray-50 rounded animate-pulse" />
              ) : !hasStations ? (
                <EmptyState message="暂无电站数据，请在管理后台添加电站" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, stationData.length * 72)}>
                  <BarChart data={stationData} layout="vertical" margin={{ left: 16, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} kWh`, "年发电量"]} />
                    <Bar dataKey="generation" name="年发电量" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">年收入（RMB）</h3>
              {stationsLoading ? (
                <div className="h-[260px] bg-gray-50 rounded animate-pulse" />
              ) : !hasStations ? (
                <EmptyState message="暂无电站数据，请在管理后台添加电站" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, stationData.length * 72)}>
                  <BarChart data={stationData} layout="vertical" margin={{ left: 16, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${(v / 10000).toFixed(1)}万`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`¥${v.toLocaleString()}`, "年收入"]} />
                    <Bar dataKey="revenue" name="年收入" fill="#06b6d4" radius={[0, 4, 4, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* 电站明细表格 */}
          {hasStations && (
            <Card className="bg-white border-emerald-100 p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">电站明细</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">电站名称</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">装机容量</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">位置</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">年发电量 (kWh)</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">年收入 (RMB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationData.map((s, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-emerald-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                        <td className="py-3 px-4 text-gray-600">{s.capacity}</td>
                        <td className="py-3 px-4 text-gray-600">{s.location}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{s.generation.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-gray-900">¥{s.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* ── 六、代币分布 ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">代币分布</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    outerRadius={90}
                    dataKey="value"
                  >
                    {tokenDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, "占比"]} />
                </PieChartComponent>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-white border-emerald-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">分布详情</h3>
              <div className="space-y-3">
                {tokenDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
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

        {/* ── 七、碳减排统计 ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">环保贡献</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">累计碳减排</p>
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-emerald-600 mb-1">
                    {(parseFloat(stats?.totalGeneration ?? "0") * 0.785 / 1000).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">吨 CO₂（按 0.785 kg/kWh 折算）</p>
                </>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">等效植树</p>
                <Flame className="w-5 h-5 text-blue-500" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-blue-600 mb-1">
                    {Math.round(parseFloat(stats?.totalGeneration ?? "0") * 0.785 / 1000 / 0.018).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">棵（每棵树年吸收约 18 kg CO₂）</p>
                </>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-medium">最新汇率</p>
                <Activity className="w-5 h-5 text-amber-500" />
              </div>
              {statsLoading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-amber-600 mb-1">
                    {parseFloat(stats?.latestExchangeRate ?? "7.2").toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">RMB / USDT（最新录入汇率）</p>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
