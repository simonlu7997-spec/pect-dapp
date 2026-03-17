/**
 * 智能合约配置文件
 * 
 * 包含所有智能合约地址、RPC 配置和 Chainlink 配置
 * 支持通过环境变量覆盖默认值
 * 
 * 环境变量优先级：
 * 1. VITE_* 环境变量（最高优先级）
 * 2. 配置文件中的默认值
 * 
 * 使用示例：
 * import { CONTRACTS, RPC_CONFIG, CHAINLINK_CONFIG } from '@/config/contracts';
 * 
 * const pvCoinAddress = CONTRACTS.PVCoin;
 * const rpcUrl = RPC_CONFIG.url;
 */

// ====================================================================
//                          网络配置
// ====================================================================

/**
 * 支持的网络类型
 */
export enum NetworkType {
  LOCALHOST = 'localhost',
  AMOY = 'amoy',
  POLYGON = 'polygon',
}

/**
 * 网络配置映射
 */
export const NETWORK_CONFIG = {
  [NetworkType.LOCALHOST]: {
    name: 'Localhost',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
  },
  [NetworkType.AMOY]: {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
  },
  [NetworkType.POLYGON]: {
    name: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
  },
} as const;

// ====================================================================
//                          智能合约地址配置
// ====================================================================

/**
 * 智能合约地址
 * 
 * 注意：
 * - 所有地址都支持通过环境变量覆盖
 * - 环境变量名称格式：VITE_[合约名称]_ADDRESS
 * - 例如：VITE_PV_COIN_ADDRESS、VITE_C2_COIN_ADDRESS 等
 */
export const CONTRACTS = {
  // ====================================================================
  // 代币合约
  // ====================================================================
  
  /**
   * PVCoin - 光伏币
   * 用途：光伏电站收益分配
   * 精度：6 位小数
   */
  PVCoin: process.env.VITE_PV_COIN_ADDRESS || '0x60F1E9deA2cBE622Bc86562f2bb62e2A9A479D0D',

  /**
   * C2Coin - 碳信用币
   * 用途：碳信用交易和奖励
   * 精度：6 位小数
   */
  C2Coin: process.env.VITE_C2_COIN_ADDRESS || '0x8e71a6131C391963E562e8593905b4513f5B5278',

  // ====================================================================
  // 业务合约
  // ====================================================================

  /**
   * RevenueDistributor - 收益分配合约
   * 用途：分配光伏电站收益给 PVCoin 持有者
   */
  RevenueDistributor: process.env.VITE_REVENUE_DISTRIBUTOR_ADDRESS || '0x40434E74aF82225451d06C664FDF28229c53b8f1',

  /**
   * StakingManager - 质押管理合约
   * 用途：管理 C2Coin 质押和奖励
   */
  StakingManager: process.env.VITE_STAKING_MANAGER_ADDRESS || '0xD5Fd44eC8737858466bE7DBb827A6d97cd066c82',

  /**
   * C2CoinBuyback - C2Coin 回购合约
   * 用途：定期回购 C2Coin，支持 Uniswap V2/V3
   */
  C2CoinBuyback: process.env.VITE_C2_COIN_BUYBACK_ADDRESS || '0x4E52a6065421B1f4bc6aa04252Edff3Ea54597bc',

  // ====================================================================
  // 销售合约
  // ====================================================================

  /**
   * PrivateSale - 私募销售合约
   * 用途：PVCoin 私募销售
   * 初始汇率：1 USDT = 10 PVCoin
   */
  PrivateSale: process.env.VITE_PRIVATE_SALE_ADDRESS || '0x81D5B063cF16FF7EC56491596b379314C8f28411',

  /**
   * PublicSale - 公募销售合约
   * 用途：PVCoin 公募销售
   * 初始汇率：1 USDT = 10 PVCoin
   */
  PublicSale: process.env.VITE_PUBLIC_SALE_ADDRESS || '0xF350c772fF2c8672F1F271a296545c4cEef6EaFd',

  // ====================================================================
  // 预言机合约
  // ====================================================================

  /**
   * ElectricityPriceOracle - 电价预言机合约
   * 用途：提供发电量、收入、汇率和币价数据
   * 数据来源：
   *   - RMB/USDT 汇率: Chainlink Data Feeds
   *   - C2Coin 价格: Chainlink Data Feeds
   *   - PVCoin 价格: Chainlink Data Feeds
   *   - 发电量和收入: 预言机节点 (Any API)
   */
  ElectricityPriceOracle: process.env.VITE_ORACLE_ADDRESS || '0x56f5eb47F737451ecE54123768b38e8e2f667b94',
} as const;

// ====================================================================
//                          RPC 配置
// ====================================================================

/**
 * RPC 配置
 * 
 * 支持通过环境变量覆盖：
 * - VITE_RPC_URL: 自定义 RPC 地址
 * - VITE_CHAIN_ID: 自定义链 ID
 * 
 * 默认使用 Polygon Amoy 测试网络
 */
export const RPC_CONFIG = {
  /**
   * RPC 端点 URL
   * 默认：Polygon Amoy 测试网
   */
  url: process.env.VITE_RPC_URL || 'https://rpc-amoy.polygon.technology',

  /**
   * 链 ID
   * 80002 = Polygon Amoy 测试网
   * 137 = Polygon 主网
   * 31337 = Localhost
   */
  chainId: parseInt(process.env.VITE_CHAIN_ID || '80002', 10),

  /**
   * 网络名称
   */
  networkName: process.env.VITE_NETWORK_NAME || 'Polygon Amoy',

  /**
   * 区块浏览器 URL
   */
  explorerUrl: process.env.VITE_EXPLORER_URL || 'https://amoy.polygonscan.com',
} as const;

// ====================================================================
//                          Chainlink 配置
// ====================================================================

/**
 * Chainlink 数据源配置
 * 
 * 用于获取实时价格数据：
 * - RMB/USDT 汇率
 * - C2Coin 市场价格
 * - PVCoin 市场价格
 * 
 * 支持通过环境变量覆盖：
 * - VITE_CHAINLINK_ORACLE_ADDRESS: 预言机合约地址
 * - VITE_CHAINLINK_RMB_USDT_FEED: RMB/USDT 数据源
 * - VITE_CHAINLINK_C2COIN_FEED: C2Coin 数据源
 * - VITE_CHAINLINK_PVCOIN_FEED: PVCoin 数据源
 */
export const CHAINLINK_CONFIG = {
  /**
   * ElectricityPriceOracle 合约地址
   * 用于获取链上数据
   */
  oracleAddress: process.env.VITE_CHAINLINK_ORACLE_ADDRESS || '0x56f5eb47F737451ecE54123768b38e8e2f667b94',

  /**
   * Chainlink 数据源地址（Polygon Amoy）
   * 
   * 注意：这些是示例地址，实际部署时需要使用真实的 Chainlink 聚合器地址
   * 可以从 https://docs.chain.link/data-feeds/price-feeds/addresses 查询
   */
  dataFeeds: {
    /**
     * RMB/USDT 汇率数据源
     * 精度：6 位小数
     */
    rmbUsdt: process.env.VITE_CHAINLINK_RMB_USDT_FEED || '0x8a422a194ED336C55C9Ea1A1495DD87407777Dba',

    /**
     * C2Coin/USDT 价格数据源
     * 精度：6 位小数
     */
    c2Coin: process.env.VITE_CHAINLINK_C2COIN_FEED || '0x6B6Eae9619C266202c014C0F01C2c5A8348b4c08',

    /**
     * PVCoin/USDT 价格数据源
     * 精度：6 位小数
     */
    pvCoin: process.env.VITE_CHAINLINK_PVCOIN_FEED || '0xDBFbc402765a123764232487F14d31c5cF9756DF',
  },

  /**
   * 数据精度配置
   * 所有价格数据都使用 6 位小数精度
   */
  precision: {
    rmbUsdt: 6,      // RMB/USDT 汇率：6 位小数
    c2CoinPrice: 6,  // C2Coin 价格：6 位小数
    pvCoinPrice: 6,  // PVCoin 价格：6 位小数
    generation: 0,   // 发电量：无小数（单位 kWh）
    revenue: 6,      // 收入：6 位小数（单位 USDT）
  },

  /**
   * 数据新鲜度阈值（秒）
   * 如果数据超过此时间未更新，则认为数据过期
   */
  dataFreshnessThreshold: 86400, // 24 小时
} as const;

// ====================================================================
//                          代币配置
// ====================================================================

/**
 * 代币配置
 * 
 * 包含代币的基本信息和精度配置
 */
export const TOKEN_CONFIG = {
  /**
   * PVCoin 配置
   */
  PVCoin: {
    name: 'PVCoin',
    symbol: 'PV',
    decimals: 6,
    address: CONTRACTS.PVCoin,
  },

  /**
   * C2Coin 配置
   */
  C2Coin: {
    name: 'C2Coin',
    symbol: 'C2',
    decimals: 6,
    address: CONTRACTS.C2Coin,
  },

  /**
   * USDT 配置（Polygon Amoy）
   */
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    address: process.env.VITE_USDT_ADDRESS || '0xf889dfa134E8fa22562fC40119e1B3CD2376aD94',
  },
} as const;

// ====================================================================
//                          Uniswap 配置
// ====================================================================

/**
 * Uniswap 配置
 * 
 * 用于 C2CoinBuyback 合约的交换操作
 */
export const UNISWAP_CONFIG = {
  /**
   * Uniswap V2 Router 地址（Polygon）
   */
  v2Router: process.env.VITE_UNISWAP_V2_ROUTER || '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',

  /**
   * Uniswap V3 Router 地址（Polygon）
   */
  v3Router: process.env.VITE_UNISWAP_V3_ROUTER || '0x71819D7210f12cf6d14D6460C00eC60aC5e4D0e8',

  /**
   * Uniswap V3 Factory 地址（Polygon）
   */
  v3Factory: process.env.VITE_UNISWAP_V3_FACTORY || '0x1F98431c8aD98523631AE4a59f267346ea31F984',

  /**
   * 默认费用等级（万分之几）
   * 500 = 0.05%
   * 3000 = 0.3%
   * 10000 = 1%
   */
  defaultFeeLevel: 3000,
} as const;

// ====================================================================
//                          验证函数
// ====================================================================

/**
 * 验证合约地址是否有效
 * 
 * @param address - 要验证的地址
 * @returns 如果地址有效则返回 true，否则返回 false
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 验证所有合约地址是否已配置
 * 
 * @returns 如果所有地址都已配置则返回 true，否则返回 false
 */
export function areAllContractsConfigured(): boolean {
  return Object.values(CONTRACTS).every(
    (address) => isValidAddress(address)
  );
}

/**
 * 获取未配置的合约列表
 * 
 * @returns 未配置的合约名称列表
 */
export function getUnconfiguredContracts(): string[] {
  return Object.entries(CONTRACTS)
    .filter(([, address]) => !isValidAddress(address))
    .map(([name]) => name);
}

/**
 * 获取网络配置
 * 
 * @param chainId - 链 ID
 * @returns 网络配置对象，如果未找到则返回 undefined
 */
export function getNetworkConfig(chainId: number) {
  return Object.values(NETWORK_CONFIG).find((config) => config.chainId === chainId);
}

// ====================================================================
//                          类型导出
// ====================================================================

/**
 * 合约地址类型
 */
export type ContractAddresses = typeof CONTRACTS;

/**
 * RPC 配置类型
 */
export type RpcConfig = typeof RPC_CONFIG;

/**
 * Chainlink 配置类型
 */
export type ChainlinkConfig = typeof CHAINLINK_CONFIG;

/**
 * 代币配置类型
 */
export type TokenConfig = typeof TOKEN_CONFIG;

/**
 * Uniswap 配置类型
 */
export type UniswapConfig = typeof UNISWAP_CONFIG;
