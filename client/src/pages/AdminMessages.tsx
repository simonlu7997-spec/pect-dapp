import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
};

const PAGE_SIZE = 20;

export default function AdminMessages() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();

  const [page, setPage] = useState(1);
  const [selectedMsg, setSelectedMsg] = useState<ContactMessage | null>(null);

  const { data, isLoading } = trpc.contact.list.useQuery(
    { page, pageSize: PAGE_SIZE },
    { enabled: isAdmin }
  );

  const messages = (data?.items ?? []) as ContactMessage[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── 权限检查 ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">无权限访问此页面</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          返回首页
        </Button>
      </div>
    );
  }

  // ── 工具函数 ──────────────────────────────────────────────────────────────
  const formatDate = (d: Date) =>
    new Date(d).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const mailtoLink = (msg: ContactMessage) =>
    `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(`您好 ${msg.name}，\n\n感谢您的留言。\n\n---\n原始留言：\n${msg.message}`)}`;

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-10">
      <div className="container max-w-5xl">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/kyc")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            管理后台
          </Button>
          <span className="text-gray-400">/</span>
          <span className="font-semibold text-gray-900">留言管理</span>
        </div>

        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">用户留言</h1>
            {total > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                共 {total} 条
              </Badge>
            )}
          </div>
        </div>

        {/* 留言列表 */}
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-700">
              留言列表（按时间倒序，每页 {PAGE_SIZE} 条）
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <MessageSquare className="w-12 h-12 opacity-30" />
                <p>暂无留言</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedMsg(msg)}
                  >
                    {/* 头像占位 */}
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-semibold text-sm">
                        {msg.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {msg.name}
                        </span>
                        <span className="text-gray-400 text-xs">{msg.email}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                        {msg.subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {msg.message}
                      </p>
                    </div>

                    {/* 时间 + 快捷回复 */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {formatDate(msg.createdAt)}
                      </span>
                      <a
                        href={mailtoLink(msg)}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:underline"
                      >
                        <Mail className="w-3 h-3" />
                        回复
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  第 {page} / {totalPages} 页
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 留言详情弹窗 */}
      <Dialog open={!!selectedMsg} onOpenChange={(open) => !open && setSelectedMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              留言详情
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">姓名</p>
                  <p className="font-medium text-gray-900">{selectedMsg.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">邮箱</p>
                  <p className="font-medium text-gray-900 break-all">{selectedMsg.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">主题</p>
                  <p className="font-medium text-gray-900">{selectedMsg.subject}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">提交时间</p>
                  <p className="text-gray-700">{formatDate(selectedMsg.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-2">消息内容</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedMsg.message}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <a
                  href={mailtoLink(selectedMsg)}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  用邮件客户端回复
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
