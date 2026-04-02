import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWalletContext } from '@/contexts/WalletContext';
import { trpc } from '@/lib/trpc';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  XCircle,
  ShieldCheck,
  FileText,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

// 国家列表
const COUNTRIES = [
  { value: "CN", label: "中国" },
  { value: "HK", label: "香港" },
  { value: "TW", label: "台湾" },
  { value: "SG", label: "新加坡" },
  { value: "US", label: "美国" },
  { value: "GB", label: "英国" },
  { value: "DE", label: "德国" },
  { value: "FR", label: "法国" },
  { value: "JP", label: "日本" },
  { value: "KR", label: "韩国" },
  { value: "AU", label: "澳大利亚" },
  { value: "CA", label: "加拿大" },
  { value: "OTHER", label: "其他" },
];

// 申请状态展示组件
function ApplicationStatus({ walletAddress }: { walletAddress: string }) {
  const { data, isLoading, refetch } = trpc.whitelist.checkStatus.useQuery(
    { walletAddress },
    { enabled: !!walletAddress }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
        <span className="text-gray-500">查询申请状态...</span>
      </div>
    );
  }

  const dbRecord = data?.dbRecord;
  const isOnChain = data?.isKycVerified && data?.isSenderWhitelisted;

  if (!dbRecord && !isOnChain) return null;

  const statusConfig = {
    pending: {
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      label: "审核中",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      desc: "您的申请已提交，管理员正在审核，通常需要 1-3 个工作日。",
      cardBg: "bg-amber-50 border-amber-200",
    },
    approved: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      label: "已通过",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      desc: "恭喜！您的 KYC 申请已通过审核，钱包地址已成功加入白名单，可以参与 PVCoin 的购买和转账。",
      cardBg: "bg-emerald-50 border-emerald-200",
    },
    rejected: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      label: "已拒绝",
      badge: "bg-red-100 text-red-700 border-red-200",
      desc: "您的申请未通过审核，您可以修改信息后重新提交。",
      cardBg: "bg-red-50 border-red-200",
    },
  };

  const status = isOnChain ? "approved" : (dbRecord?.status ?? "pending");
  const cfg = statusConfig[status as keyof typeof statusConfig];

  return (
    <Card className={`mb-8 border ${cfg.cardBg}`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3">
          {cfg.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">申请状态</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-600">{cfg.desc}</p>
            {dbRecord?.reviewNote && status === "rejected" && (
              <p className="mt-2 text-sm text-red-700 bg-red-100 rounded px-3 py-1.5">
                <strong>拒绝原因：</strong>{dbRecord.reviewNote}
              </p>
            )}
            {(dbRecord?.txHashKyc || dbRecord?.txHashSender) && (
              <div className="mt-2 space-y-1">
                {dbRecord.txHashKyc && (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${dbRecord.txHashKyc}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                    KYC 上链交易：{dbRecord.txHashKyc.slice(0, 18)}...
                  </a>
                )}
                {dbRecord.txHashSender && (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${dbRecord.txHashSender}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                    白名单上链交易：{dbRecord.txHashSender.slice(0, 18)}...
                  </a>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors flex-shrink-0"
            title="刷新状态"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Whitelist() {
  const { account, isConnected } = useWalletContext();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    investmentAmount: '',
    investmentCurrency: 'USDT',
    walletAddress: '',
    agreeTerms: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);

  // 连接钱包后自动填充地址
  useEffect(() => {
    if (account && !formData.walletAddress) {
      setFormData(prev => ({ ...prev, walletAddress: account }));
    }
  }, [account]);

  const submitMutation = trpc.whitelist.submit.useMutation({
    onSuccess: (data) => {
      setSubmitResult({ success: true, message: data.message, status: data.status });
    },
    onError: (err) => {
      setSubmitResult({ success: false, message: err.message || '提交失败，请重试' });
    },
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.fullName.trim()) errors.fullName = '请输入完整姓名';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = '请输入有效的邮箱地址';
    if (!formData.phone.trim()) errors.phone = '请输入联系电话';
    if (!formData.country) errors.country = '请选择国家/地区';
    if (!formData.investmentAmount.trim() || isNaN(Number(formData.investmentAmount)) || Number(formData.investmentAmount) <= 0) {
      errors.investmentAmount = '请输入有效的投资金额';
    }
    if (!formData.walletAddress.trim() || !/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
      errors.walletAddress = '请输入有效的钱包地址（0x 开头，42 位）';
    }
    if (!formData.agreeTerms) errors.agreeTerms = '请同意条款和条件';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitResult(null);
    await submitMutation.mutateAsync({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      country: formData.country,
      investmentAmount: formData.investmentAmount,
      investmentCurrency: formData.investmentCurrency,
      walletAddress: formData.walletAddress,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const isSubmitting = submitMutation.isPending;
  // 已提交且状态为 pending 或 approved 时，隐藏表单
  const hideForm = submitResult?.success && (submitResult.status === 'pending' || submitResult.status === 'approved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* 页面头部 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC 白名单申请</h1>
          <p className="text-gray-500">完成身份验证，参与 PECT 私募轮投资</p>
        </div>

        {/* 流程说明 */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { step: "1", title: "填写信息", desc: "提交个人和投资信息" },
            { step: "2", title: "等待审核", desc: "管理员 1-3 工作日内审核" },
            { step: "3", title: "上链生效", desc: "审核通过后自动写入合约" },
          ].map(item => (
            <div key={item.step} className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                {item.step}
              </div>
              <p className="text-xs font-semibold text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* 已有钱包地址时显示当前申请状态 */}
        {formData.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress) && (
          <ApplicationStatus walletAddress={formData.walletAddress} />
        )}

        {/* 提交结果提示 */}
        {submitResult && (
          <Card className={`mb-6 border ${submitResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                {submitResult.success
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                }
                <p className={`text-sm font-medium ${submitResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {submitResult.message}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 申请表单 */}
        {!hideForm && (
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
                申请信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* 个人信息 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">个人信息</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        完整姓名 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="请输入真实姓名"
                        className={validationErrors.fullName ? 'border-red-400' : ''}
                        disabled={isSubmitting}
                      />
                      {validationErrors.fullName && <p className="mt-1 text-xs text-red-500">{validationErrors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        国家/地区 <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                          validationErrors.country ? 'border-red-400' : 'border-gray-300'
                        }`}
                      >
                        <option value="">请选择</option>
                        {COUNTRIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      {validationErrors.country && <p className="mt-1 text-xs text-red-500">{validationErrors.country}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        邮箱地址 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className={validationErrors.email ? 'border-red-400' : ''}
                        disabled={isSubmitting}
                      />
                      {validationErrors.email && <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        联系电话 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+86 138 0000 0000"
                        className={validationErrors.phone ? 'border-red-400' : ''}
                        disabled={isSubmitting}
                      />
                      {validationErrors.phone && <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* 投资信息 */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">投资信息</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      预计投资金额 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        name="investmentAmount"
                        value={formData.investmentAmount}
                        onChange={handleChange}
                        placeholder="10000"
                        className={`flex-1 ${validationErrors.investmentAmount ? 'border-red-400' : ''}`}
                        disabled={isSubmitting}
                        min="0"
                        step="0.01"
                      />
                      <select
                        name="investmentCurrency"
                        value={formData.investmentCurrency}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="ETH">ETH</option>
                        <option value="CNY">CNY</option>
                      </select>
                    </div>
                    {validationErrors.investmentAmount && <p className="mt-1 text-xs text-red-500">{validationErrors.investmentAmount}</p>}
                  </div>
                </div>

                {/* 钱包信息 */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">钱包信息</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      钱包地址 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        name="walletAddress"
                        value={formData.walletAddress}
                        onChange={handleChange}
                        placeholder="0x..."
                        className={`flex-1 font-mono text-sm ${validationErrors.walletAddress ? 'border-red-400' : ''}`}
                        disabled={isSubmitting}
                      />
                      {isConnected && account && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, walletAddress: account }))}
                          disabled={isSubmitting}
                          className="whitespace-nowrap text-xs"
                        >
                          自动填充
                        </Button>
                      )}
                    </div>
                    {validationErrors.walletAddress && <p className="mt-1 text-xs text-red-500">{validationErrors.walletAddress}</p>}
                    {!isConnected && (
                      <p className="mt-1 text-xs text-amber-600">💡 连接钱包后可自动填充地址</p>
                    )}
                  </div>
                </div>

                {/* 条款同意 */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-600">
                      我已阅读并同意{' '}
                      <a href="#" className="text-emerald-600 hover:underline">服务条款</a>
                      {' '}和{' '}
                      <a href="#" className="text-emerald-600 hover:underline">隐私政策</a>
                      ，确认所填信息真实有效。<span className="text-red-500">*</span>
                    </span>
                  </label>
                  {validationErrors.agreeTerms && <p className="mt-1 text-xs text-red-500 ml-7">{validationErrors.agreeTerms}</p>}
                </div>

                {/* 提交按钮 */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 rounded-lg"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中...</>
                    ) : '提交 KYC 申请'}
                  </Button>
                </div>

                {/* 底部提示 */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>📋 审核流程：</strong>
                    提交后管理员将在 1-3 个工作日内完成审核。审核通过后，您的钱包地址将自动写入 PVCoin 合约白名单，无需额外操作。
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 联系方式 */}
        <div className="mt-8 text-center text-sm text-gray-400">
          有问题？请联系：
          <a href="mailto:support@pect.io" className="text-emerald-600 hover:underline ml-1">
            support@pect.io
          </a>
        </div>
      </div>
    </div>
  );
}
