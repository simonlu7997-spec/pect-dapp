/**
 * 收益计算器页面 — 按白皮书 V6.1 公式
 *
 * 核心公式（）：
 *   前24个月：单位代币月分红 = 41,155 ÷ 3,000,000 ÷ 12 = 0.00114 USDT/枚（75%代币参与）
 *   24个月后：单位代币月分红 = 41,155 ÷ 4,000,000 ÷ 12 = 0.00086 USDT/枚（100%代币参与）
 *
 *   私募年化（前24月）= 0.01372 ÷ 0.08 = 17.15%
 *   公募年化（前24月）= 0.01372 ÷ 0.10 = 13.72%
 */
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
import {
  TrendingUp, Calculator as CalcIcon, Lock, Unlock, Info, ArrowRight, Zap,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";

// ─── 白皮书 V6.1 业务常量 ────────────────────────────────────────────────────────
const PRIVATE_PRICE = 0.08;       // USDT/PVC（私募单价）
const PUBLIC_PRICE  = 0.10;       // USDT/PVC（公募单价）
const PVC_TOTAL_SUPPLY = 4_000_000; // 总发行量 400 万枚

// 年度 PV-Coin 基础分红池 = 45,728 × 90% = 41,155 USDT
const ANNUAL_DIVIDEND_POOL = 41_155;

// 前24个月：75%代币参与分红（3,000,000 枚）
const PHASE1_SUPPLY = 3_000_000;
// 24个月后：100%代币参与分红（4,000,000 枚）
const PHASE2_SUPPLY = 4_000_000;

// 单位代币月分红（使用白皮书精确年分红值反推，保证年化率与白皮书完全一致）
// 年分红 = 41,155 ÷ 3,000,000 = 0.013718333... → 月分红 = 0.013718333 / 12
const ANNUAL_PER_TOKEN_PHASE1 = ANNUAL_DIVIDEND_POOL / PHASE1_SUPPLY; // 0.013718...
const ANNUAL_PER_TOKEN_PHASE2 = ANNUAL_DIVIDEND_POOL / PHASE2_SUPPLY; // 0.010289...
const MONTHLY_PER_TOKEN_PHASE1 = ANNUAL_PER_TOKEN_PHASE1 / 12; // 前24个月
const MONTHLY_PER_TOKEN_PHASE2 = ANNUAL_PER_TOKEN_PHASE2 / 12; // 24个月后

// 私募锁仓期（月）
const PRIVATE_LOCK_MONTHS = 3;

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  if (!isFinite(n) || isNaN(n)) return "0.00";
  return n.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number) {
  if (!isFinite(n) || isNaN(n)) return "0.00%";
  return n.toFixed(2) + "%";
}

// ─── 自定义 Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
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

// ─── 计算结果类型 ────────────────────────────────────────────────────────────────
interface CalcResult {
  pvcAmount: number;
  holdingPct: number;
  // 前24个月
  monthlyDividendP1: number;
  annualDividendP1: number;
  annualYieldP1: number;
  // 24个月后
  monthlyDividendP2: number;
  annualDividendP2: number;
  annualYieldP2: number;
  // 回本周期（月）
  paybackMonths: number;
  lockMonths: number;
  price: number;
  label: string;
  color: string;
  // 24个月累计收益图表数据
  chartData: { month: string; cumulative: number; monthly: number; phase: string }[];
}

// ─── 单模式计算结果组件 ────────────────────────────────────────────────────────
function ResultCard({ result, investUsdt }: { result: CalcResult; investUsdt: number }) {
  const [, navigate] = useLocation();
  const isGreen = result.color === "green";
  const accent = isGreen ? "emerald" : "blue";

  return (
    <Card className={`border-2 ${isGreen ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-blue-200 bg-gradient-to-br from-blue-50 to-white"}`}>
      <CardHeader className={`rounded-t-lg ${isGreen ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-blue-500 to-blue-600"} text-white`}>
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
            <p className={`text-xl font-bold text-${accent}-600`}>
              {fmt(result.pvcAmount, 0)} PVC
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-0.5">持仓占比</p>
            <p className={`text-xl font-bold text-${accent}-600`}>
              {fmtPct(result.holdingPct)}
            </p>
          </div>
        </div>

        {/* 两阶段收益对比 */}
        <div className="grid grid-cols-1 gap-3">
          {/* 前24个月 */}
          <div className={`rounded-lg p-3 border ${isGreen ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isGreen ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                前 24 个月
              </span>
              <span className="text-xs text-gray-500">75% 代币参与分红</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">月均分红</p>
                <p className={`font-bold text-${accent}-600`}>{fmt(result.monthlyDividendP1)} USDT</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">年化分红</p>
                <p className={`font-bold text-${accent}-600`}>{fmt(result.annualDividendP1)} USDT</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">年化收益率</p>
                <p className={`font-bold text-${accent}-600`}>{fmtPct(result.annualYieldP1)}</p>
              </div>
            </div>
          </div>

          {/* 24个月后 */}
          <div className="rounded-lg p-3 border bg-gray-50 border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-500 text-white">
                24 个月后
              </span>
              <span className="text-xs text-gray-500">100% 代币参与分红</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">月均分红</p>
                <p className="font-bold text-gray-600">{fmt(result.monthlyDividendP2)} USDT</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">年化分红</p>
                <p className="font-bold text-gray-600">{fmt(result.annualDividendP2)} USDT</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">年化收益率</p>
                <p className="font-bold text-gray-600">{fmtPct(result.annualYieldP2)}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 详细数据 */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">投入金额</span>
            <span className="font-semibold">{fmt(investUsdt)} USDT</span>
          </div>
          {result.lockMonths > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">锁仓期内预期收益</span>
              <span className={`font-semibold text-${accent}-600`}>
                {fmt(result.monthlyDividendP1 * result.lockMonths)} USDT
              </span>
            </div>
          )}
        </div>

        {/* 24 个月累计收益曲线（两阶段） */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            24 个月累计分红预测（USDT）— 第 25 月起收益率调整
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={result.chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${result.color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isGreen ? "#10b981" : "#3b82f6"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isGreen ? "#10b981" : "#3b82f6"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} width={45} />
              <Tooltip formatter={(v: number) => [`${fmt(v)} USDT`, "累计分红"]} />
              {result.lockMonths > 0 && (
                <ReferenceLine
                  x={`M${result.lockMonths}`}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: "解锁", position: "insideTopRight", fontSize: 9, fill: "#f59e0b" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulative"
                name="累计分红"
                stroke={isGreen ? "#10b981" : "#3b82f6"}
                fill={`url(#grad-${result.color})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Button
          className={`w-full ${isGreen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
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
  const searchString = useSearch();

  // 读取动态计算器参数（汇率/电价可在管理后台配置）
  const { data: calcParams } = trpc.calculatorParams.getParams.useQuery();

  // 动态参数（fallback 到白皮书 V6.1 默认值）
  const dynamicAnnualDividendPool = calcParams?.annualDividendPool ?? ANNUAL_DIVIDEND_POOL;
  const dynamicPhase1Supply = calcParams
    ? Math.round(PVC_TOTAL_SUPPLY * calcParams.phase1TokenRatio)
    : PHASE1_SUPPLY;
  const dynamicPhase2Supply = calcParams
    ? Math.round((calcParams.totalPvcSupply ?? PVC_TOTAL_SUPPLY) * calcParams.phase2TokenRatio)
    : PHASE2_SUPPLY;
  const dynamicTotalSupply = calcParams?.totalPvcSupply ?? PVC_TOTAL_SUPPLY;

  // 动态月分红单价
  const dynamicMonthlyP1 = (dynamicAnnualDividendPool / dynamicPhase1Supply) / 12;
  const dynamicMonthlyP2 = (dynamicAnnualDividendPool / dynamicPhase2Supply) / 12;

  // 读取 URL 参数，自动填入金额并切换 Tab
  useEffect(() => {
    if (!searchString) return;
    const params = new URLSearchParams(searchString);
    const amount = params.get("amount");
    const type = params.get("type");
    if (amount && parseFloat(amount) > 0) {
      setInvestInput(amount);
    }
    if (type === "private") {
      setActiveTab("private");
    } else if (type === "public") {
      setActiveTab("public");
    }
  }, [searchString]);

  const investUsdt = Math.max(0, parseFloat(investInput) || 0);

  // ─── 核心计算函数（按白皮书 V6.1，支持动态参数）────────────────────────────────
  function calcResult(price: number, lockMonths: number, color: string, label: string): CalcResult {
    const pvcAmount = investUsdt / price;
    const holdingPct = (pvcAmount / dynamicTotalSupply) * 100;

    // 前24个月（75%代币参与）—使用动态参数
    const monthlyDividendP1 = pvcAmount * dynamicMonthlyP1;
    const annualDividendP1 = monthlyDividendP1 * 12;
    const annualYieldP1 = investUsdt > 0 ? (annualDividendP1 / investUsdt) * 100 : 0;

    // 24个月后（100%代币参与）—使用动态参数
    const monthlyDividendP2 = pvcAmount * dynamicMonthlyP2;
    const annualDividendP2 = monthlyDividendP2 * 12;
    const annualYieldP2 = investUsdt > 0 ? (annualDividendP2 / investUsdt) * 100 : 0;

    // 回本周期：按前24个月月分红计算（更保守）
    const paybackMonths = monthlyDividendP1 > 0 ? Math.ceil(investUsdt / monthlyDividendP1) : 0;

    // 生成 24 个月累计收益数据（第1-24月用 P1，第25月起用 P2）
    let cumulative = 0;
    const chartData = Array.from({ length: 24 }, (_, i) => {
      const monthNum = i + 1;
      const monthly = monthNum <= 24 ? monthlyDividendP1 : monthlyDividendP2;
      cumulative += monthly;
      return {
        month: `M${monthNum}`,
        cumulative: parseFloat(cumulative.toFixed(2)),
        monthly: parseFloat(monthly.toFixed(2)),
        phase: monthNum <= 24 ? "前24月" : "24月后",
      };
    });

    return {
      pvcAmount, holdingPct,
      monthlyDividendP1, annualDividendP1, annualYieldP1,
      monthlyDividendP2, annualDividendP2, annualYieldP2,
      paybackMonths, lockMonths, price, label, color, chartData,
    };
  }

  const privateResult = useMemo(
    () => calcResult(PRIVATE_PRICE, PRIVATE_LOCK_MONTHS, "green", "私募"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investUsdt, dynamicMonthlyP1, dynamicMonthlyP2, dynamicTotalSupply]
  );
  const publicResult = useMemo(
    () => calcResult(PUBLIC_PRICE, 0, "blue", "公募"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investUsdt, dynamicMonthlyP1, dynamicMonthlyP2, dynamicTotalSupply]
  );

  // 24 个月累计收益对比图
  const compareData = useMemo(() => {
    let privCum = 0;
    let pubCum = 0;
    return Array.from({ length: 24 }, (_, i) => {
      const monthNum = i + 1;
      privCum += privateResult.pvcAmount * dynamicMonthlyP1;
      pubCum  += publicResult.pvcAmount  * dynamicMonthlyP1;
      return {
        month: `M${monthNum}`,
        私募累计: parseFloat(privCum.toFixed(2)),
        公募累计: parseFloat(pubCum.toFixed(2)),
      };
    });
  }, [privateResult, publicResult, dynamicMonthlyP1]);

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
            <span className="text-emerald-600 font-medium"> 数据依据白皮书 V6.1 公式计算。</span>
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
                收益基于白皮书 V6.1 公式：年度 PV-Coin 基础分红池 41,155 USDT，
                前 24 个月 75% 代币参与分红（月分红 0.00114 USDT/枚，年化 13.72%），
                24 个月后 100% 代币参与分红（月分红 0.00086 USDT/枚，年化 10.29%）。
                实际分红受电站发电量、电价、汇率等因素影响，不构成投资承诺。
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
                    <span className="text-gray-500">前24月月均分红</span>
                    <span className="font-bold text-emerald-600">{fmt(privateResult.monthlyDividendP1)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">前24月年化收益率</span>
                    <span className="font-bold text-emerald-600">{fmtPct(privateResult.annualYieldP1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">24月后年化收益率</span>
                    <span className="font-semibold text-gray-500">{fmtPct(privateResult.annualYieldP2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">锁仓期</span>
                    <span className="font-semibold text-amber-600">3 个月</span>
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
                    <span className="text-gray-500">前24月月均分红</span>
                    <span className="font-bold text-blue-600">{fmt(publicResult.monthlyDividendP1)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">前24月年化收益率</span>
                    <span className="font-bold text-blue-600">{fmtPct(publicResult.annualYieldP1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">24月后年化收益率</span>
                    <span className="font-semibold text-gray-500">{fmtPct(publicResult.annualYieldP2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">锁仓期</span>
                    <span className="font-semibold text-green-600">无锁仓</span>
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
                        前 24 个月月均多分红{" "}
                        <span className="font-bold text-emerald-600">
                          {fmt(privateResult.monthlyDividendP1 - publicResult.monthlyDividendP1)} USDT
                        </span>
                        ，年化收益率高出{" "}
                        <span className="font-bold text-emerald-600">
                          {fmtPct(privateResult.annualYieldP1 - publicResult.annualYieldP1)}
                        </span>
                        ，但需锁仓 3 个月。
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 24 个月累计收益对比图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">前 24 个月累计分红对比（USDT）</CardTitle>
                <CardDescription>
                  私募（绿）vs 公募（蓝）累计分红曲线 · 黄色虚线为私募解锁时间点 · 基于白皮书 V6.1 月分红 0.00114 USDT/枚
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={compareData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine
                      x="M3"
                      stroke="#f59e0b"
                      strokeDasharray="4 2"
                      label={{ value: "私募解锁", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
                    />
                    <Bar dataKey="私募累计" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="公募累计" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 收益率对比说明 */}
            <Card className="mt-6 bg-gray-50 border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">白皮书 V6.1 收益对比参考</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: "PV-Coin 公募（前24月）", yield: fmtPct((dynamicMonthlyP1 * 12 / PUBLIC_PRICE) * 100), color: "text-blue-600" },
                    { label: "PV-Coin 私募（前24月）", yield: fmtPct((dynamicMonthlyP1 * 12 / PRIVATE_PRICE) * 100), color: "text-emerald-600" },
                    { label: "PV-Coin 公募（24月后）", yield: fmtPct((dynamicMonthlyP2 * 12 / PUBLIC_PRICE) * 100), color: "text-blue-400" },
                    { label: "PV-Coin 私募（24月后）", yield: fmtPct((dynamicMonthlyP2 * 12 / PRIVATE_PRICE) * 100), color: "text-emerald-400" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <p className={`text-lg font-bold ${item.color}`}>{item.yield}</p>
                    </div>
                  ))}
                </div>
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
          本计算器依据白皮书 V6.1 公式计算，仅供参考，不构成任何投资建议。
          实际收益受电站发电量、电价、汇率等因素影响，存在不确定性。
          请参阅{" "}
          <a href="/disclaimer" className="underline hover:text-gray-600">免责声明</a>
          {" "}了解更多风险提示。
        </p>
      </div>
    </div>
  );
}
