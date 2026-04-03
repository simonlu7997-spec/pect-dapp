/**
 * 月度 C2Coin 空投定时任务
 *
 * 执行流程：
 * 1. 每月 1 日 00:05（UTC+8）自动触发
 * 2. 从数据库查询所有 confirmed 的 PVC 购买者地址
 * 3. 通过链上 PVCoin Transfer 事件补充其他持有者地址
 * 4. 去重后分批（每批 ≤ 100 个）调用 C2Coin.calculateRewardsBatch
 * 5. 记录执行结果到 admin_transactions 表
 * 6. 推送 notifyOwner 通知
 */

import { ethers } from "ethers";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { recordAdminTransaction, getPvcHolderAddresses } from "./db";
import { C2COIN_ABI } from "../client/src/contracts/C2Coin";

// 每批最多 100 个地址（合约限制）
const BATCH_SIZE = 100;

// 月度任务锁，防止重复执行
let isRunning = false;

/**
 * 获取 PVCoin 链上所有持有者地址（通过 Transfer 事件）
 */
async function getPvcHoldersFromChain(
  provider: ethers.JsonRpcProvider,
  pvCoinAddress: string
): Promise<string[]> {
  try {
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);
    const transferTopic = iface.getEvent("Transfer")!.topicHash;

    // 分批查询，每次最多 5000 个区块，避免 RPC 节点区块范围限制
    const BATCH_SIZE = 5000;
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 500_000);

    const holders = new Set<string>();
    let currentFrom = fromBlock;

    while (currentFrom <= latestBlock) {
      const currentTo = Math.min(currentFrom + BATCH_SIZE - 1, latestBlock);
      try {
        const logs = await provider.getLogs({
          address: pvCoinAddress,
          topics: [transferTopic],
          fromBlock: currentFrom,
          toBlock: currentTo,
        });
        for (const log of logs) {
          const parsed = iface.parseLog(log);
          if (parsed) {
            const to = parsed.args[1] as string;
            // 排除零地址（mint/burn）
            if (to !== ethers.ZeroAddress) {
              holders.add(to.toLowerCase());
            }
          }
        }
      } catch (batchErr) {
        console.warn(`[AirdropScheduler] 区块 ${currentFrom}-${currentTo} 查询失败，跳过:`, (batchErr as Error).message);
      }
      currentFrom = currentTo + 1;
    }

    console.log(`[AirdropScheduler] 从链上获取到 ${holders.size} 个 PVC 持有者地址`);
    return Array.from(holders);
  } catch (err) {
    console.error("[AirdropScheduler] 获取链上持有者失败:", err);
    return [];
  }
}

/**
 * 过滤掉 PVC 余额为 0 的地址
 */
async function filterActiveHolders(
  provider: ethers.JsonRpcProvider,
  pvCoinAddress: string,
  addresses: string[]
): Promise<string[]> {
  const pvCoinAbi = ["function balanceOf(address) external view returns (uint256)"];
  const pvCoin = new ethers.Contract(pvCoinAddress, pvCoinAbi, provider);

  const results = await Promise.allSettled(
    addresses.map(async (addr) => {
      const balance: bigint = await pvCoin.balanceOf(addr);
      return balance > BigInt(0) ? addr : null;
    })
  );

  const active = results
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string | null>).value)
    .filter((addr): addr is string => addr !== null);

  console.log(
    `[AirdropScheduler] 过滤后有效持有者: ${active.length}/${addresses.length}`
  );
  return active;
}

/**
 * 核心执行函数：计算本月 C2Coin 奖励
 */
export async function runMonthlyAirdrop(triggeredBy: "scheduler" | "manual" = "scheduler"): Promise<{
  success: boolean;
  totalHolders: number;
  batches: number;
  txHashes: string[];
  error?: string;
}> {
  if (isRunning) {
    console.warn("[AirdropScheduler] 任务正在执行中，跳过本次触发");
    return { success: false, totalHolders: 0, batches: 0, txHashes: [], error: "任务正在执行中" };
  }

  isRunning = true;
  const txHashes: string[] = [];

  try {
    const { blockchainRpcUrl, deployerPrivateKey, pvCoinAddress, c2CoinAddress } = ENV;

    if (!blockchainRpcUrl || !deployerPrivateKey || !pvCoinAddress || !c2CoinAddress) {
      throw new Error("缺少必要的环境变量（RPC_URL / DEPLOYER_PRIVATE_KEY / PV_COIN_ADDRESS / C2_COIN_ADDRESS）");
    }

    const provider = new ethers.JsonRpcProvider(blockchainRpcUrl);
    const signer = new ethers.Wallet(deployerPrivateKey, provider);
    const c2Coin = new ethers.Contract(c2CoinAddress, C2COIN_ABI, signer);

    console.log(`[AirdropScheduler] 开始月度空投计算（触发方式: ${triggeredBy}）`);

    // 1. 从数据库获取购买者地址
    const dbHolders = await getPvcHolderAddresses();
    console.log(`[AirdropScheduler] 数据库购买者: ${dbHolders.length} 个`);

    // 2. 从链上获取 Transfer 事件中的持有者
    const chainHolders = await getPvcHoldersFromChain(provider, pvCoinAddress);

    // 3. 合并去重
    const allAddresses = Array.from(
      new Set([...dbHolders.map((a: string) => a.toLowerCase()), ...chainHolders])
    );
    console.log(`[AirdropScheduler] 合并去重后: ${allAddresses.length} 个地址`);

    // 4. 过滤余额为 0 的地址
    const activeHolders = await filterActiveHolders(provider, pvCoinAddress, allAddresses);

    if (activeHolders.length === 0) {
      console.warn("[AirdropScheduler] 没有有效的 PVC 持有者，跳过本次空投");
      return { success: true, totalHolders: 0, batches: 0, txHashes: [] };
    }

    // 5. 分批调用 calculateRewardsBatch（每批最多 100 个）
    const totalBatches = Math.ceil(activeHolders.length / BATCH_SIZE);
    console.log(`[AirdropScheduler] 共 ${activeHolders.length} 个持有者，分 ${totalBatches} 批处理`);

    for (let i = 0; i < totalBatches; i++) {
      const batch = activeHolders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      console.log(`[AirdropScheduler] 处理第 ${i + 1}/${totalBatches} 批，${batch.length} 个地址`);

      try {
        const tx = await c2Coin.calculateRewardsBatch(batch);
        await tx.wait();
        txHashes.push(tx.hash);
        console.log(`[AirdropScheduler] 第 ${i + 1} 批完成，txHash: ${tx.hash}`);

        // 记录到 admin_transactions
        await recordAdminTransaction({
          txHash: tx.hash,
          txType: "airdrop_calculate",
          amount: String(batch.length),
          status: "confirmed",
          note: `月度空投计算第 ${i + 1}/${totalBatches} 批，${batch.length} 个地址（${triggeredBy}）`,
          createdBy: "system",
        });

        // 批次间等待 2 秒，避免 nonce 冲突
        if (i < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (batchErr) {
        console.error(`[AirdropScheduler] 第 ${i + 1} 批失败:`, batchErr);
        // 记录失败
        await recordAdminTransaction({
          txHash: `failed-batch-${i + 1}-${Date.now()}`,
          txType: "airdrop_calculate",
          amount: String(batch.length),
          status: "failed",
          note: `月度空投计算第 ${i + 1}/${totalBatches} 批失败: ${(batchErr as Error).message}`,
          createdBy: "system",
        });
      }
    }

    const successMsg = [
      `月度 C2Coin 空投计算完成`,
      `持有者总数: ${activeHolders.length}`,
      `批次数: ${totalBatches}`,
      `成功交易: ${txHashes.length}`,
      `触发方式: ${triggeredBy}`,
      `时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    ].join("\n");

    await notifyOwner({
      title: "🌱 月度 C2Coin 空投计算完成",
      content: successMsg,
    }).catch((e) => console.warn("[AirdropScheduler] notifyOwner 失败:", e));

    console.log("[AirdropScheduler] 月度空投计算完成:", successMsg);

    return {
      success: true,
      totalHolders: activeHolders.length,
      batches: totalBatches,
      txHashes,
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error("[AirdropScheduler] 月度空投计算失败:", errorMsg);

    await notifyOwner({
      title: "❌ 月度 C2Coin 空投计算失败",
      content: `错误信息: ${errorMsg}\n时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    }).catch(() => {});

    return { success: false, totalHolders: 0, batches: 0, txHashes: [], error: errorMsg };
  } finally {
    isRunning = false;
  }
}

/**
 * 计算距离下次执行（每月 1 日 00:05 UTC+8）的毫秒数
 */
function msUntilNextMonthlyRun(): number {
  const now = new Date();
  // 转换为 UTC+8
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  // 下个月 1 日 00:05 UTC+8
  const next = new Date(Date.UTC(utc8.getUTCFullYear(), utc8.getUTCMonth() + 1, 1, 0, 5, 0));
  // 转回 UTC
  const nextUtc = new Date(next.getTime() - 8 * 60 * 60 * 1000);

  const ms = nextUtc.getTime() - now.getTime();
  return ms > 0 ? ms : ms + 30 * 24 * 60 * 60 * 1000; // 防止负值
}

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 启动月度空投定时任务
 */
export function startAirdropScheduler() {
  if (!ENV.blockchainRpcUrl || !ENV.deployerPrivateKey || !ENV.c2CoinAddress) {
    console.warn(
      "[AirdropScheduler] 缺少区块链配置，月度空投定时任务未启动（需要 BLOCKCHAIN_RPC_URL、DEPLOYER_PRIVATE_KEY、VITE_C2_COIN_ADDRESS）"
    );
    return;
  }

  // Node.js setTimeout 最大支持 ~24.8 天（2^31-1 ms），超出会溢出
  // 使用递归短轮询方式安全调度远期任务
  const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 小时

  const scheduleNext = () => {
    const ms = msUntilNextMonthlyRun();
    const nextDate = new Date(Date.now() + ms);
    console.log(
      `[AirdropScheduler] 月度空投定时任务已启动，下次执行时间: ${nextDate.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（${Math.round(ms / 1000 / 60 / 60)} 小时后）`
    );

    const waitAndRun = (remaining: number) => {
      if (remaining <= 0) {
        // 到时间了，执行空投
        runMonthlyAirdrop("scheduler").then(() => {
          scheduleNext(); // 执行完毕后重新调度下个月
        });
        return;
      }
      // 分批等待，每次最多等 24 小时
      const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
      schedulerTimer = setTimeout(() => waitAndRun(remaining - chunk), chunk);
    };

    waitAndRun(ms);
  };

  scheduleNext();
}

/**
 * 停止月度空投定时任务
 */
export function stopAirdropScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
    console.log("[AirdropScheduler] 月度空投定时任务已停止");
  }
}
