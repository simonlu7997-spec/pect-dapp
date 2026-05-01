/**
 * adminSecurity.ts
 * M-01 缓解措施：提供合约地址透明度接口和安全状态查询
 * 管理员可在安全中心页面查看所有合约地址和 Owner 信息
 */
import { ethers } from "ethers";
import { z } from "zod";
import { ENV } from "../_core/env";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

// 最小化 ABI：仅需 owner() 函数
const OWNABLE_ABI = [
  "function owner() external view returns (address)",
  "function paused() external view returns (bool)",
];

async function getProvider() {
  return new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
}

/** 查询合约的 owner 地址 */
async function getContractOwner(address: string): Promise<string | null> {
  try {
    const provider = await getProvider();
    const contract = new ethers.Contract(address, OWNABLE_ABI, provider);
    return await contract.owner();
  } catch {
    return null;
  }
}

/** 查询合约是否暂停 */
async function getContractPaused(address: string): Promise<boolean | null> {
  try {
    const provider = await getProvider();
    const contract = new ethers.Contract(address, OWNABLE_ABI, provider);
    return await contract.paused();
  } catch {
    return null;
  }
}

export const adminSecurityRouter = router({
  /**
   * 获取所有合约地址和安全状态（公开接口，用于首页透明度展示）
   */
  getContractAddresses: publicProcedure.query(async () => {
    const contracts = [
      { name: "PV-Coin (PVC)", key: "pvCoin", address: ENV.pvCoinAddress },
      { name: "C2-Coin (C2)", key: "c2Coin", address: ENV.c2CoinAddress },
      { name: "私募合约 (PrivateSale)", key: "privateSale", address: ENV.privateSaleAddress },
      { name: "公募合约 (PublicSale)", key: "publicSale", address: ENV.publicSaleAddress },
      { name: "分红合约 (RevenueDistributor)", key: "revenueDistributor", address: ENV.revenueDistributorAddress },
      { name: "质押合约 (StakingManager)", key: "stakingManager", address: ENV.stakingManagerAddress },
      { name: "USDT", key: "usdt", address: ENV.usdtAddress },
    ];
    return contracts.map(c => ({
      name: c.name,
      key: c.key,
      address: c.address || "未配置",
    }));
  }),

  /**
   * 获取安全状态详情（仅管理员）：包括链上 owner 地址验证
   */
  getSecurityStatus: adminProcedure.query(async () => {
    const contractsToCheck = [
      { name: "PV-Coin", address: ENV.pvCoinAddress, hasPause: true },
      { name: "C2-Coin", address: ENV.c2CoinAddress, hasPause: false },
      { name: "PrivateSale", address: ENV.privateSaleAddress, hasPause: true },
      { name: "PublicSale", address: ENV.publicSaleAddress, hasPause: true },
      { name: "RevenueDistributor", address: ENV.revenueDistributorAddress, hasPause: false },
      { name: "StakingManager", address: ENV.stakingManagerAddress, hasPause: false },
    ];

    const results = await Promise.all(
      contractsToCheck.map(async (c) => {
        if (!c.address) {
          return { name: c.name, address: "未配置", owner: null, paused: null, ownerMismatch: false };
        }
        const [owner, paused] = await Promise.all([
          getContractOwner(c.address),
          c.hasPause ? getContractPaused(c.address) : Promise.resolve(null),
        ]);
        // 检查链上 owner 是否与 deployer 地址一致
        let deployerAddress: string | null = null;
        try {
          const wallet = new ethers.Wallet(ENV.deployerPrivateKey);
          deployerAddress = wallet.address;
        } catch {
          deployerAddress = null;
        }
        const ownerMismatch = owner && deployerAddress
          ? owner.toLowerCase() !== deployerAddress.toLowerCase()
          : false;
        return {
          name: c.name,
          address: c.address,
          owner,
          paused,
          ownerMismatch,
        };
      })
    );

    // 获取 deployer 地址（不暴露私钥）
    let deployerAddress: string | null = null;
    try {
      const wallet = new ethers.Wallet(ENV.deployerPrivateKey);
      deployerAddress = wallet.address;
    } catch {
      deployerAddress = null;
    }

    return {
      deployerAddress,
      contracts: results,
      // M-01 风险提示：当前使用单一 EOA 作为 Owner
      securityWarnings: [
        {
          id: "M-01",
          severity: "medium",
          title: "Owner 单点控制风险",
          description:
            "所有合约均使用单一 EOA 地址作为 Owner。建议迁移至多签钱包（如 Gnosis Safe），要求至少 2/3 签名才能执行敏感操作。",
          recommendation: "将 Owner 替换为 Gnosis Safe 多签地址，并对高风险参数变更引入 TimeLock（24-48 小时延迟）。",
          status: "open",
        },
      ],
    };
  }),
});
