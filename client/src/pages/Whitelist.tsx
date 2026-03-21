import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useWalletContext } from '@/contexts/WalletContext';
import { useWhitelistForm } from '@/hooks/useWhitelistForm';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function Whitelist() {
  const { account, isConnected } = useWalletContext();
  const { submitWhitelist, isLoading, error, success } = useWhitelistForm();

  // 表单状态
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    investmentAmount: '',
    investmentCurrency: 'USDT',
    walletAddress: account || '',
    agreeTerms: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = '请输入完整姓名';
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!formData.phone.trim()) {
      errors.phone = '请输入联系电话';
    }

    if (!formData.country.trim()) {
      errors.country = '请选择国家/地区';
    }

    if (!formData.investmentAmount.trim() || isNaN(Number(formData.investmentAmount))) {
      errors.investmentAmount = '请输入有效的投资金额';
    }

    if (!formData.walletAddress.trim() || !/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
      errors.walletAddress = '请输入有效的钱包地址';
    }

    if (!formData.agreeTerms) {
      errors.agreeTerms = '请同意条款和条件';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!isConnected) {
      setValidationErrors({ wallet: '请先连接钱包' });
      return;
    }

    await submitWhitelist(formData);
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // 清除该字段的错误信息
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: '',
      });
    }
  };

  // 自动填充钱包地址
  const handleAutoFillWallet = () => {
    if (account) {
      setFormData({
        ...formData,
        walletAddress: account,
      });
      if (validationErrors.walletAddress) {
        setValidationErrors({
          ...validationErrors,
          walletAddress: '',
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            加入 PECT 白名单
          </h1>
          <p className="text-lg text-slate-600">
            填写以下信息以加入我们的私募轮投资者白名单
          </p>
        </div>

        {/* 成功消息 */}
        {success && (
          <Card className="mb-8 p-6 bg-green-50 border-green-200">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  白名单申请成功！
                </h3>
                <p className="text-green-700">
                  您的钱包地址已成功添加到 PVCoin 白名单和 KYC 名单中。
                  您现在可以参与 PVCoin 的销售和转账。
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 错误消息 */}
        {error && (
          <Card className="mb-8 p-6 bg-red-50 border-red-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  提交失败
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 表单 */}
        <Card className="p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 个人信息部分 */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                个人信息
              </h2>

              {/* 完整姓名 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  完整姓名 *
                </label>
                <Input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="请输入您的完整姓名"
                  className={validationErrors.fullName ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {validationErrors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.fullName}</p>
                )}
              </div>

              {/* 邮箱 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  邮箱地址 *
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className={validationErrors.email ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {/* 电话 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  联系电话 *
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+86 10 1234 5678"
                  className={validationErrors.phone ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {validationErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                )}
              </div>

              {/* 国家/地区 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  国家/地区 *
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.country ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">请选择国家/地区</option>
                  <option value="CN">中国</option>
                  <option value="US">美国</option>
                  <option value="SG">新加坡</option>
                  <option value="HK">香港</option>
                  <option value="JP">日本</option>
                  <option value="KR">韩国</option>
                  <option value="GB">英国</option>
                  <option value="DE">德国</option>
                  <option value="FR">法国</option>
                  <option value="AU">澳大利亚</option>
                  <option value="OTHER">其他</option>
                </select>
                {validationErrors.country && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.country}</p>
                )}
              </div>
            </div>

            {/* 投资信息部分 */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                投资信息
              </h2>

              {/* 投资金额 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  投资金额 *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    name="investmentAmount"
                    value={formData.investmentAmount}
                    onChange={handleInputChange}
                    placeholder="10000"
                    className={`flex-1 ${validationErrors.investmentAmount ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                    step="0.01"
                    min="0"
                  />
                  <select
                    name="investmentCurrency"
                    value={formData.investmentCurrency}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                {validationErrors.investmentAmount && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.investmentAmount}</p>
                )}
              </div>
            </div>

            {/* 钱包信息部分 */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                钱包信息
              </h2>

              {/* 钱包地址 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  钱包地址 *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    name="walletAddress"
                    value={formData.walletAddress}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    className={`flex-1 ${validationErrors.walletAddress ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  {isConnected && account && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAutoFillWallet}
                      disabled={isLoading}
                    >
                      自动填充
                    </Button>
                  )}
                </div>
                {validationErrors.walletAddress && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.walletAddress}</p>
                )}
                {!isConnected && (
                  <p className="mt-1 text-sm text-amber-600">
                    💡 提示：连接钱包后可自动填充钱包地址
                  </p>
                )}
              </div>
            </div>

            {/* 条款同意 */}
            <div>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  我已阅读并同意{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    服务条款
                  </a>
                  {' '}和{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    隐私政策
                  </a>
                  ，并确认我的钱包地址和个人信息真实有效。 *
                </span>
              </label>
              {validationErrors.agreeTerms && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.agreeTerms}</p>
              )}
            </div>

            {/* 提交按钮 */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading || !isConnected}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '提交申请'
                )}
              </Button>
              {!isConnected && (
                <p className="mt-2 text-sm text-center text-amber-600">
                  请先连接钱包以提交申请
                </p>
              )}
            </div>

            {/* 信息提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ 提示：</strong>
                提交申请后，您的钱包地址将自动添加到 PVCoin 合约的白名单和 KYC 名单中。
                这可能需要几秒钟的时间来处理。
              </p>
            </div>
          </form>
        </Card>

        {/* 页脚信息 */}
        <div className="mt-8 text-center text-slate-600">
          <p>
            有问题？请联系我们：
            <a href="mailto:support@pect.io" className="text-blue-600 hover:underline ml-1">
              support@pect.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
