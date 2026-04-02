import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  TrendingUp,
  Zap,
  DollarSign,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Users,
} from "lucide-react";

export default function AdminRevenue() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  // 表单状态
  const [form, setForm] = useState({
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
    totalGeneration: "",
    totalRevenue: "",
    dividendPool: "",
    exchangeRate: "7.2",
    snapshotBlock: "",
    txHash: "",
    note: "",
  });

  // 查询分红记录列表
  const { data: recordsData, refetch: refetchRecords, isLoading: loadingRecords } =
    trpc.adminRevenue.list.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  // 查询链上合约统计
  const { data: contractStats, isLoading: loadingStats } =
    trpc.adminRevenue.getContractStats.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  // 查询质押统计
  const { data: stakingStats, isLoading: loadingStaking } =
    trpc.adminRevenue.getStakingStats.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  // 查询质押历史
  const { data: stakingHistory, isLoading: loadingStakingHistory } =
    trpc.adminRevenue.getStakingHistory.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  // 录入分红数据
  const createMutation = trpc.adminRevenue.create.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.periodLabel} 期分红数据已保存`);
      setDialogOpen(false);
      setForm({
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
        totalGeneration: "",
        totalRevenue: "",
        dividendPool: "",
        exchangeRate: "7.2",
        snapshotBlock: "",
        txHash: "",
        note: "",
      });
      refetchRecords();
    },
    onError: (err) => {
      toast.error(`录入失败：${err.message}`);
    },
  });

  // 删除分红数据
  const deleteMutation = trpc.adminRevenue.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      refetchRecords();
    },
    onError: (err) => {
      toast.error(`删除失败：${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      periodYear: form.periodYear,
      periodMonth: form.periodMonth,
      totalGeneration: form.totalGeneration,
      totalRevenue: form.totalRevenue,
      dividendPool: form.dividendPool,
      exchangeRate: form.exchangeRate,
      snapshotBlock: form.snapshotBlock ? parseInt(form.snapshotBlock) : undefined,
      txHash: form.txHash || undefined,
      note: form.note || undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-400" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">无权限访问</p>
          <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
        </div>
      </div>
    );
  }

  const records = recordsData?.records ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="container max-w-7xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/kyc")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              KYC 审核
            </Button>
            <span className="text-gray-600">/</span>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              分红数据管理
            </h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                录入新期数据
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">录入分红期数据</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">年份</Label>
                    <Input
                      type="number"
                      value={form.periodYear}
                      onChange={e => setForm(f => ({ ...f, periodYear: parseInt(e.target.value) || f.periodYear }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      min={2020} max={2100}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">月份</Label>
                    <Input
                      type="number"
                      value={form.periodMonth}
                      onChange={e => setForm(f => ({ ...f, periodMonth: parseInt(e.target.value) || f.periodMonth }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      min={1} max={12}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">总发电量（kWh）</Label>
                  <Input
                    value={form.totalGeneration}
                    onChange={e => setForm(f => ({ ...f, totalGeneration: e.target.value }))}
                    placeholder="例如：487884.5"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-300">总电费收入（RMB）</Label>
                  <Input
                    value={form.totalRevenue}
                    onChange={e => setForm(f => ({ ...f, totalRevenue: e.target.value }))}
                    placeholder="例如：541412.00"
                    className="bg-gray-800 border-gray-600 text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">分红池（USDT）</Label>
                    <Input
                      value={form.dividendPool}
                      onChange={e => setForm(f => ({ ...f, dividendPool: e.target.value }))}
                      placeholder="例如：45700.00"
                      className="bg-gray-800 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">汇率（RMB/USDT）</Label>
                    <Input
                      value={form.exchangeRate}
                      onChange={e => setForm(f => ({ ...f, exchangeRate: e.target.value }))}
                      placeholder="例如：7.2"
                      className="bg-gray-800 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">快照区块号（可选）</Label>
                  <Input
                    type="number"
                    value={form.snapshotBlock}
                    onChange={e => setForm(f => ({ ...f, snapshotBlock: e.target.value }))}
                    placeholder="链上快照区块号"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">链上交易哈希（可选）</Label>
                  <Input
                    value={form.txHash}
                    onChange={e => setForm(f => ({ ...f, txHash: e.target.value }))}
                    placeholder="0x..."
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">备注（可选）</Label>
                  <Textarea
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="本期特殊情况说明..."
                    className="bg-gray-800 border-gray-600 text-white resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                    className="border-gray-600 text-gray-300">
                    取消
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}
                    className="bg-green-600 hover:bg-green-700">
                    {createMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="container max-w-7xl py-8 space-y-8">
        {/* 链上统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">累计分红（链上）</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {loadingStats ? "—" : contractStats?.available
                      ? `${parseFloat(contractStats.totalDistributed).toLocaleString()} USDT`
                      : "未配置"}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">总质押量（链上）</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {loadingStaking ? "—" : stakingStats?.available
                      ? `${parseFloat(stakingStats.totalStaked).toLocaleString()} C2C`
                      : "未配置"}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">质押人数</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">
                    {loadingStaking ? "—" : stakingStats?.available
                      ? stakingStats.totalStakers.toLocaleString()
                      : "—"}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">已录入期数</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {loadingRecords ? "—" : records.length}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-amber-400/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 分红历史记录表 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">分红期数据记录</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetchRecords()}
              className="text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-green-400" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">暂无分红数据</p>
                <p className="text-gray-600 text-sm mt-1">点击「录入新期数据」开始添加</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">期数</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">发电量（kWh）</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">电费收入（RMB）</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">分红池（USDT）</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">汇率</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">链上状态</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-2">
                          <span className="font-mono font-semibold text-green-400">
                            {record.periodLabel}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-200">
                          {parseFloat(record.totalGeneration).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-200">
                          {parseFloat(record.totalRevenue).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-amber-400">
                          {parseFloat(record.dividendPool).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-400">
                          {record.exchangeRate}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {record.txHash ? (
                            <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">
                              已上链
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-800 text-gray-500 border-gray-700 text-xs">
                              未上链
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7 p-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">确认删除</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  确定要删除 {record.periodLabel} 期的分红数据吗？此操作不可撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-600 text-gray-300">取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({ id: record.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 质押交易历史 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base">质押交易历史（最近 50 条）</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStakingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-400" />
              </div>
            ) : !stakingHistory?.transactions?.length ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">暂无质押交易记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">类型</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">钱包地址</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">金额</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">状态</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">交易哈希</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakingHistory.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-2">
                          <Badge className={
                            tx.txType === "stake"
                              ? "bg-blue-900/50 text-blue-400 border-blue-800"
                              : tx.txType === "unstake"
                              ? "bg-orange-900/50 text-orange-400 border-orange-800"
                              : "bg-green-900/50 text-green-400 border-green-800"
                          }>
                            {tx.txType === "stake" ? "质押" : tx.txType === "unstake" ? "解质押" : "领取奖励"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-gray-400 text-xs">
                          {tx.walletAddress.slice(0, 6)}...{tx.walletAddress.slice(-4)}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-200">
                          {tx.amount ? `${parseFloat(tx.amount).toLocaleString()} ${tx.tokenSymbol ?? ""}` : "—"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge className={
                            tx.status === "confirmed"
                              ? "bg-green-900/50 text-green-400 border-green-800"
                              : tx.status === "failed"
                              ? "bg-red-900/50 text-red-400 border-red-800"
                              : "bg-yellow-900/50 text-yellow-400 border-yellow-800"
                          }>
                            {tx.status === "confirmed" ? "已确认" : tx.status === "failed" ? "失败" : "待确认"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-gray-500 text-xs">
                          {tx.txHash ? (
                            <a
                              href={`${import.meta.env.VITE_EXPLORER_URL}/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {tx.txHash.slice(0, 10)}...
                            </a>
                          ) : "—"}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500 text-xs">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
