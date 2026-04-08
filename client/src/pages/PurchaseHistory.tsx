import { useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, RefreshCw, ShoppingCart, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://amoy.polygonscan.com";

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
        <CheckCircle2 className="w-3 h-3" />
        已确认
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1 w-fit">
        <XCircle className="w-3 h-3" />
        失败
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1 w-fit">
      <Clock className="w-3 h-3" />
      待确认
    </Badge>
  );
}

function TxTypeBadge({ txType }: { txType: string }) {
  if (txType === "purchase_private") {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 w-fit">
        私募购买
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 w-fit">
      公募购买
    </Badge>
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function PurchaseHistory() {
  const { account, isConnected, isSignedIn } = useWalletContext();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const { data: history, isLoading, refetch, isFetching } = trpc.purchase.getPurchaseHistory.useQuery(
    { walletAddress: account ?? "" },
    {
      enabled: !!account && isConnected,
      refetchInterval: 30_000,
    }
  );

  const paged = history ? history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];
  const totalPages = history ? Math.ceil(history.length / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container max-w-4xl py-10">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">购买历史</h1>
              <p className="text-sm text-gray-500">私募 & 公募购买记录</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/buy")}
            >
              去购买
            </Button>
          </div>
        </div>

        {/* 未连接钱包 */}
        {!isConnected && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 font-medium">请先连接钱包</p>
              <p className="text-sm text-gray-400">连接钱包后可查看您的购买记录</p>
            </CardContent>
          </Card>
        )}

        {/* 已连接但未登录 */}
        {isConnected && !isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-300" />
              <p className="text-gray-500 font-medium">请先完成 SIWE 登录</p>
              <p className="text-sm text-gray-400">签名登录后可查看您的购买记录</p>
            </CardContent>
          </Card>
        )}

        {/* 加载中 */}
        {isConnected && isSignedIn && isLoading && (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <p className="text-gray-500">加载购买记录中...</p>
            </CardContent>
          </Card>
        )}

        {/* 空记录 */}
        {isConnected && isSignedIn && !isLoading && history && history.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 font-medium">暂无购买记录</p>
              <p className="text-sm text-gray-400">完成购买后记录将显示在这里</p>
              <Button
                className="bg-green-600 hover:bg-green-700 mt-2"
                onClick={() => navigate("/buy")}
              >
                立即购买 PVC
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 记录列表 */}
        {isConnected && isSignedIn && !isLoading && paged.length > 0 && (
          <div className="space-y-3">
            {/* 统计摘要 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="bg-white/80">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{history!.length}</p>
                  <p className="text-xs text-gray-500 mt-1">总交易次数</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {history!.filter(t => t.status === "confirmed").length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">已确认</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {history!
                      .filter(t => t.status === "confirmed" && (t.txType === "purchase_private" || t.txType === "purchase_public"))
                      .reduce((sum, t) => sum + parseFloat(t.pvcAmount ?? "0"), 0)
                      .toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">累计获得 PVC</p>
                </CardContent>
              </Card>
            </div>

            {/* 交易列表 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-700">
                  交易记录（共 {history!.length} 条，最近 50 条）
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {paged.map((tx) => (
                    <div key={tx.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        {/* 左侧：类型 + 哈希 + 时间 */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TxTypeBadge txType={tx.txType} />
                            <StatusBadge status={tx.status} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400 font-mono">
                              {shortHash(tx.txHash)}
                            </span>
                            <a
                              href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="在区块链浏览器中查看"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(tx.createdAt).toLocaleString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {tx.confirmedAt && (
                              <span className="ml-2 text-green-500">
                                · 确认于 {new Date(tx.confirmedAt).toLocaleString("zh-CN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </p>
                          {tx.errorMessage && (
                            <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">
                              {tx.errorMessage}
                            </p>
                          )}
                        </div>

                        {/* 右侧：金额 */}
                        <div className="text-right shrink-0">
                          {tx.pvcAmount && (
                            <p className="text-base font-semibold text-green-700">
                              +{parseFloat(tx.pvcAmount).toFixed(2)}
                              <span className="text-xs text-gray-400 ml-1">PVC</span>
                            </p>
                          )}
                          {tx.amount && (
                            <p className="text-sm text-gray-500">
                              -{parseFloat(tx.amount).toFixed(2)}
                              <span className="text-xs text-gray-400 ml-1">{tx.tokenSymbol ?? "USDT"}</span>
                            </p>
                          )}
                          {tx.blockNumber && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              区块 #{tx.blockNumber.toLocaleString()}
                            </p>
                          )}
                          {tx.gasUsed && (
                            <p className="text-xs text-gray-400">
                              Gas: {parseInt(tx.gasUsed).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-500">
                  第 {page + 1} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
