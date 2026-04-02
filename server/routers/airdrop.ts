import { router, publicProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

/**
 * C2-Coin 空投合约 ABI
 * 标准 Merkle 空投合约接口（兼容 OpenZeppelin MerkleDistributor 风格）
 */
const AIRDROP_ABI = [
  // 查询某地址是否已领取
  "function isClaimed(address account) external view returns (bool)",
  // 查询某地址的可领取数量
  "function claimableAmount(address account) external view returns (uint256)",
  // 领取空投（Merkle proof 版本）
  "function claim(uint256 amount, bytes32[] calldata merkleProof) external",
  // 无 Merkle proof 版本（简单白名单空投）
  "function claim() external",
  // 空投总量
  "function totalAirdrop() external view returns (uint256)",
  // 已领取总量
  "function totalClaimed() external view returns (uint256)",
  // 空投截止时间
  "function claimDeadline() external view returns (uint256)",
  // 空投是否激活
  "function isActive() external view returns (bool)",
];

// C2-Coin ERC20 ABI
const C2_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

function getEnv() {
  return {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology",
    airdropAddress: process.env.VITE_C2_AIRDROP_ADDRESS || process.env.C2_AIRDROP_ADDRESS,
    c2CoinAddress: process.env.VITE_C2_COIN_ADDRESS || process.env.C2_COIN_ADDRESS,
  };
}

export const airdropRouter = router({
  // ── 查询空投信息（链上实时数据）────────────────────────────────────
  getAirdropInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, airdropAddress, c2CoinAddress } = getEnv();

      if (!airdropAddress || airdropAddress === "0x0000000000000000000000000000000000000000") {
        return {
          contractConfigured: false,
          isActive: false,
          isClaimed: false,
          claimableAmount: "0",
          totalAirdrop: "0",
          totalClaimed: "0",
          claimDeadline: null as number | null,
          c2Balance: "0",
          c2Symbol: "C2C",
        };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const airdrop = new ethers.Contract(airdropAddress, AIRDROP_ABI, provider);

        // 查询基础信息
        const [isClaimed, claimableRaw, totalAirdropRaw, totalClaimedRaw] = await Promise.all([
          airdrop.isClaimed(input.walletAddress).catch(() => false),
          airdrop.claimableAmount(input.walletAddress).catch(() => BigInt(0)),
          airdrop.totalAirdrop().catch(() => BigInt(0)),
          airdrop.totalClaimed().catch(() => BigInt(0)),
        ]);

        // 可选字段
        let claimDeadline: number | null = null;
        let isActive = true;
        try {
          const [deadline, active] = await Promise.all([
            airdrop.claimDeadline(),
            airdrop.isActive(),
          ]);
          claimDeadline = Number(deadline) * 1000; // 转毫秒
          isActive = active;
        } catch {
          // 合约不支持这些字段，忽略
        }

        // C2-Coin 余额
        let c2Balance = "0";
        let c2Decimals = 18;
        let c2Symbol = "C2C";
        if (c2CoinAddress) {
          try {
            const c2Coin = new ethers.Contract(c2CoinAddress, C2_ABI, provider);
            const [bal, dec, sym] = await Promise.all([
              c2Coin.balanceOf(input.walletAddress),
              c2Coin.decimals(),
              c2Coin.symbol().catch(() => "C2C"),
            ]);
            c2Decimals = Number(dec);
            c2Balance = ethers.formatUnits(bal, c2Decimals);
            c2Symbol = sym;
          } catch {
            // 忽略
          }
        }

        return {
          contractConfigured: true,
          isActive,
          isClaimed: Boolean(isClaimed),
          claimableAmount: ethers.formatUnits(claimableRaw, c2Decimals),
          totalAirdrop: ethers.formatUnits(totalAirdropRaw, c2Decimals),
          totalClaimed: ethers.formatUnits(totalClaimedRaw, c2Decimals),
          claimDeadline,
          c2Balance,
          c2Symbol,
        };
      } catch (error) {
        console.error("[Airdrop] 查询空投信息失败:", error);
        return {
          contractConfigured: true,
          isActive: false,
          isClaimed: false,
          claimableAmount: "0",
          totalAirdrop: "0",
          totalClaimed: "0",
          claimDeadline: null as number | null,
          c2Balance: "0",
          c2Symbol: "C2C",
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 记录空投领取交易到数据库────────────────────────────────────────
  recordAirdropClaim: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        c2Amount: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await recordTransaction({
          walletAddress: input.walletAddress.toLowerCase(),
          txHash: input.txHash,
          txType: "airdrop_claim",
          amount: input.c2Amount,
          tokenSymbol: "C2C",
          status: "pending",
        });
        // 推送运营通知
        notifyOwner({
          title: "🎁 用户领取 C2-Coin 空投",
          content: [
            `钱包：${input.walletAddress}`,
            `金额：${input.c2Amount} C2C`,
            `交易哈希：${input.txHash}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          ].join("\n"),
        }).catch((e) => console.warn("[Airdrop] notifyOwner failed:", e));
        return { success: true };
      } catch (error) {
        console.error("[Airdrop] 记录空投领取失败:", error);
        return { success: false, error: "记录失败，但链上交易已成功" };
      }
    }),

  // ── 查询空投领取历史────────────────────────────────────────────────
  getAirdropHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter((tx) => tx.txType === "airdrop_claim");
    }),
});
