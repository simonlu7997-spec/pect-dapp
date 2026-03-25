import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface WhitelistFormData {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  investmentAmount: string;
  investmentCurrency: string;
  walletAddress: string;
  agreeTerms: boolean;
}

export function useWhitelistForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 使用 tRPC mutation 调用后端 API
  const submitMutation = trpc.whitelist.submit.useMutation({
    onSuccess: (data) => {
      setSuccess(true);
      setError(null);
      console.log('[Whitelist] 提交成功:', data.message);
    },
    onError: (err) => {
      setError(err.message || '提交失败，请重试');
      setSuccess(false);
      console.error('[Whitelist] 提交失败:', err);
    },
  });

  const submitWhitelist = async (formData: WhitelistFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await submitMutation.mutateAsync({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        investmentAmount: formData.investmentAmount,
        investmentCurrency: formData.investmentCurrency,
        walletAddress: formData.walletAddress,
      });
    } catch (err) {
      // 错误已在 onError 中处理
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitWhitelist,
    isLoading: isLoading || submitMutation.isPending,
    error,
    success,
  };
}
