/**
 * 电站现场页面 /stations
 *
 * 展示三个电站的现场实拍图片（由海康互联每日自动抓图）
 * 每个电站显示最新的 1-2 张图片，并标注抓图时间
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, RefreshCw, MapPin, Clock } from "lucide-react";
import { useLocation } from "wouter";

function formatCapturedAt(date: Date): string {
  return new Date(date).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Stations() {
  const [, navigate] = useLocation();

  const { data, isLoading, refetch, isFetching } = trpc.stationSnapshots.getLatest.useQuery(
    undefined,
    { refetchInterval: 5 * 60 * 1000 } // 每 5 分钟自动刷新
  );

  const groups = data?.groups ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* 页面标题区 */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 -ml-2"
                  onClick={() => navigate("/")}
                >
                  ← 返回首页
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Camera className="w-8 h-8 text-green-600" />
                电站现场
              </h1>
              <p className="text-gray-500 mt-2">
                实时展示各电站现场图片，由海康互联摄像系统每日自动采集
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              刷新图片
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container max-w-6xl py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-green-600" />
            <p className="text-gray-500">正在加载电站图片...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Camera className="w-16 h-16 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-500">暂无电站现场图片</h2>
            <p className="text-gray-400 max-w-md">
              系统每日 08:00 自动采集电站现场图片。如需立即查看，请联系管理员手动触发抓图。
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.stationName}>
                {/* 电站标题 */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-8 bg-green-500 rounded-full" />
                  <h2 className="text-2xl font-bold text-gray-800">{group.stationName}</h2>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {group.snapshots.length} 个摄像头
                  </Badge>
                </div>

                {/* 图片网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.snapshots.map((snap) => (
                    <Card key={`${snap.deviceSerial}-${snap.channelNo}`} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-green-600" />
                          通道 {snap.channelNo}
                          <span className="ml-auto text-xs text-gray-400 font-normal flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatCapturedAt(snap.capturedAt)}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="relative aspect-video bg-gray-100">
                          <img
                            src={snap.imageUrl}
                            alt={`${group.stationName} 通道${snap.channelNo} 现场图片`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // 图片加载失败时显示占位符
                              const target = e.currentTarget;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector(".img-error")) {
                                const placeholder = document.createElement("div");
                                placeholder.className = "img-error absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400";
                                placeholder.innerHTML = `
                                  <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span class="text-sm">图片链接已过期，将在下次抓图后更新</span>
                                `;
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        </div>
                        {/* 设备信息 */}
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            设备序列号：{snap.deviceSerial}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 说明文字 */}
        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2">关于电站现场图片</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 图片由海康互联摄像系统每日 08:00（北京时间）自动采集</li>
            <li>• 图片链接有效期约 24 小时，次日更新后旧链接将失效</li>
            <li>• 如需查看历史图片，请联系项目方</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
