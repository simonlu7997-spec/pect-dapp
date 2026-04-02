import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  RefreshCw,
  Users,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG = {
  pending: {
    label: '待审核',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  approved: {
    label: '已通过',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: '已拒绝',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

const COUNTRY_MAP: Record<string, string> = {
  CN: '中国', HK: '香港', TW: '台湾', SG: '新加坡',
  US: '美国', GB: '英国', DE: '德国', FR: '法国',
  JP: '日本', KR: '韩国', AU: '澳大利亚', CA: '加拿大', OTHER: '其他',
};

function KycRow({ kyc, onApprove, onReject }: {
  kyc: any;
  onApprove: (id: number) => void;
  onReject: (id: number, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[kyc.status as keyof typeof STATUS_CONFIG];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-gray-300 transition-colors">
      {/* 主行 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{kyc.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{kyc.email}</p>
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-xs text-gray-500 font-mono truncate">{kyc.walletAddress}</p>
            <p className="text-xs text-gray-400">{COUNTRY_MAP[kyc.country] || kyc.country}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{kyc.investmentAmount} {kyc.investmentCurrency}</p>
            <p className="text-xs text-gray-400">{new Date(kyc.createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.className}`}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {kyc.status === 'pending' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3"
                onClick={(e) => { e.stopPropagation(); onApprove(kyc.id); }}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                通过
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7 px-3"
                onClick={(e) => { e.stopPropagation(); onReject(kyc.id, kyc.fullName); }}
              >
                <XCircle className="w-3 h-3 mr-1" />
                拒绝
              </Button>
            </>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">电话</p>
              <p className="text-gray-700">{kyc.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">国家</p>
              <p className="text-gray-700">{COUNTRY_MAP[kyc.country] || kyc.country}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">申请时间</p>
              <p className="text-gray-700">{new Date(kyc.createdAt).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">更新时间</p>
              <p className="text-gray-700">{new Date(kyc.updatedAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">钱包地址</p>
            <p className="text-xs font-mono text-gray-700 break-all">{kyc.walletAddress}</p>
          </div>

          {kyc.reviewNote && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">审核备注</p>
              <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded px-2 py-1">{kyc.reviewNote}</p>
            </div>
          )}

          {(kyc.txHashKyc || kyc.txHashSender) && (
            <div className="space-y-1">
              {kyc.txHashKyc && (
                <a
                  href={`https://amoy.polygonscan.com/tx/${kyc.txHashKyc}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  KYC 交易：{kyc.txHashKyc}
                </a>
              )}
              {kyc.txHashSender && (
                <a
                  href={`https://amoy.polygonscan.com/tx/${kyc.txHashSender}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  白名单交易：{kyc.txHashSender}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminKyc() {
  const { user, loading } = useAuth();
  // 同时检查 SIWE 钱包登录用户的 role（与 Navbar 逻辑保持一致）
  const { data: siweUser, isLoading: siweLoading } = trpc.siweAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isAdmin = user?.role === 'admin' || siweUser?.role === 'admin';
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 审核弹窗状态
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: number; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // 查询申请列表
  const { data: applications, isLoading, refetch } = trpc.whitelist.listApplications.useQuery(
    { status: statusFilter === 'all' ? undefined : statusFilter },
    { enabled: isAdmin }
  );

  // 审核通过
  const approveMutation = trpc.whitelist.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setApproveId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || '审核操作失败');
      setApproveId(null);
    },
  });

  // 审核拒绝
  const rejectMutation = trpc.whitelist.reject.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setRejectDialog(null);
      setRejectNote('');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || '操作失败');
    },
  });

  // 权限检查
  if (loading || siweLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">无权访问</h2>
          <p className="text-gray-500 mb-4">此页面仅限管理员访问</p>
          <Button onClick={() => navigate('/')} variant="outline">返回首页</Button>
        </div>
      </div>
    );
  }

  // 过滤搜索
  const filtered = (applications || []).filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.fullName.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.walletAddress.toLowerCase().includes(q) ||
      app.phone.includes(q)
    );
  });

  // 统计数据
  const allApps = applications || [];
  const stats = {
    total: allApps.length,
    pending: allApps.filter(a => a.status === 'pending').length,
    approved: allApps.filter(a => a.status === 'approved').length,
    rejected: allApps.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">

        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KYC 审核管理</h1>
              <p className="text-sm text-gray-500">管理白名单申请，审核通过后自动上链</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: '全部申请', value: stats.total, color: 'text-gray-800', bg: 'bg-white' },
            { label: '待审核', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: '已通过', value: stats.approved, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: '已拒绝', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50' },
          ].map(item => (
            <Card key={item.label} className={`${item.bg} border-gray-200`}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 过滤和搜索 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? '全部' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索姓名、邮箱、地址..."
              className="pl-9 text-sm"
            />
          </div>
        </div>

        {/* 申请列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
            <span className="text-gray-500">加载中...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? '没有匹配的申请记录' : '暂无申请记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(kyc => (
              <KycRow
                key={kyc.id}
                kyc={kyc}
                onApprove={(id) => setApproveId(id)}
                onReject={(id, name) => setRejectDialog({ id, name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* 审核通过确认弹窗 */}
      <Dialog open={approveId !== null} onOpenChange={() => setApproveId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              确认审核通过
            </DialogTitle>
            <DialogDescription>
              通过后将调用 PVCoin 合约，将该钱包地址添加到链上白名单。此操作将消耗 Gas 费用，且不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveId(null)}>取消</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveMutation.isPending}
              onClick={() => approveId && approveMutation.mutate({ id: approveId, reviewNote: '管理员审核通过' })}
            >
              {approveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />上链中...</>
              ) : '确认通过并上链'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝原因弹窗 */}
      <Dialog open={rejectDialog !== null} onOpenChange={() => { setRejectDialog(null); setRejectNote(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              拒绝申请
            </DialogTitle>
            <DialogDescription>
              请填写拒绝原因，该原因将显示给申请人。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="请输入拒绝原因（如：信息不完整、不符合投资条件等）"
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectNote(''); }}>取消</Button>
            <Button
              variant="destructive"
              disabled={!rejectNote.trim() || rejectMutation.isPending}
              onClick={() => rejectDialog && rejectMutation.mutate({ id: rejectDialog.id, reviewNote: rejectNote })}
            >
              {rejectMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />处理中...</>
              ) : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
