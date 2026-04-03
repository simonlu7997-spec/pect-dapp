import { useState } from 'react';
import { ethers } from 'ethers';
import { C2COIN_ABI, REVENUEDISTRIBUTOR_ABI, STAKINGMANAGER_ABI } from '@/contracts';

// ABI 从合约仓库自动同步，勿手动修改
const C2CoinABI = C2COIN_ABI;
const RevenueDistributorABI = REVENUEDISTRIBUTOR_ABI;
const StakingManagerABI = STAKINGMANAGER_ABI;

/**
 * Hook for claiming C2Coin, Revenue, and Staking Rewards
 */
export const useClaimRewards = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * 领取 C2Coin 奖励
   * @param c2CoinAddress C2Coin 合约地址
   * @param yearMonth 年月 (YYYYMM 格式)
   * @param signer 签名者
   */
  const claimC2Coin = async (
    c2CoinAddress: string,
    yearMonth: number,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const contract = new ethers.Contract(c2CoinAddress, C2CoinABI, signer);
      const tx = await contract.claimC2Coin(yearMonth);
      await tx.wait();

      setSuccess(true);
      return tx;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim C2Coin';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 领取 USDT 分红
   * @param revenueDistributorAddress RevenueDistributor 合约地址
   * @param month 月份 (YYYYMM 格式)
   * @param signer 签名者
   */
  const claimRevenue = async (
    revenueDistributorAddress: string,
    month: number,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const contract = new ethers.Contract(revenueDistributorAddress, RevenueDistributorABI, signer);
      const tx = await contract.claimRevenue(month);
      await tx.wait();

      setSuccess(true);
      return tx;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim revenue';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 领取质押奖励
   * @param stakingManagerAddress StakingManager 合约地址
   * @param month 月份 (YYYYMM 格式)
   * @param signer 签名者
   */
  const claimStakingReward = async (
    stakingManagerAddress: string,
    month: number,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const contract = new ethers.Contract(stakingManagerAddress, StakingManagerABI, signer);
      const tx = await contract.claimStakingReward(month);
      await tx.wait();

      setSuccess(true);
      return tx;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim staking reward';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取用户的 C2Coin 奖励
   */
  const getC2CoinReward = async (
    c2CoinAddress: string,
    userAddress: string,
    yearMonth: number,
    provider: ethers.Provider
  ) => {
    try {
      const contract = new ethers.Contract(c2CoinAddress, C2CoinABI, provider);
      const reward = await contract.getUserMonthlyReward(userAddress, yearMonth);
      return reward;
    } catch (err) {
      console.error('Failed to get C2Coin reward:', err);
      return BigInt(0);
    }
  };

  /**
   * 获取用户的分红
   */
  const getRevenueReward = async (
    revenueDistributorAddress: string,
    userAddress: string,
    month: number,
    provider: ethers.Provider
  ) => {
    try {
      const contract = new ethers.Contract(revenueDistributorAddress, RevenueDistributorABI, provider);
      const reward = await contract.getUserMonthlyRevenue(userAddress, month);
      return reward;
    } catch (err) {
      console.error('Failed to get revenue reward:', err);
      return BigInt(0);
    }
  };

  /**
   * 获取用户的质押奖励
   */
  const getStakingReward = async (
    stakingManagerAddress: string,
    userAddress: string,
    month: number,
    provider: ethers.Provider
  ) => {
    try {
      const contract = new ethers.Contract(stakingManagerAddress, StakingManagerABI, provider);
      const reward = await contract.getUserMonthlyReward(userAddress, month);
      return reward;
    } catch (err) {
      console.error('Failed to get staking reward:', err);
      return BigInt(0);
    }
  };

  return {
    loading,
    error,
    success,
    claimC2Coin,
    claimRevenue,
    claimStakingReward,
    getC2CoinReward,
    getRevenueReward,
    getStakingReward,
  };
};
