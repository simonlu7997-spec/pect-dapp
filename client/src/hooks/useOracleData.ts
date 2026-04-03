import { useState, useEffect } from 'react';
import { useReadContract } from './useContract';
import { ELECTRICITYPRICEORACLE_ABI } from '@/contracts';

// ABI 从合约仓库自动同步，勿手动修改
const ORACLE_ABI = ELECTRICITYPRICEORACLE_ABI;

export const useOracleData = (oracleAddress: string) => {
  const [data, setData] = useState({
    generation: '0',
    revenue: '0',
    rmbRate: '0',
    c2CoinPrice: '0',
    pvCoinPrice: '0',
  });
  const [loading, setLoading] = useState(true);

  const contract = useReadContract(oracleAddress, ORACLE_ABI);

  useEffect(() => {
    const fetchData = async () => {
      if (!contract) return;

      try {
        const [generation, revenue, rmbRate, c2Price, pvPrice] = await Promise.all([
          contract.getLatestGeneration(),
          contract.getLatestRevenue(),
          contract.getRMBUSDTRate(),
          contract.getC2CoinPrice(),
          contract.getPVCoinPrice(),
        ]);

        setData({
          generation: generation.toString(),
          revenue: revenue.toString(),
          rmbRate: rmbRate.toString(),
          c2CoinPrice: c2Price.toString(),
          pvCoinPrice: pvPrice.toString(),
        });
      } catch (error) {
        console.error('获取预言机数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // 每分钟更新一次

    return () => clearInterval(interval);
  }, [contract]);

  return { data, loading };
};
