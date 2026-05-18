/**
 * 收益计算器页面
 * 支持私募（0.08 USDT/PVC，3 个月锁仓）和公募（0.10 USDT/PVC，无锁仓）两种模式
 * 基于历史分红数据动态计算预期收益，并展示 12 个月收益曲线对比图
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, Calculator as CalcIcon, Lock, Unlock, Info, ArrowRight, Zap,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── 业务常量 ──────────────────────────────────────────────────────────────────
const PRIVATE_PRICE = 0.08;   // USDT/PVC
const PUBLIC_PRICE  = 0.10;   // USDT/PVC
const PVC_TOTAL_SUPPLY = 4_000_000; // PVC 总发行量（400 万）
// 分红池占电站收入比例（60%）
const DIVIDEND_RATIO = 0.60;

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  if (!isFinite(n) || isNaN(n)) return "0.00";
  return n.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number) {
  if (!isFinite(n) || isNaN(n)) return "0.00%";
  return n.toFixed(2) + "%";
}

// 根据历史分红记录计算月均分红池（USDT）
function calcMonthlyAvgPool(records: { dividendPool: string }[]): number {
  if (!records.length) return 0;
  const total = records.reduce((s, r) => s + parseFloat(r.dividendPool), 0);
  return total / records.length;
}

// ─── 自定义 Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}：{fmt(p.value)} USDT
        </p>
      ))}
    </div>
  );
}

// ─── 单模式计算结果组件 ────────────────────────────────────────────────────────
interface CalcResult {
  pvcAmount: number;
  holdingPct: number;
  monthlyDividend: number;
  annualDividend: number;
  annualYield: number;
  paybackMonths: number;
  lockMonths: number;
  price: number;
  label: string;
  color: string;
  chartData: { month: string; cumulative: number; monthly: number }[];
}

function ResultCard({ result, investUsdt }: { result: CalcResult; investUsdt: number }) {
  const [, navigate] = useLocation();
  return (
    <Card className={`border-2 ${result.color === "green" ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-blue-200 bg-gradient-to-br from-blue-50 to-white"}`}>
      <CardHeader className={`rounded-t-lg ${result.color === "green" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-blue-500 to-blue-600"} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{result.label}</CardTitle>
            <CardDescription className="text-white/80 mt-0.5">
              代币价格 {result.price} USDT/PVC
            </CardDescription>
          </div>
          {result.lockMonths > 0 ? (
            <Badge variant="outline" className="border-white/60 text-white bg-white/10 gap-1">
              <Lock className="w-3 h-3" /> {result.lockMonths} 个月锁仓
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/60 text-white bg-white/10 gap-1">
              <Unlock className="w-3 h-3" /> 无锁仓
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-0.5">获得 PVC 数量</p>
            <p className={`text-xl font-bold ${result.color === "green" ? "text-emerald-600" : "text-blue-600"}`}>
              {fmt(result.pvcAmount, 0)} PVC
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-0.5">持仓占比</p>
            <p className={`text-xl font-bold ${result.color === "green" ? "text-emerald-600" : "text-blue-600"}`}>
              {fmtPct(result.holdingPct)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-0.5">预期月均分红</p>
            <p className={`text-xl font-bold ${result.color === "green" ? "text-emerald-600" : "text-blue-600"}`}>
              {fmt(result.monthlyDividend)} USDT
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-0.5">预期年化收益</p>
            <p className={`text-xl font-bold ${result.color === "green" ? "text-emerald-600" : "text-blue-600"}`}>
              {fmtPct(result.annualYield)}
            </p>
          </div>
        </div>

        <Separator />

        {/* 详细数据 */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">投入金额</span>
            <span className="font-semibold">{fmt(investUsdt)} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">预期年收益</span>
            <span className={`font-semibold ${result.color === "green" ? "text-emerald-600" : "text-blue-600"}`}>
              {fmt(result.annualDividend)} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">预期回本周期</span>
            <span className="font-semibold">
              {result.paybackMonths > 0 && isFinite(result.paybackMonths)
                ? `约 ${result.paybackMonths} 个月`
                : "—"}
            </span>
          </div>
          {result.lockMonths > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">锁仓期内预期收益</span>
              <span className={`font-semibold ${result.color === "green" ? "text-emerald-600" : "text-blue-600"}`}>
                {fmt(result.monthlyDividend * result.lockMonths)} USDT
              </span>
            </div>
          )}
        </div>

        {/* 12 个月累计收益曲线 */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">12 个月累计分红预测（USDT）</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={result.chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${result.color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={result.color === "green" ? "#10b981" : "#3b82f6"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={result.color === "green" ? "#10b981" : "#3b82f6"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} width={40} />
              <Tooltip formatter={(v: number) => [`${fmt(v)} USDT`, "累计分红"]} />
              {result.lockMonths > 0 && (
                <ReferenceLine
                  x={`第${result.lockMonths}月`}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: "解锁", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulative"
                name="累计分红"
                stroke={result.color === "green" ? "#10b981" : "#3b82f6"}
                fill={`url(#grad-${result.color})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Button
          className={`w-full ${result.color === "green" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
          onClick={() => navigate("/buy")}
        >
          立即购买 <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function Calculator() {
  const [investInput, setInvestInput] = useState("10000");
  const [activeTab, setActiveTab] = useState<"compare" | "private" | "public">("compare");

  // 从后端获取历史分红数据，用于计算月均分红池
  const { data: recentRecords } = trpc.oracle.getRecentRecords.useQuery();
  const { data: stats } = trpc.oracle.getStats.useQuery();

  const investUsdt = Math.max(0, parseFloat(investInput) || 0);

  // 月均分红池：优先使用历史数据，无数据时使用 stats 累计值估算
  const monthlyAvgPool = useMemo(() => {
    if (recentRecords && recentRecords.length > 0) {
      return calcMonthlyAvgPool(recentRecords);
    }
    if (stats && stats.recordCount > 0) {
      return parseFloat(stats.totalDividendPool) / stats.recordCount;
    }
    // 无历史数据时，使用首页展示的年化 13.72% 反推：假设总发行量 400 万，价格 0.1，总市値 40 万 USDT
    // 年化 13.72% → 年分红 54,880 USDT → 月均 4,573 USDT
    return 4_573;
  }, [recentRecords, stats]);

  // 计算某种模式的收益
  function calcResult(price: number, lockMonths: number, color: string, label: string): CalcResult {
    const pvcAmount = investUsdt / price;
    const holdingPct = (pvcAmount / PVC_TOTAL_SUPPLY) * 100;
    const monthlyDividend = (pvcAmount / PVC_TOTAL_SUPPLY) * monthlyAvgPool;
    const annualDividend = monthlyDividend * 12;
    const annualYield = investUsdt > 0 ? (annualDividend / investUsdt) * 100 : 0;
    const paybackMonths = monthlyDividend > 0 ? Math.ceil(investUsdt / monthlyDividend) : 0;

    // 生成 12 个月累计收益数据
    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: `第${i + 1}月`,
      cumulative: parseFloat((monthlyDividend * (i + 1)).toFixed(2)),
      monthly: parseFloat(monthlyDividend.toFixed(2)),
    }));

    return { pvcAmount, holdingPct, monthlyDividend, annualDividend, annualYield, paybackMonths, lockMonths, price, label, color, chartData };
  }

  const privateResult = useMemo(() => calcResult(PRIVATE_PRICE, 3, "green", "私募"), [investUsdt, monthlyAvgPool]);
  const publicResult  = useMemo(() => calcResult(PUBLIC_PRICE,  0, "blue",  "公募"), [investUsdt, monthlyAvgPool]);

  // 对比图表数据（12 个月）
  const compareData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      month: `第${i + 1}月`,
      私募累计: parseFloat((privateResult.monthlyDividend * (i + 1)).toFixed(2)),
      公募累计: parseFloat((publicResult.monthlyDividend  * (i + 1)).toFixed(2)),
    })),
    [privateResult, publicResult]
  );

  const hasRealData = recentRecords && recentRecords.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-12">
      <div className="container max-w-5xl">
        {/* 页头 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <CalcIcon className="w-4 h-4" />
            收益计算器
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">预期收益估算</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            输入您的投入金额，对比私募与公募两种参与方式的预期分红收益。
            {hasRealData
              ? <span className="text-emerald-600 font-medium"> 数据基于 {recentRecords!.length} 期真实分红记录计算。</span>
              : <span className="text-amber-600 font-medium"> 暂无历史分红数据，以估算值展示。</span>
            }
          </p>
        </div>

        {/* 投入金额输入 */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  投入金额（USDT）
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={investInput}
                    onChange={(e) => setInvestInput(e.target.value)}
                    placeholder="请输入投入金额"
                    className="text-lg h-12 pr-16"
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDT</span>
                </div>
              </div>
              {/* 快捷金额按钮 */}
              <div className="flex flex-wrap gap-2 sm:mt-5">
                {[1000, 5000, 10000, 50000, 100000].map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    className={`text-xs ${investUsdt === v ? "border-emerald-500 text-emerald-600 bg-emerald-50" : ""}`}
                    onClick={() => setInvestInput(String(v))}
                  >
                    {v >= 10000 ? `${v / 10000}万` : v}
                  </Button>
                ))}
              </div>
            </div>

            {/* 参数说明 */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs text-amber-700">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                以上收益为预期估算值，基于历史月均分红池（{fmt(monthlyAvgPool, 0)} USDT/月）计算，
                实际分红取决于电站当月发电量和收入，不构成投资承诺。
                PVC 总发行量 {(PVC_TOTAL_SUPPLY / 10000).toFixed(0)} 万枚，分红池占电站收入 {(DIVIDEND_RATIO * 100).toFixed(0)}%。
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 结果展示 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 mb-6" style={{}}>
            <TabsTrigger value="compare" className="gap-1.5">
              <TrendingUp className="w-4 h-4" /> 对比视图
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-1.5">
              <Lock className="w-4 h-4" /> 私募详情
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-1.5">
              <Unlock className="w-4 h-4" /> 公募详情
            </TabsTrigger>
          </TabsList>

          {/* 对比视图 */}
          <TabsContent value="compare">
            {/* 摘要对比卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 私募摘要 */}
              <Card className="border-2 border-emerald-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-emerald-700">私募</CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">0.08 USDT/PVC</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">获得 PVC</span>
                    <span className="font-bold text-emerald-600">{fmt(privateResult.pvcAmount, 0)} PVC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">月均分红</span>
                    <span className="font-bold text-emerald-600">{fmt(privateResult.monthlyDividend)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">年化收益率</span>
                    <span className="font-bold text-emerald-600">{fmtPct(privateResult.annualYield)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">锁仓期</span>
                    <span className="font-semibold text-amber-600">3 个月</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">预期回本</span>
                    <span className="font-semibold">{privateResult.paybackMonths > 0 ? `约 ${privateResult.paybackMonths} 月` : "—"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* 公募摘要 */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-blue-700">公募</CardTitle>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">0.10 USDT/PVC</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">获得 PVC</span>
                    <span className="font-bold text-blue-600">{fmt(publicResult.pvcAmount, 0)} PVC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">月均分红</span>
                    <span className="font-bold text-blue-600">{fmt(publicResult.monthlyDividend)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">年化收益率</span>
                    <span className="font-bold text-blue-600">{fmtPct(publicResult.annualYield)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">锁仓期</span>
                    <span className="font-semibold text-green-600">无锁仓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">预期回本</span>
                    <span className="font-semibold">{publicResult.paybackMonths > 0 ? `约 ${publicResult.paybackMonths} 月` : "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 私募优势说明 */}
            {investUsdt > 0 && (
              <Card className="mb-6 bg-emerald-50 border-emerald-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold text-emerald-700">私募优势：</span>
                      <span className="text-gray-600">
                        相同投入 {fmt(investUsdt, 0)} USDT，私募比公募多获得{" "}
                        <span className="font-bold text-emerald-600">
                          {fmt(privateResult.pvcAmount - publicResult.pvcAmount, 0)} PVC
                        </span>
                        （多 {fmtPct(((privateResult.pvcAmount - publicResult.pvcAmount) / publicResult.pvcAmount) * 100)}），
                        月均多分红{" "}
                        <span className="font-bold text-emerald-600">
                          {fmt(privateResult.monthlyDividend - publicResult.monthlyDividend)} USDT
                        </span>
                        ，但需锁仓 3 个月。
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 12 个月累计收益对比图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">12 个月累计分红对比（USDT）</CardTitle>
                <CardDescription>私募（绿）vs 公募（蓝）累计分红曲线，黄色虚线为私募解锁时间点</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine x="第3月" stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "私募解锁", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }} />
                    <Bar dataKey="私募累计" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="公募累计" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 私募详情 */}
          <TabsContent value="private">
            <ResultCard result={privateResult} investUsdt={investUsdt} />
          </TabsContent>

          {/* 公募详情 */}
          <TabsContent value="public">
            <ResultCard result={publicResult} investUsdt={investUsdt} />
          </TabsContent>
        </Tabs>

        {/* 免责声明 */}
        <p className="text-center text-xs text-gray-400 mt-8">
          本计算器仅供参考，不构成任何投资建议。实际收益受电站发电量、电价、汇率等因素影响，存在不确定性。
          请参阅{" "}
          <a href="/disclaimer" className="underline hover:text-gray-600">免责声明</a>
          {" "}了解更多风险提示。
        </p>
      </div>
    </div>
  );
}
