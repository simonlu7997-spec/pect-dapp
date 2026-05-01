import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Megaphone,
  Loader2,
  X,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type AnnouncementRow = {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function AdminAnnouncements() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();

  // 编辑/新建弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementRow | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPublished, setFormPublished] = useState(false);

  // 查询公告列表
  const {
    data,
    isLoading,
    refetch,
  } = trpc.announcements.adminList.useQuery(undefined, { enabled: isAdmin });

  const announcements = data?.announcements ?? [];

  // 创建公告
  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      toast.success("公告已创建");
      setDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(`创建失败：${err.message}`),
  });

  // 更新公告
  const updateMutation = trpc.announcements.update.useMutation({
    onSuccess: () => {
      toast.success("公告已更新");
      setDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(`更新失败：${err.message}`),
  });

  // 删除公告
  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => {
      toast.success("公告已删除");
      refetch();
    },
    onError: (err) => toast.error(`删除失败：${err.message}`),
  });

  // 快速切换发布状态
  const togglePublish = (item: AnnouncementRow) => {
    updateMutation.mutate({
      id: item.id,
      isPublished: !item.isPublished,
    });
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormContent("");
    setFormPublished(false);
    setDialogOpen(true);
  };

  const openEdit = (item: AnnouncementRow) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormPublished(item.isPublished);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formTitle.trim()) { toast.error("请输入标题"); return; }
    if (!formContent.trim()) { toast.error("请输入内容"); return; }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        title: formTitle.trim(),
        content: formContent.trim(),
        isPublished: formPublished,
      });
    } else {
      createMutation.mutate({
        title: formTitle.trim(),
        content: formContent.trim(),
        isPublished: formPublished,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg font-semibold mb-2">无访问权限</p>
          <p className="text-sm">需要管理员身份</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="container max-w-4xl py-8">

        {/* 页头 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/admin/kyc")}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-violet-400" />
              公告管理
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">发布、编辑和管理项目公告</p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            新建公告
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-400 mb-1">全部公告</p>
              <p className="text-2xl font-bold text-white">{announcements.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-400 mb-1">已发布</p>
              <p className="text-2xl font-bold text-emerald-400">
                {announcements.filter((a) => a.isPublished).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-gray-400 mb-1">草稿</p>
              <p className="text-2xl font-bold text-amber-400">
                {announcements.filter((a) => !a.isPublished).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 公告列表 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="border-b border-gray-800 pb-4">
            <CardTitle className="text-white text-base">公告列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无公告，点击「新建公告」开始发布</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {announcements.map((item) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm truncate">
                            {item.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={item.isPublished
                              ? "border-emerald-500 text-emerald-400 text-xs"
                              : "border-gray-600 text-gray-400 text-xs"
                            }
                          >
                            {item.isPublished ? "已发布" : "草稿"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            创建：{new Date(item.createdAt).toLocaleString("zh-CN")}
                          </span>
                          {item.publishedAt && (
                            <span>
                              发布：{new Date(item.publishedAt).toLocaleString("zh-CN")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 发布/取消发布 */}
                        <button
                          onClick={() => togglePublish(item)}
                          disabled={updateMutation.isPending}
                          title={item.isPublished ? "取消发布" : "发布"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.isPublished
                              ? "text-emerald-400 hover:bg-emerald-900/40"
                              : "text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                          }`}
                        >
                          {item.isPublished ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>

                        {/* 编辑 */}
                        <button
                          onClick={() => openEdit(item)}
                          title="编辑"
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/40 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* 删除 */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              title="删除"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">确认删除</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                确定要删除公告「{item.title}」吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                                取消
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate({ id: item.id })}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-violet-400" />
              {editingItem ? "编辑公告" : "新建公告"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">标题</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="请输入公告标题"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500"
                maxLength={256}
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">内容</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="请输入公告内容..."
                rows={6}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <Switch
                id="publish-switch"
                checked={formPublished}
                onCheckedChange={setFormPublished}
              />
              <Label htmlFor="publish-switch" className="text-gray-300 text-sm cursor-pointer">
                {formPublished ? (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Eye className="w-4 h-4" />立即发布（用户可见）
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <EyeOff className="w-4 h-4" />保存为草稿（用户不可见）
                  </span>
                )}
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1"
            >
              <X className="w-4 h-4" />取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {editingItem ? "保存修改" : "创建公告"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
