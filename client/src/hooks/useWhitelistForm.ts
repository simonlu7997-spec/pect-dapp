import { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { useWhitelist } from '@/contexts/WhitelistContext';
import { CONTRACTS } from '@/config/contracts';
import { ethers } from 'ethers';

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
  const { signer } = useWalletContext();
  const { addWhitelistEntry } = useWhitelist();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitWhitelist = async (formData: WhitelistFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 验证签名者
      if (!signer) {
        throw new Error('钱包未连接，请先连接钱包');
      }

      // 验证钱包地址
      if (!ethers.isAddress(formData.walletAddress)) {
        throw new Error('无效的钱包地址');
      }

      // 获取 PVCoin 合约实例
      const pvCoinAddress = CONTRACTS.PVCoin;
      if (!pvCoinAddress || pvCoinAddress === '0x...') {
        throw new Error('PVCoin 合约地址未配置');
      }

      // PVCoin ABI（只需要我们使用的函数）
      const PVCoinABI = [
        'function addKyc(address _account) external',
        'function addSenderWhitelist(address _account) external',
        'function isKycVerified(address _account) external view returns (bool)',
        'function isSenderWhitelisted(address _account) external view returns (bool)',
      ];

      const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, signer);

      // 检查地址是否已在白名单中
      const isKycVerified = await pvCoinContract.isKycVerified(formData.walletAddress);
      const isSenderWhitelisted = await pvCoinContract.isSenderWhitelisted(formData.walletAddress);

      if (isKycVerified && isSenderWhitelisted) {
        setSuccess(true);
        return; // 已经在白名单中
      }

      // 添加到 KYC 白名单
      if (!isKycVerified) {
        console.log('添加到 KYC 白名单...');
        const kycTx = await pvCoinContract.addKyc(formData.walletAddress);
        console.log('KYC 交易哈希:', kycTx.hash);
        await kycTx.wait();
        console.log('KYC 白名单添加成功');
      }

      // 添加到发送方白名单
      if (!isSenderWhitelisted) {
        console.log('添加到发送方白名单...');
        const senderTx = await pvCoinContract.addSenderWhitelist(formData.walletAddress);
        console.log('发送方白名单交易哈希:', senderTx.hash);
        await senderTx.wait();
        console.log('发送方白名单添加成功');
      }

      // 保存到白名单 Context
      await addWhitelistEntry({
        walletAddress: formData.walletAddress,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        investmentAmount: formData.investmentAmount,
        investmentCurrency: formData.investmentCurrency,
        isKycVerified: true,
        isSenderWhitelisted: true,
      });

      setSuccess(true);
    } catch (err) {
      console.error('白名单提交错误:', err);
      
      let errorMessage = '提交失败，请重试';
      
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          errorMessage = '您已拒绝交易';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = '账户余额不足以支付 Gas 费用';
        } else if (err.message.includes('execution reverted')) {
          errorMessage = '交易执行失败，请检查钱包地址和权限';
        } else if (err.message.includes('already in whitelist')) {
          errorMessage = '该钱包地址已在白名单中';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitWhitelist,
    isLoading,
    error,
    success,
  };
}
