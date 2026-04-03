# PECT 合约 ABI 文件

> ⚠️ 此目录由 `scripts/sync-abi.cjs` 自动生成，**请勿手动修改任何文件**

## 更新 ABI

当合约代码发生变更后，在合约仓库（`pect-contracts`）执行：

```bash
# 1. 重新编译合约
npx hardhat compile

# 2. 同步 ABI 到前端
node scripts/sync-abi.cjs
```

## 已同步合约

- `PVCoin` → `PVCoin.ts`
- `C2Coin` → `C2Coin.ts`
- `PrivateSale` → `PrivateSale.ts`
- `PublicSale` → `PublicSale.ts`
- `StakingManager` → `StakingManager.ts`
- `RevenueDistributor` → `RevenueDistributor.ts`
- `ElectricityPriceOracle` → `ElectricityPriceOracle.ts`

## 在前端使用

```typescript
import { PVCOIN_ABI, PRIVATESSALE_ABI, STAKING_MANAGER_ABI } from "@/contracts";

// 在 wagmi / viem 中使用
const { data } = useReadContract({
  address: PVC_ADDRESS,
  abi: PVCOIN_ABI,
  functionName: "balanceOf",
  args: [userAddress],
});
```

最后同步时间: 2026-04-03T12:34:22.481Z
