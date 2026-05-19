import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Settings, Loader2, RefreshCw, Info } from "lucide-react";

export default function AdminCalculatorParams() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();

  // 表单状态
  const [exchangeRate, setExchangeRate] = useState("");
  const [electricityPrice, setElectricityPrice] = useState("");
  const [annualDividendPool, setAnnualDividendPool] = useState("");
  const [annualStakingPool, setAnnualStakingPool] = useState("");
  const [c2cAnnualAirdrop, setC2cAnnualAirdrop] = useState("");
  const [c2cStakingRate, setC2cStakingRate] = useState("");
  const [phase1TokenRatio, setPhase1TokenRatio] = useState("");
  const [phase2TokenRatio, setPhase2TokenRatio] = useState("");
  const [totalPvcSupply, setTotalPvcSupply] = useState("");

  // 查询当前参数
  const { data: params, isLoading, refetch } = trpc.calculatorParams.getParams.useQuery();

  // 当参数加载完成后填入表单
  useEffect(() => {
    if (params) {
      setExchangeRate(params.exchangeRate.toString());
      setElectricityPrice(params.electricityPrice.toString());
      setAnnualDividendPool(params.annualDividendPool.toString());
      setAnnualStakingPool((params.annualStakingPool ?? 4573).toString());
      setC2cAnnualAirdrop((params.c2cAnnualAirdrop ?? 382990).toString());
      setC2cStakingRate((params.c2cStakingRate ?? 0.5).toString());
      setPhase1TokenRatio(params.phase1TokenRatio.toString());
      setPhase2TokenRatio(params.phase2TokenRatio.toString());
      setTotalPvcSupply(params.totalPvcSupply.toString());
    }
  }, [params]);

  const utils = trpc.useUtils();
  const updateMutation = trpc.calculatorParams.updateParams.useMutation({
    onSuccess: () => {
      toast.success("计算器参数已更新");
      utils.calculatorParams.getParams.invalidate();
      refetch();
    },
    onError: (err) => {
      toast.error(`更新失败：${err.message}`);
    },
  });

  const handleSubmit = () => {
    const er = parseFloat(exchangeRate);
    const ep = parseFloat(electricityPrice);
    const adp = parseFloat(annualDividendPool);
    const asp = parseFloat(annualStakingPool);
    const c2ca = parseInt(c2cAnnualAirdrop);
    const c2csr = parseFloat(c2cStakingRate);
    const p1 = parseFloat(phase1TokenRatio);
    const p2 = parseFloat(phase2TokenRatio);
    const tps = parseInt(totalPvcSupply);

    if (isNaN(er) || er <= 0) return toast.error("汇率必须为正数");
    if (isNaN(ep) || ep <= 0) return toast.error("电费单价必须为正数");
    if (isNaN(adp) || adp <= 0) return toast.error("PV-Coin 基础分红池必须为正数");
    if (isNaN(asp) || asp < 0) return toast.error("C2-Coin 质押奖励池必须为非负数");
    if (isNaN(c2ca) || c2ca < 0) return toast.error("C2C 年度空投总量必须为非负整数");
    if (isNaN(c2csr) || c2csr < 0 || c2csr > 1) return toast.error("C2C 质押率必须在 0~1 之间");
    if (isNaN(p1) || p1 < 0 || p1 > 1) return toast.error("前24月代币比例必须在 0~1 之间");
    if (isNaN(p2) || p2 < 0 || p2 > 1) return toast.error("24月后代币比例必须在 0~1 之间");
    if (isNaN(tps) || tps <= 0) return toast.error("PVC 总发行量必须为正整数");

    updateMutation.mutate({
      exchangeRate: er,
      electricityPrice: ep,
      annualDividendPool: adp,
      annualStakingPool: asp,
      c2cAnnualAirdrop: c2ca,
      c2cStakingRate: c2csr,
      phase1TokenRatio: p1,
      phase2TokenRatio: p2,
      totalPvcSupply: tps,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500 font-medium">无权限访问此页面</p>
        <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/revenue")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回管理后台
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-600" />
            <h1 className="text-lg font-semibold text-gray-900">收益计算器参数配置</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* 说明卡片 */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">参数说明</p>
                <p>这些参数用于收益计算器的预期收益计算，修改后将立即在前端计算器中生效。</p>
                <p>默认值来自白皮书 V6.1 §5.3.2，请在汇率或电价变动时及时更新。</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 参数表单 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基础经济参数</CardTitle>
            <CardDescription>影响分红池和收益率计算的核心参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="exchangeRate">
                      RMB/USDT 汇率
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：7.2</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="exchangeRate"
                        type="number"
                        step="0.01"
                        min="1"
                        max="20"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder="7.2"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">RMB/USDT</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="electricityPrice">
                      电费单价
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：1.109</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="electricityPrice"
                        type="number"
                        step="0.001"
                        min="0.1"
                        max="5"
                        value={electricityPrice}
                        onChange={(e) => setElectricityPrice(e.target.value)}
                        placeholder="1.109"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">RMB/kWh</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annualDividendPool">
                      PV-Coin 基础分红池
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：41,155</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="annualDividendPool"
                        type="number"
                        step="1"
                        min="1"
                        value={annualDividendPool}
                        onChange={(e) => setAnnualDividendPool(e.target.value)}
                        placeholder="41155"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USDT/年</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annualStakingPool">
                      C2-Coin 质押奖励池
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：4,573</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="annualStakingPool"
                        type="number"
                        step="1"
                        min="0"
                        value={annualStakingPool}
                        onChange={(e) => setAnnualStakingPool(e.target.value)}
                        placeholder="4573"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USDT/年</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="c2cAnnualAirdrop">
                      C2C 年度空投总量
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：382,990</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="c2cAnnualAirdrop"
                        type="number"
                        step="1"
                        min="0"
                        value={c2cAnnualAirdrop}
                        onChange={(e) => setC2cAnnualAirdrop(e.target.value)}
                        placeholder="382990"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">枚/年</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="c2cStakingRate">
                      全网 C2C 质押率
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：0.5（50%）</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="c2cStakingRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={c2cStakingRate}
                        onChange={(e) => setC2cStakingRate(e.target.value)}
                        placeholder="0.5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">0~1</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalPvcSupply">
                      PVC 总发行量
                      <span className="ml-2 text-xs text-gray-400">白皮书默认：4,000,000</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="totalPvcSupply"
                        type="number"
                        step="1"
                        min="1"
                        value={totalPvcSupply}
                        onChange={(e) => setTotalPvcSupply(e.target.value)}
                        placeholder="4000000"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">枚</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-5">
                  <p className="text-sm font-medium text-gray-700 mb-4">分红参与比例（按白皮书 §5.3.2）</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="phase1TokenRatio">
                        前 24 个月参与比例
                        <span className="ml-2 text-xs text-gray-400">白皮书默认：0.75（75%）</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="phase1TokenRatio"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={phase1TokenRatio}
                          onChange={(e) => setPhase1TokenRatio(e.target.value)}
                          placeholder="0.75"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">0~1</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phase2TokenRatio">
                        24 个月后参与比例
                        <span className="ml-2 text-xs text-gray-400">白皮书默认：1.0（100%）</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="phase2TokenRatio"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={phase2TokenRatio}
                          onChange={(e) => setPhase2TokenRatio(e.target.value)}
                          placeholder="1.0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">0~1</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 实时预览 */}
                {(() => {
                  const adp = parseFloat(annualDividendPool) || 41155;
                  const asp = parseFloat(annualStakingPool) || 4573;
                  const c2ca = parseInt(c2cAnnualAirdrop) || 382990;
                  const c2csr = parseFloat(c2cStakingRate) || 0.5;
                  const p1 = parseFloat(phase1TokenRatio) || 0.75;
                  const p2 = parseFloat(phase2TokenRatio) || 1.0;
                  const tps = parseInt(totalPvcSupply) || 4000000;
                  const privatePrice = 0.08;
                  const publicPrice = 0.10;
                  // PV-Coin 基础分红
                  const phase1MonthlyPerPvc = adp / (tps * p1) / 12;
                  const phase2MonthlyPerPvc = adp / (tps * p2) / 12;
                  // C2C 质押收益（10,000 USDT 投入示例）
                  const exampleInvest = 10000;
                  const stakingPoolTotal = c2ca * c2csr;
                  const stakingAnnual = asp * ((exampleInvest / publicPrice * c2csr) / stakingPoolTotal);
                  const stakingYieldPub = stakingPoolTotal > 0 ? (stakingAnnual / exampleInvest) * 100 : 0;
                  const stakingYieldPriv = stakingPoolTotal > 0 ? (asp * ((exampleInvest / privatePrice * c2csr) / stakingPoolTotal) / exampleInvest) * 100 : 0;
                  // 综合年化
                  const privateYield1 = (phase1MonthlyPerPvc * 12) / privatePrice * 100 + stakingYieldPriv;
                  const publicYield1 = (phase1MonthlyPerPvc * 12) / publicPrice * 100 + stakingYieldPub;
                  const privateYield2 = (phase2MonthlyPerPvc * 12) / privatePrice * 100 + stakingYieldPriv;
                  const publicYield2 = (phase2MonthlyPerPvc * 12) / publicPrice * 100 + stakingYieldPub;
                  return (
                    <div className="border-t pt-5">
                      <p className="text-sm font-medium text-gray-700 mb-1">参数预览（实时计算，含 C2C 质押，以 10,000 USDT 投入为例）</p>
                      <p className="text-xs text-gray-400 mb-3">C2C 质押收益基于 50% 质押率假设，实际收益随质押率变化</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">私募综合年化（前24月）</p>
                          <p className="text-lg font-bold text-green-600">{privateYield1.toFixed(2)}%</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">私募综合年化（24月后）</p>
                          <p className="text-lg font-bold text-green-700">{privateYield2.toFixed(2)}%</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">公募综合年化（前24月）</p>
                          <p className="text-lg font-bold text-blue-600">{publicYield1.toFixed(2)}%</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">公募综合年化（24月后）</p>
                          <p className="text-lg font-bold text-blue-700">{publicYield2.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updateMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</>
                    ) : (
                      "保存参数"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新加载
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
