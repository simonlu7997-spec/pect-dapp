import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Gift,
  Send,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
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

export default function AdminAirdrop() {
  const { user, loading } = useAuth();
  const { data: siweUser, isLoading: siweLoading } = trpc.siweAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isAdmin = user?.role === "admin" || siweUser?.role === "admin";
  const [, navigate] = useLocation();

  // 查询空投执行历史
  const {
    data: historyData,
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = trpc.adminAirdrop.getAirdropHistory.useQuery(undefined, { enabled: isAdmin });

  // 手动触发空投
  const triggerMutation = trpc.adminAirdrop.triggerAirdrop.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // 延迟 3 秒后刷新历史，等待异步任务写入记录
      setTimeout(() => refetchHistory(), 3000);
    },
    onError: (err) => {
      toast.error(`触发失败：${err.message}`);
    },
  });

  if (loading || siweLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">无权限访问</p>
          <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
        </div>
      </div>
    );
  }

  const history = historyData ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="container max-w-7xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/revenue")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              分红管理
            </Button>
            <span className="text-gray-600">/</span>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" />
              C2Coin 空投管理
            </h1>
          </div>

          {/* 立即触发空投计算按钮 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={triggerMutation.isPending}
              >
                {triggerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />任务启动中...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />立即触发空投计算</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  确认触发 C2Coin 空投计算
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 space-y-2">
                  <span className="block">
                    此操作将使用部署者私钥调用 C2Coin 合约，向所有 PVC 持有者按比例空投 C2Coin。
                  </span>
                  <span className="block text-yellow-400/80 text-sm">
                    ⚠️ 每月仅应执行一次，请确认本月尚未执行过空投。
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-600 text-gray-300">取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => triggerMutation.mutate()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  确认触发
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="container max-w-7xl py-8 space-y-6">
        {/* 说明卡片 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Gift className="w-6 h-6 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">C2Coin 月度空投说明</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  每月 1 日凌晨 <span className="text-purple-400 font-mono">00:05</span> 系统会自动触发空投计算，
                  根据 PVC 持有量向所有持有者按比例空投 C2Coin。
                  若定时任务未正常执行，可在此页面手动补发。
                  执行后请查看下方历史记录确认结果。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 空投执行历史 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              空投执行历史（最近 50 条）
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchHistory()}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">暂无空投执行记录</p>
                <p className="text-gray-600 text-sm mt-1">
                  系统将在每月 1 日 00:05 自动执行，或点击上方按钮手动触发
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">操作类型</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">数量/地址数</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">状态</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">交易哈希</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">备注</th>
                      <th className="text-right py-3 px-2 text-gray-400 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-2">
                          <Badge className="bg-purple-900/50 text-purple-400 border-purple-800">
                            C2 空投
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-200 font-semibold">
                          {tx.amount ? parseFloat(tx.amount).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge
                            className={
                              tx.status === "confirmed"
                                ? "bg-green-900/50 text-green-400 border-green-800"
                                : tx.status === "failed"
                                ? "bg-red-900/50 text-red-400 border-red-800"
                                : "bg-yellow-900/50 text-yellow-400 border-yellow-800"
                            }
                          >
                            {tx.status === "confirmed"
                              ? "已确认"
                              : tx.status === "failed"
                              ? "失败"
                              : "待确认"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-gray-500 text-xs">
                          <a
                            href={`${import.meta.env.VITE_EXPLORER_URL}/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            {tx.txHash.slice(0, 10)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="py-3 px-2 text-gray-400 text-xs max-w-[200px] truncate">
                          {tx.note ?? "—"}
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
