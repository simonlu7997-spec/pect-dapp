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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ArrowLeft, Zap, MapPin, Factory } from "lucide-react";

type StationForm = {
  name: string;
  capacity: string;
  location: string;
  annualGeneration: string;
  annualRevenue: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

const emptyForm: StationForm = {
  name: "",
  capacity: "",
  location: "",
  annualGeneration: "",
  annualRevenue: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

// ── 提取为模块级组件，避免每次渲染重新创建导致输入框失焦 ──────────────
function StationFormFields({
  value,
  onChange,
}: {
  value: StationForm;
  onChange: (v: StationForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>电站名称 *</Label>
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="如：电站 A"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>装机容量 *</Label>
          <Input
            value={value.capacity}
            onChange={(e) => onChange({ ...value, capacity: e.target.value })}
            placeholder="如：100kW"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>所在地区 *</Label>
        <Input
          value={value.location}
          onChange={(e) => onChange({ ...value, location: e.target.value })}
          placeholder="如：浙江省杭州市"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>年发电量（kWh）*</Label>
          <Input
            value={value.annualGeneration}
            onChange={(e) => onChange({ ...value, annualGeneration: e.target.value })}
            placeholder="如：45000"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>年收入（RMB）*</Label>
          <Input
            value={value.annualRevenue}
            onChange={(e) => onChange({ ...value, annualRevenue: e.target.value })}
            placeholder="如：180000"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>显示排序</Label>
          <Input
            type="number"
            value={value.sortOrder}
            onChange={(e) => onChange({ ...value, sortOrder: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="flex items-center gap-2 pb-2">
            <Switch
              checked={value.isActive}
              onCheckedChange={(v) => onChange({ ...value, isActive: v })}
            />
            <Label>{value.isActive ? "已启用（首页可见）" : "已停用（首页隐藏）"}</Label>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>备注说明</Label>
        <Textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="电站的额外描述信息（可选）"
          rows={2}
        />
      </div>
    </div>
  );
}

export default function AdminStations() {
  const { user, loading } = useAuth();
  const { data: siweUser, isLoading: siweLoading } = trpc.siweAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isAdmin = user?.role === "admin" || siweUser?.role === "admin";
  const [, navigate] = useLocation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<StationForm>(emptyForm);

  const { data, refetch, isLoading } = trpc.adminStations.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const createMutation = trpc.adminStations.create.useMutation({
    onSuccess: () => {
      toast.success("电站已添加");
      setCreateOpen(false);
      setForm(emptyForm);
      refetch();
    },
    onError: (err) => toast.error(`添加失败：${err.message}`),
  });

  const updateMutation = trpc.adminStations.update.useMutation({
    onSuccess: () => {
      toast.success("电站信息已更新");
      setEditTarget(null);
      refetch();
    },
    onError: (err) => toast.error(`更新失败：${err.message}`),
  });

  const deleteMutation = trpc.adminStations.delete.useMutation({
    onSuccess: () => {
      toast.success("电站已删除");
      refetch();
    },
    onError: (err) => toast.error(`删除失败：${err.message}`),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate({ id: editTarget.id, ...form });
  };

  type StationItem = {
    id: number;
    name: string;
    capacity: string;
    location: string;
    annualGeneration: string;
    annualRevenue: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };

  const openEdit = (station: StationItem) => {
    const newForm: StationForm = {
      name: station.name,
      capacity: station.capacity,
      location: station.location,
      annualGeneration: station.annualGeneration,
      annualRevenue: station.annualRevenue,
      description: station.description ?? "",
      isActive: station.isActive,
      sortOrder: station.sortOrder,
    };
    setForm(newForm);
    setEditTarget({ id: station.id });
  };

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

  const stationList = data?.stations ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/revenue")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-green-400" />
              <h1 className="text-lg font-bold">电站资产管理</h1>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-1" />
                新增电站
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>新增电站</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <StationFormFields value={form} onChange={setForm} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>取消</Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 内容区 */}
      <div className="container max-w-6xl py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Factory className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">电站总数</p>
                  <p className="text-2xl font-bold text-white">{stationList.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-400">年总发电量</p>
                  <p className="text-2xl font-bold text-white">
                    {stationList.filter(s => s.isActive).reduce((sum, s) => sum + parseFloat(s.annualGeneration || "0"), 0).toLocaleString()} kWh
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">已启用电站</p>
                  <p className="text-2xl font-bold text-white">{stationList.filter(s => s.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 电站列表 */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base">电站列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-400" />
              </div>
            ) : stationList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无电站数据，点击"新增电站"添加第一个电站</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-3 text-gray-400 font-medium">电站名称</th>
                      <th className="text-center py-3 px-3 text-gray-400 font-medium">装机容量</th>
                      <th className="text-center py-3 px-3 text-gray-400 font-medium">所在地区</th>
                      <th className="text-right py-3 px-3 text-gray-400 font-medium">年发电量</th>
                      <th className="text-right py-3 px-3 text-gray-400 font-medium">年收入</th>
                      <th className="text-center py-3 px-3 text-gray-400 font-medium">状态</th>
                      <th className="text-center py-3 px-3 text-gray-400 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationList.map((station) => (
                      <tr key={station.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">{station.name}</td>
                        <td className="py-3 px-3 text-center text-gray-300">{station.capacity}</td>
                        <td className="py-3 px-3 text-center text-gray-300">{station.location}</td>
                        <td className="py-3 px-3 text-right text-gray-300">
                          {parseFloat(station.annualGeneration || "0").toLocaleString()} kWh
                        </td>
                        <td className="py-3 px-3 text-right text-green-400 font-semibold">
                          {parseFloat(station.annualRevenue || "0").toLocaleString()} RMB
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge className={station.isActive ? "bg-green-900/50 text-green-400 border-green-700" : "bg-gray-800 text-gray-500 border-gray-700"}>
                            {station.isActive ? "启用" : "停用"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* 编辑 */}
                            <Dialog
                              open={editTarget?.id === station.id}
                              onOpenChange={(open) => {
                                if (!open) setEditTarget(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                  onClick={() => openEdit(station)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>编辑电站</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleUpdate} className="space-y-4">
                                  <StationFormFields value={form} onChange={setForm} />
                                  <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>取消</Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                                      {updateMutation.isPending ? "保存中..." : "保存更改"}
                                    </Button>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>

                            {/* 删除 */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    确定要删除电站「{station.name}」吗？此操作不可撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => deleteMutation.mutate({ id: station.id })}
                                  >
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
