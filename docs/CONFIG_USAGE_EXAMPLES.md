# 配置文件使用示例

## 基本导入和使用

### 导入配置

```typescript
import { 
  CONTRACTS, 
  RPC_CONFIG, 
  CHAINLINK_CONFIG,
  TOKEN_CONFIG,
  UNISWAP_CONFIG,
  isValidAddress,
  areAllContractsConfigured,
  getUnconfiguredContracts
} from '@/config/contracts';
```

## 示例 1：初始化以太坊提供者

```typescript
import { ethers } from 'ethers';
import { RPC_CONFIG } from '@/config/contracts';

// 创建 JSON-RPC 提供者
const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url, RPC_CONFIG.chainId);

// 获取当前区块号
const blockNumber = await provider.getBlockNumber();
console.log(`当前区块号: ${blockNumber}`);

// 获取账户余额
const balance = await provider.getBalance('0x...');
console.log(`账户余额: ${ethers.formatEther(balance)} ETH`);
```

## 示例 2：连接到智能合约

```typescript
import { ethers } from 'ethers';
import { CONTRACTS, RPC_CONFIG } from '@/config/contracts';

// 创建提供者
const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);

// PVCoin 合约 ABI（简化示例）
const PVCoinABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

// 创建合约实例
const pvCoin = new ethers.Contract(
  CONTRACTS.PVCoin,
  PVCoinABI,
  provider
);

// 查询余额
const balance = await pvCoin.balanceOf('0x...');
console.log(`PVCoin 余额: ${ethers.formatEther(balance)}`);
```

## 示例 3：与签名者交互

```typescript
import { ethers } from 'ethers';
import { CONTRACTS, RPC_CONFIG } from '@/config/contracts';

// 连接到 MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 创建合约实例（带签名者）
const pvCoin = new ethers.Contract(
  CONTRACTS.PVCoin,
  PVCoinABI,
  signer
);

// 发送交易
const tx = await pvCoin.transfer('0x...', ethers.parseEther('100'));
const receipt = await tx.wait();
console.log('交易已确认:', receipt.hash);
```

## 示例 4：读取 Chainlink 数据

```typescript
import { ethers } from 'ethers';
import { CHAINLINK_CONFIG, RPC_CONFIG } from '@/config/contracts';

// Chainlink 聚合器 ABI
const AggregatorABI = [
  'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
  'function decimals() view returns (uint8)',
];

const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);

// 读取 RMB/USDT 汇率
const rmbUsdtAggregator = new ethers.Contract(
  CHAINLINK_CONFIG.dataFeeds.rmbUsdt,
  AggregatorABI,
  provider
);

const [, answer, , ,] = await rmbUsdtAggregator.latestRoundData();
const decimals = await rmbUsdtAggregator.decimals();

// 转换为可读格式
const rate = Number(answer) / Math.pow(10, decimals);
console.log(`RMB/USDT 汇率: ${rate}`);
```

## 示例 5：验证配置

```typescript
import { 
  areAllContractsConfigured, 
  getUnconfiguredContracts,
  isValidAddress,
  CONTRACTS 
} from '@/config/contracts';

// 检查所有合约是否已配置
if (!areAllContractsConfigured()) {
  const unconfigured = getUnconfiguredContracts();
  console.error('未配置的合约:', unconfigured);
  // 显示错误提示给用户
}

// 验证单个地址
const pvCoinAddress = CONTRACTS.PVCoin;
if (isValidAddress(pvCoinAddress)) {
  console.log('PVCoin 地址有效');
} else {
  console.error('PVCoin 地址无效');
}
```

## 示例 6：在 React 组件中使用

```typescript
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, RPC_CONFIG } from '@/config/contracts';

export function PVCoinBalance() {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);
        
        const pvCoin = new ethers.Contract(
          CONTRACTS.PVCoin,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );

        const balance = await pvCoin.balanceOf('0x...');
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('获取余额失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  if (loading) return <div>加载中...</div>;
  return <div>PVCoin 余额: {balance}</div>;
}
```

## 示例 7：处理多个网络

```typescript
import { NETWORK_CONFIG, getNetworkConfig } from '@/config/contracts';

// 获取所有支持的网络
Object.entries(NETWORK_CONFIG).forEach(([type, config]) => {
  console.log(`${type}: ${config.name} (Chain ID: ${config.chainId})`);
});

// 根据链 ID 获取网络配置
const currentChainId = 80002; // Polygon Amoy
const networkConfig = getNetworkConfig(currentChainId);

if (networkConfig) {
  console.log(`当前网络: ${networkConfig.name}`);
  console.log(`RPC URL: ${networkConfig.rpcUrl}`);
} else {
  console.error('不支持的网络');
}
```

## 示例 8：代币信息

```typescript
import { TOKEN_CONFIG } from '@/config/contracts';

// 获取代币信息
const pvCoinInfo = TOKEN_CONFIG.PVCoin;
console.log(`代币名称: ${pvCoinInfo.name}`);
console.log(`代币符号: ${pvCoinInfo.symbol}`);
console.log(`精度: ${pvCoinInfo.decimals}`);
console.log(`地址: ${pvCoinInfo.address}`);

// 格式化代币数量
const amount = 1000000000000000000n; // 1 个代币（18 位小数）
const formatted = ethers.formatUnits(amount, pvCoinInfo.decimals);
console.log(`格式化后: ${formatted} ${pvCoinInfo.symbol}`);
```

## 示例 9：Uniswap 交换

```typescript
import { ethers } from 'ethers';
import { CONTRACTS, UNISWAP_CONFIG, RPC_CONFIG, TOKEN_CONFIG } from '@/config/contracts';

const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);

// Uniswap V2 Router ABI（简化）
const RouterABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
];

const router = new ethers.Contract(
  UNISWAP_CONFIG.v2Router,
  RouterABI,
  provider
);

// 获取交换价格
const path = [TOKEN_CONFIG.USDT.address, CONTRACTS.PVCoin];
const amountIn = ethers.parseUnits('1', TOKEN_CONFIG.USDT.decimals);
const amounts = await router.getAmountsOut(amountIn, path);

console.log(`1 USDT = ${ethers.formatEther(amounts[1])} PVCoin`);
```

## 示例 10：错误处理

```typescript
import { CONTRACTS, RPC_CONFIG, isValidAddress } from '@/config/contracts';

async function safeContractCall() {
  try {
    // 验证配置
    if (!isValidAddress(CONTRACTS.PVCoin)) {
      throw new Error('PVCoin 地址配置无效');
    }

    // 验证 RPC
    const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);
    const network = await provider.getNetwork();
    
    if (network.chainId !== RPC_CONFIG.chainId) {
      throw new Error(
        `网络不匹配: 期望 ${RPC_CONFIG.chainId}, 实际 ${network.chainId}`
      );
    }

    // 执行操作
    // ...
  } catch (error) {
    console.error('操作失败:', error);
    // 显示用户友好的错误消息
  }
}
```

## 示例 11：环境特定配置

```typescript
import { RPC_CONFIG, CONTRACTS } from '@/config/contracts';

// 根据环境选择配置
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

if (isDevelopment) {
  console.log('开发环境');
  console.log(`RPC: ${RPC_CONFIG.url}`);
  console.log(`Chain ID: ${RPC_CONFIG.chainId}`);
}

if (isProduction) {
  console.log('生产环境');
  console.log(`RPC: ${RPC_CONFIG.url}`);
  console.log(`Chain ID: ${RPC_CONFIG.chainId}`);
}

// 验证关键配置
if (!CONTRACTS.PVCoin.startsWith('0x')) {
  throw new Error('PVCoin 地址配置不正确');
}
```

## 示例 12：配置日志

```typescript
import { CONTRACTS, RPC_CONFIG, CHAINLINK_CONFIG } from '@/config/contracts';

function logConfiguration() {
  console.group('=== 应用配置 ===');
  
  console.group('合约地址');
  Object.entries(CONTRACTS).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });
  console.groupEnd();

  console.group('RPC 配置');
  console.log(`URL: ${RPC_CONFIG.url}`);
  console.log(`Chain ID: ${RPC_CONFIG.chainId}`);
  console.log(`网络: ${RPC_CONFIG.networkName}`);
  console.log(`浏览器: ${RPC_CONFIG.explorerUrl}`);
  console.groupEnd();

  console.group('Chainlink 配置');
  console.log(`Oracle: ${CHAINLINK_CONFIG.oracleAddress}`);
  console.log(`RMB/USDT: ${CHAINLINK_CONFIG.dataFeeds.rmbUsdt}`);
  console.log(`C2Coin: ${CHAINLINK_CONFIG.dataFeeds.c2Coin}`);
  console.log(`PVCoin: ${CHAINLINK_CONFIG.dataFeeds.pvCoin}`);
  console.groupEnd();

  console.groupEnd();
}

// 在应用启动时调用
logConfiguration();
```

## 类型安全

所有配置都有完整的 TypeScript 类型支持：

```typescript
import type { 
  ContractAddresses, 
  RpcConfig, 
  ChainlinkConfig,
  TokenConfig,
  UniswapConfig
} from '@/config/contracts';

// 类型检查
const contracts: ContractAddresses = CONTRACTS;
const rpc: RpcConfig = RPC_CONFIG;
const chainlink: ChainlinkConfig = CHAINLINK_CONFIG;
```

## 常见错误和解决方案

### 错误 1: "Cannot read property of undefined"

```typescript
// ❌ 错误
const address = CONTRACTS.PVCoin;
if (address === '0x0000...') { // 比较失败

// ✅ 正确
import { isValidAddress } from '@/config/contracts';
if (isValidAddress(address)) {
  // 使用地址
}
```

### 错误 2: "Invalid RPC URL"

```typescript
// ❌ 错误
const provider = new ethers.JsonRpcProvider('invalid-url');

// ✅ 正确
import { RPC_CONFIG } from '@/config/contracts';
const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);
```

### 错误 3: "Network mismatch"

```typescript
// ❌ 错误
// 假设用户连接到主网，但配置是 Amoy

// ✅ 正确
const provider = new ethers.BrowserProvider(window.ethereum);
const network = await provider.getNetwork();
if (network.chainId !== RPC_CONFIG.chainId) {
  alert(`请切换到 ${RPC_CONFIG.networkName}`);
}
```

## 最佳实践

1. **总是验证配置**：在应用启动时检查所有必需的配置
2. **使用类型**：利用 TypeScript 类型检查
3. **错误处理**：为网络错误和配置错误提供适当的处理
4. **日志记录**：在开发时记录配置信息便于调试
5. **环境分离**：为不同环境使用不同的配置文件
