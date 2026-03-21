# 环境变量配置指南

## 概述

PECT dAPP 使用环境变量来配置智能合约地址、RPC 端点和其他网络参数。所有环境变量都以 `VITE_` 前缀开头，以支持 Vite 的环境变量注入。

## 配置文件位置

- **配置文件**：`client/src/config/contracts.ts`
- **环境变量参考**：本文档

## 环境变量列表

### 智能合约地址

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_PV_COIN_ADDRESS` | PVCoin 代币合约地址 | `0x0000...` |
| `VITE_C2_COIN_ADDRESS` | C2Coin 代币合约地址 | `0x0000...` |
| `VITE_REVENUE_DISTRIBUTOR_ADDRESS` | 收益分配合约地址 | `0x0000...` |
| `VITE_STAKING_MANAGER_ADDRESS` | 质押管理合约地址 | `0x0000...` |
| `VITE_C2_COIN_BUYBACK_ADDRESS` | C2Coin 回购合约地址 | `0x0000...` |
| `VITE_PRIVATE_SALE_ADDRESS` | 私募销售合约地址 | `0x0000...` |
| `VITE_PUBLIC_SALE_ADDRESS` | 公募销售合约地址 | `0x0000...` |
| `VITE_ORACLE_ADDRESS` | 电价预言机合约地址 | `0x0000...` |

### RPC 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_RPC_URL` | RPC 端点 URL | `https://rpc-amoy.polygon.technology` |
| `VITE_CHAIN_ID` | 链 ID | `80002` (Polygon Amoy) |
| `VITE_NETWORK_NAME` | 网络名称 | `Polygon Amoy` |
| `VITE_EXPLORER_URL` | 区块浏览器 URL | `https://amoy.polygonscan.com` |

### Chainlink 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_CHAINLINK_ORACLE_ADDRESS` | Chainlink 预言机地址 | `0x0000...` |
| `VITE_CHAINLINK_RMB_USDT_FEED` | RMB/USDT 数据源地址 | `0x0000...` |
| `VITE_CHAINLINK_C2COIN_FEED` | C2Coin 数据源地址 | `0x0000...` |
| `VITE_CHAINLINK_PVCOIN_FEED` | PVCoin 数据源地址 | `0x0000...` |

### 代币配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_USDT_ADDRESS` | USDT 代币地址（Polygon Amoy） | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |

### Uniswap 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_UNISWAP_V2_ROUTER` | Uniswap V2 Router 地址 | `0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff` |
| `VITE_UNISWAP_V3_ROUTER` | Uniswap V3 Router 地址 | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| `VITE_UNISWAP_V3_FACTORY` | Uniswap V3 Factory 地址 | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |

## 使用方法

### 在代码中导入

```typescript
import { CONTRACTS, RPC_CONFIG, CHAINLINK_CONFIG } from '@/config/contracts';

// 使用合约地址
const pvCoinAddress = CONTRACTS.PVCoin;
const c2CoinAddress = CONTRACTS.C2Coin;

// 使用 RPC 配置
const rpcUrl = RPC_CONFIG.url;
const chainId = RPC_CONFIG.chainId;

// 使用 Chainlink 配置
const oracleAddress = CHAINLINK_CONFIG.oracleAddress;
```

### 验证配置

```typescript
import { 
  areAllContractsConfigured, 
  getUnconfiguredContracts,
  isValidAddress 
} from '@/config/contracts';

// 检查所有合约是否已配置
if (!areAllContractsConfigured()) {
  const unconfigured = getUnconfiguredContracts();
  console.error('未配置的合约:', unconfigured);
}

// 验证单个地址
if (isValidAddress(CONTRACTS.PVCoin)) {
  console.log('PVCoin 地址有效');
}
```

## 环境变量优先级

1. **最高优先级**：`.env.local` 文件中的值
2. **中等优先级**：`.env.[mode]` 文件中的值（如 `.env.production`）
3. **低优先级**：`.env` 文件中的值
4. **最低优先级**：`contracts.ts` 中的默认值

## 不同环境的配置

### 本地开发环境

```bash
# .env.local
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
VITE_NETWORK_NAME=Localhost
VITE_EXPLORER_URL=http://localhost:3000

# 合约地址（从本地部署脚本获取）
VITE_PV_COIN_ADDRESS=0x...
VITE_C2_COIN_ADDRESS=0x...
# ... 其他合约地址
```

### Polygon Amoy 测试网

```bash
# .env.amoy
VITE_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
VITE_NETWORK_NAME=Polygon Amoy
VITE_EXPLORER_URL=https://amoy.polygonscan.com

# 合约地址（从 Amoy 部署脚本获取）
VITE_PV_COIN_ADDRESS=0x...
VITE_C2_COIN_ADDRESS=0x...
# ... 其他合约地址
```

### Polygon 主网

```bash
# .env.production
VITE_RPC_URL=https://polygon-rpc.com
VITE_CHAIN_ID=137
VITE_NETWORK_NAME=Polygon Mainnet
VITE_EXPLORER_URL=https://polygonscan.com

# 合约地址（从主网部署脚本获取）
VITE_PV_COIN_ADDRESS=0x...
VITE_C2_COIN_ADDRESS=0x...
# ... 其他合约地址
```

## 获取合约地址

### 从部署脚本

部署脚本会输出所有合约地址。复制这些地址到环境变量：

```bash
# 部署到 Amoy
npx hardhat run scripts/deploy-v4.0.js --network amoy

# 输出示例：
# ✅ PVCoin 已部署: 0x1234...
# ✅ C2Coin 已部署: 0x5678...
# ... 其他合约地址
```

### 从区块浏览器

如果合约已部署，可以从区块浏览器查询地址：

- **Polygon Amoy**：https://amoy.polygonscan.com
- **Polygon 主网**：https://polygonscan.com

## 验证配置

### 检查合约地址有效性

```typescript
import { isValidAddress, areAllContractsConfigured } from '@/config/contracts';

// 检查单个地址
console.log(isValidAddress(CONTRACTS.PVCoin)); // true 或 false

// 检查所有地址
if (areAllContractsConfigured()) {
  console.log('所有合约地址已正确配置');
} else {
  console.error('部分合约地址未配置');
}
```

### 在应用启动时验证

```typescript
import { areAllContractsConfigured, getUnconfiguredContracts } from '@/config/contracts';

// 在应用初始化时检查
if (!areAllContractsConfigured()) {
  const unconfigured = getUnconfiguredContracts();
  throw new Error(`缺少以下合约地址: ${unconfigured.join(', ')}`);
}
```

## 常见问题

### Q1: 如何为不同环境设置不同的合约地址？

**A**: 创建不同的 `.env` 文件：
- `.env.local` - 本地开发
- `.env.amoy` - Amoy 测试网
- `.env.production` - 主网

然后使用 `vite --mode` 命令指定环境：
```bash
npm run dev -- --mode amoy
npm run build -- --mode production
```

### Q2: 环境变量不生效怎么办？

**A**: 
1. 确保变量名以 `VITE_` 开头
2. 确保文件保存后重启开发服务器
3. 检查 `.env` 文件的格式（不要有空格）
4. 在浏览器控制台验证：`console.log(import.meta.env.VITE_RPC_URL)`

### Q3: 如何在运行时动态更改配置？

**A**: 配置文件中的值在构建时确定。如需运行时更改，可以：
1. 使用 Context/Redux 存储动态配置
2. 从 API 端点获取配置
3. 使用本地存储保存用户偏好设置

### Q4: 合约地址格式有什么要求？

**A**: 
- 必须是有效的以太坊地址格式
- 以 `0x` 开头
- 后跟 40 个十六进制字符（0-9, a-f）
- 例如：`0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Q5: 如何验证 RPC 连接？

**A**:
```typescript
import { RPC_CONFIG } from '@/config/contracts';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(RPC_CONFIG.url);
const blockNumber = await provider.getBlockNumber();
console.log('当前区块号:', blockNumber);
```

## 最佳实践

1. **不要提交 `.env.local`**：将其添加到 `.gitignore`
2. **使用 `.env.example`**：提供配置模板供其他开发者参考
3. **验证配置**：在应用启动时验证所有必需的配置
4. **记录变更**：在 git 提交中说明配置变更
5. **使用类型安全**：利用 TypeScript 类型检查配置

## 相关文件

- `client/src/config/contracts.ts` - 配置文件
- `contracts/ElectricityPriceOracle.sol` - 预言机合约
- `scripts/deploy-v4.0.js` - 部署脚本
- `docs/ELECTRICITY_PRICE_ORACLE_GUIDE.md` - 预言机使用指南
