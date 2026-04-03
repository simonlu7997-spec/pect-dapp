/**
 * 月度质押奖励 & 分红定时任务
 *
 * 执行时序（每月 1 日，UTC+8）：
 *   00:00 — 质押奖励：startMonthlyReward(amount) → calculateRewardsBatch(stakers[])
 *   00:05 — C2Coin 空投（由 airdropScheduler 负责）
 *   00:10 — 分红：startDistribution(amount) → calculateRevenuesBatch(holders[])
 *
 * 奖励金额来源：
 *   - 质押奖励：从数据库 revenue_records 读取上月 dividendPool × STAKING_REWARD_RATIO（默认 10%）
 *   - 分红金额：从数据库 revenue_records 读取上月 dividendPool（USDT）
 *
 * 注意：
 *   - 两个任务均需要 Deployer 账户预先持有足够的 USDT（分红）和 USDT（质押奖励 rewardToken）
 *   - 合约要求 Deployer 先 approve 足够额度给合约地址
 */
import { ethers } from "ethers";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import {
  recordAdminTransaction,
  updateAdminTransactionStatus,
  getRevenueRecordByPeriod,
  getPvcHolderAddresses,
  listAdminTransactions,
} from "./db";
import type { AdminTransaction } from "../drizzle/schema";
import { STAKINGMANAGER_ABI } from "../client/src/contracts/StakingManager";
import { REVENUEDISTRIBUTOR_ABI } from "../client/src/contracts/RevenueDistributor";

// 质押奖励占分红池的比例（10%），可通过环境变量覆盖
const STAKING_REWARD_RATIO = parseFloat(process.env.STAKING_REWARD_RATIO ?? "0.1");
// 每批最多 100 个地址（合约限制）
const BATCH_SIZE = 100;

// 任务锁，防止重复执行
let isStakingRunning = false;
let isRevenueRunning = false;

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 从链上 Staked 事件获取所有质押者地址
 */
async function getStakersFromChain(
  provider: ethers.JsonRpcProvider,
  stakingManagerAddress: string
): Promise<string[]> {
  try {
    const iface = new ethers.Interface([
      "event Staked(address indexed user, uint256 amount, uint256 timestamp)",
      "event Unstaked(address indexed user, uint256 amount, uint256 timestamp)",
    ]);
    const stakedTopic = iface.getEvent("Staked")!.topicHash;
    const BLOCK_BATCH = 5000;
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 500_000);
    const stakers = new Set<string>();
    let currentFrom = fromBlock;
    while (currentFrom <= latestBlock) {
      const currentTo = Math.min(currentFrom + BLOCK_BATCH - 1, latestBlock);
      try {
        const logs = await provider.getLogs({
          address: stakingManagerAddress,
          topics: [stakedTopic],
          fromBlock: currentFrom,
          toBlock: currentTo,
        });
        for (const log of logs) {
          const parsed = iface.parseLog(log);
          if (parsed) {
            const user = parsed.args[0] as string;
            if (user !== ethers.ZeroAddress) stakers.add(user.toLowerCase());
          }
        }
      } catch {
        // 忽略单批次错误，继续下一批
      }
      currentFrom = currentTo + 1;
    }
    return Array.from(stakers);
  } catch (err) {
    console.warn("[RewardScheduler] 获取链上质押者失败:", err);
    return [];
  }
}

/**
 * 获取上月的年份和月份
 */
function getLastMonth(): { year: number; month: number } {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  let year = utc8.getUTCFullYear();
  let month = utc8.getUTCMonth(); // 0-indexed，当前月 - 1 = 上月
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return { year, month };
}

// ─── 质押奖励任务 ─────────────────────────────────────────────────────────────

/**
 * 执行月度质押奖励任务
 * 1. 从数据库读取上月 dividendPool，计算质押奖励金额
 * 2. 调用 startMonthlyReward(amount)
 * 3. 从链上获取质押者列表，分批调用 calculateRewardsBatch
 */
export async function runMonthlyStakingReward(
  triggeredBy: "scheduler" | "manual" = "scheduler"
): Promise<{ success: boolean; totalStakers: number; batches: number; txHashes: string[]; error?: string }> {
  if (isStakingRunning) {
    console.warn("[RewardScheduler] 质押奖励任务正在运行中，跳过本次执行");
    return { success: false, totalStakers: 0, batches: 0, txHashes: [], error: "任务正在运行中" };
  }
  isStakingRunning = true;
  const txHashes: string[] = [];
  try {
    const { stakingManagerAddress, deployerPrivateKey, blockchainRpcUrl } = ENV;
    if (!stakingManagerAddress || !deployerPrivateKey || !blockchainRpcUrl) {
      throw new Error("缺少区块链配置（VITE_STAKING_MANAGER_ADDRESS / DEPLOYER_PRIVATE_KEY / BLOCKCHAIN_RPC_URL）");
    }
    const provider = new ethers.JsonRpcProvider(blockchainRpcUrl);
    const signer = new ethers.Wallet(deployerPrivateKey, provider);
    const contract = new ethers.Contract(stakingManagerAddress, STAKINGMANAGER_ABI, signer);

    // 1. 从数据库读取上月分红池，计算质押奖励金额
    const { year, month } = getLastMonth();
    const revenueRecord = await getRevenueRecordByPeriod(year, month);
    if (!revenueRecord) {
      throw new Error(`未找到 ${year}-${String(month).padStart(2, "0")} 的分红记录，请先在管理后台录入电站收益数据`);
    }
    const dividendPool = parseFloat(revenueRecord.dividendPool);
    // 优先使用管理员单独配置的 stakingRewardAmount，为空时回退到 dividendPool * STAKING_REWARD_RATIO
    const stakingRewardAmount = revenueRecord.stakingRewardAmount
      ? parseFloat(revenueRecord.stakingRewardAmount)
      : dividendPool * STAKING_REWARD_RATIO;
    const stakingRewardSource = revenueRecord.stakingRewardAmount
      ? `手动配置的 stakingRewardAmount`
      : `分红池 ${dividendPool} USDT × ${STAKING_REWARD_RATIO * 100}%`;
    if (stakingRewardAmount <= 0) {
      throw new Error(`质押奖励金额为 0，请检查分红记录（dividendPool=${dividendPool}）`);
    }
    const amountWei = ethers.parseUnits(stakingRewardAmount.toFixed(6), 6); // USDT 6位精度
    console.log(`[RewardScheduler] 质押奖励金额: ${stakingRewardAmount} USDT（来自 ${year}-${month} ${stakingRewardSource}）`);

    // 2. 调用 startMonthlyReward
    console.log(`[RewardScheduler] 调用 startMonthlyReward(${stakingRewardAmount} USDT)...`);
    const startTx = await contract.startMonthlyReward(amountWei);
    await recordAdminTransaction({
      txType: "distribute_staking_reward",
      txHash: startTx.hash,
      amount: stakingRewardAmount.toFixed(6),
      status: "pending",
      note: `月度质押奖励启动 ${stakingRewardAmount.toFixed(2)} USDT（${triggeredBy}）`,
      createdBy: "system",
    });
    const startReceipt = await startTx.wait(2);
    await updateAdminTransactionStatus(startTx.hash, "confirmed", startReceipt?.blockNumber);
    txHashes.push(startTx.hash);
    console.log(`[RewardScheduler] startMonthlyReward 成功: ${startTx.hash}`);

    // 3. 获取质押者地址列表
    const dbStakers = await getPvcHolderAddresses(); // 复用 PVC 持有者查询（质押者也是 PVC 持有者）
    const chainStakers = await getStakersFromChain(provider, stakingManagerAddress);
    const allStakers = Array.from(new Set([...dbStakers, ...chainStakers].map((a) => a.toLowerCase())));
    // 过滤：只保留实际有质押的地址（通过合约查询）
    const activeStakers: string[] = [];
    for (const addr of allStakers) {
      try {
        const staked: bigint = await contract.getStakedAmount(addr);
        if (staked > BigInt(0)) activeStakers.push(addr);
      } catch {
        // 忽略查询失败的地址
      }
    }
    if (activeStakers.length === 0) {
      console.warn("[RewardScheduler] 没有活跃质押者，跳过 calculateRewardsBatch");
      return { success: true, totalStakers: 0, batches: 0, txHashes };
    }
    console.log(`[RewardScheduler] 找到 ${activeStakers.length} 个活跃质押者，开始分批计算奖励...`);

    // 4. 分批调用 calculateRewardsBatch
    const batches = Math.ceil(activeStakers.length / BATCH_SIZE);
    for (let i = 0; i < batches; i++) {
      const batch = activeStakers.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      console.log(`[RewardScheduler] 质押奖励计算第 ${i + 1}/${batches} 批，${batch.length} 个地址...`);
      const batchTx = await contract.calculateRewardsBatch(batch);
      await recordAdminTransaction({
        txType: "distribute_staking_reward",
        txHash: batchTx.hash,
        amount: String(batch.length),
        status: "pending",
        note: `月度质押奖励计算第 ${i + 1}/${batches} 批，${batch.length} 个地址（${triggeredBy}）`,
        createdBy: "system",
      });
      const batchReceipt = await batchTx.wait(2);
      await updateAdminTransactionStatus(batchTx.hash, "confirmed", batchReceipt?.blockNumber);
      txHashes.push(batchTx.hash);
    }

    // 5. 推送通知
    await notifyOwner({
      title: "✅ 月度质押奖励计算完成",
      content: [
        `奖励金额：${stakingRewardAmount.toFixed(2)} USDT`,
        `活跃质押者：${activeStakers.length} 个`,
        `批次数：${batches}`,
        `触发方式：${triggeredBy === "scheduler" ? "定时任务" : "手动触发"}`,
        `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      ].join("\n"),
    }).catch(() => {});

    console.log(`[RewardScheduler] 质押奖励任务完成：${activeStakers.length} 个质押者，${batches} 批`);
    return { success: true, totalStakers: activeStakers.length, batches, txHashes };
  } catch (err: unknown) {
    const errorMsg = (err as Error).message ?? "未知错误";
    console.error("[RewardScheduler] 质押奖励任务失败:", errorMsg);
    await notifyOwner({
      title: "❌ 月度质押奖励计算失败",
      content: `错误信息: ${errorMsg}\n时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    }).catch(() => {});
    return { success: false, totalStakers: 0, batches: 0, txHashes, error: errorMsg };
  } finally {
    isStakingRunning = false;
  }
}

// ─── 分红任务 ─────────────────────────────────────────────────────────────────

/**
 * 执行月度分红任务
 * 1. 从数据库读取上月 dividendPool 作为分红金额
 * 2. 调用 startDistribution(amount)
 * 3. 从数据库/链上获取 PVC 持有者列表，分批调用 calculateRevenuesBatch
 */
export async function runMonthlyRevenue(
  triggeredBy: "scheduler" | "manual" = "scheduler"
): Promise<{ success: boolean; totalHolders: number; batches: number; txHashes: string[]; error?: string }> {
  if (isRevenueRunning) {
    console.warn("[RewardScheduler] 分红任务正在运行中，跳过本次执行");
    return { success: false, totalHolders: 0, batches: 0, txHashes: [], error: "任务正在运行中" };
  }
  isRevenueRunning = true;
  const txHashes: string[] = [];
  try {
    const { revenueDistributorAddress, pvCoinAddress, deployerPrivateKey, blockchainRpcUrl } = ENV;
    if (!revenueDistributorAddress || !deployerPrivateKey || !blockchainRpcUrl) {
      throw new Error("缺少区块链配置（VITE_REVENUE_DISTRIBUTOR_ADDRESS / DEPLOYER_PRIVATE_KEY / BLOCKCHAIN_RPC_URL）");
    }
    const provider = new ethers.JsonRpcProvider(blockchainRpcUrl);
    const signer = new ethers.Wallet(deployerPrivateKey, provider);
    const contract = new ethers.Contract(revenueDistributorAddress, REVENUEDISTRIBUTOR_ABI, signer);

    // 1. 从数据库读取上月分红池
    const { year, month } = getLastMonth();
    const revenueRecord = await getRevenueRecordByPeriod(year, month);
    if (!revenueRecord) {
      throw new Error(`未找到 ${year}-${String(month).padStart(2, "0")} 的分红记录，请先在管理后台录入电站收益数据`);
    }
    const dividendPool = parseFloat(revenueRecord.dividendPool);
    if (dividendPool <= 0) {
      throw new Error(`分红金额为 0，请检查分红记录（dividendPool=${dividendPool}）`);
    }
    const amountWei = ethers.parseUnits(dividendPool.toFixed(6), 6); // USDT 6位精度
    console.log(`[RewardScheduler] 分红金额: ${dividendPool} USDT（来自 ${year}-${month} 分红记录）`);

    // 2. 调用 startDistribution
    console.log(`[RewardScheduler] 调用 startDistribution(${dividendPool} USDT)...`);
    const startTx = await contract.startDistribution(amountWei);
    await recordAdminTransaction({
      txType: "distribute_revenue",
      txHash: startTx.hash,
      amount: dividendPool.toFixed(6),
      status: "pending",
      note: `月度分红启动 ${dividendPool.toFixed(2)} USDT（${triggeredBy}）`,
      createdBy: "system",
    });
    const startReceipt = await startTx.wait(2);
    await updateAdminTransactionStatus(startTx.hash, "confirmed", startReceipt?.blockNumber);
    txHashes.push(startTx.hash);
    console.log(`[RewardScheduler] startDistribution 成功: ${startTx.hash}`);

    // 3. 获取 PVC 持有者地址列表
    const dbHolders = await getPvcHolderAddresses();
    // 从链上补充（通过 PVCoin Transfer 事件）
    const chainHolders = pvCoinAddress
      ? await getChainHolders(provider, pvCoinAddress)
      : [];
    const allHolders = Array.from(new Set([...dbHolders, ...chainHolders].map((a) => a.toLowerCase())));
    if (allHolders.length === 0) {
      console.warn("[RewardScheduler] 没有 PVC 持有者，跳过 calculateRevenuesBatch");
      return { success: true, totalHolders: 0, batches: 0, txHashes };
    }
    console.log(`[RewardScheduler] 找到 ${allHolders.length} 个 PVC 持有者，开始分批计算分红...`);

    // 4. 分批调用 calculateRevenuesBatch
    const batches = Math.ceil(allHolders.length / BATCH_SIZE);
    for (let i = 0; i < batches; i++) {
      const batch = allHolders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      console.log(`[RewardScheduler] 分红计算第 ${i + 1}/${batches} 批，${batch.length} 个地址...`);
      const batchTx = await contract.calculateRevenuesBatch(batch);
      await recordAdminTransaction({
        txType: "distribute_revenue",
        txHash: batchTx.hash,
        amount: String(batch.length),
        status: "pending",
        note: `月度分红计算第 ${i + 1}/${batches} 批，${batch.length} 个地址（${triggeredBy}）`,
        createdBy: "system",
      });
      const batchReceipt = await batchTx.wait(2);
      await updateAdminTransactionStatus(batchTx.hash, "confirmed", batchReceipt?.blockNumber);
      txHashes.push(batchTx.hash);
    }

    // 5. 推送通知
    await notifyOwner({
      title: "✅ 月度分红计算完成",
      content: [
        `分红金额：${dividendPool.toFixed(2)} USDT`,
        `PVC 持有者：${allHolders.length} 个`,
        `批次数：${batches}`,
        `触发方式：${triggeredBy === "scheduler" ? "定时任务" : "手动触发"}`,
        `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      ].join("\n"),
    }).catch(() => {});

    console.log(`[RewardScheduler] 分红任务完成：${allHolders.length} 个持有者，${batches} 批`);
    return { success: true, totalHolders: allHolders.length, batches, txHashes };
  } catch (err: unknown) {
    const errorMsg = (err as Error).message ?? "未知错误";
    console.error("[RewardScheduler] 分红任务失败:", errorMsg);
    await notifyOwner({
      title: "❌ 月度分红计算失败",
      content: `错误信息: ${errorMsg}\n时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    }).catch(() => {});
    return { success: false, totalHolders: 0, batches: 0, txHashes, error: errorMsg };
  } finally {
    isRevenueRunning = false;
  }
}

/**
 * 从链上 PVCoin Transfer 事件获取持有者地址（内部辅助函数）
 */
async function getChainHolders(
  provider: ethers.JsonRpcProvider,
  pvCoinAddress: string
): Promise<string[]> {
  try {
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);
    const transferTopic = iface.getEvent("Transfer")!.topicHash;
    const BLOCK_BATCH = 5000;
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 500_000);
    const holders = new Set<string>();
    let currentFrom = fromBlock;
    while (currentFrom <= latestBlock) {
      const currentTo = Math.min(currentFrom + BLOCK_BATCH - 1, latestBlock);
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
            if (to !== ethers.ZeroAddress) holders.add(to.toLowerCase());
          }
        }
      } catch {
        // 忽略单批次错误
      }
      currentFrom = currentTo + 1;
    }
    return Array.from(holders);
  } catch {
    return [];
  }
}

// ─── 调度器 ───────────────────────────────────────────────────────────────────

const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 小时

/**
 * 计算距离下次执行的毫秒数
 * @param hour UTC+8 小时（0-23）
 * @param minute UTC+8 分钟（0-59）
 */
function msUntilNextRun(hour: number, minute: number): number {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  // 下个月 1 日指定时间 UTC+8
  const next = new Date(
    Date.UTC(utc8.getUTCFullYear(), utc8.getUTCMonth() + 1, 1, hour, minute, 0)
  );
  // 转回 UTC
  const nextUtc = new Date(next.getTime() - 8 * 60 * 60 * 1000);
  const ms = nextUtc.getTime() - now.getTime();
  return ms > 0 ? ms : ms + 30 * 24 * 60 * 60 * 1000;
}

let stakingTimer: ReturnType<typeof setTimeout> | null = null;
let revenueTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTask(
  name: string,
  hour: number,
  minute: number,
  task: () => Promise<unknown>,
  timerRef: { current: ReturnType<typeof setTimeout> | null }
) {
  const ms = msUntilNextRun(hour, minute);
  const nextDate = new Date(Date.now() + ms);
  console.log(
    `[RewardScheduler] ${name} 定时任务已启动，下次执行时间: ${nextDate.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（${Math.round(ms / 1000 / 60 / 60)} 小时后）`
  );
  const waitAndRun = (remaining: number) => {
    if (remaining <= 0) {
      task().then(() => {
        scheduleTask(name, hour, minute, task, timerRef);
      });
      return;
    }
    const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
    timerRef.current = setTimeout(() => waitAndRun(remaining - chunk), chunk);
  };
  waitAndRun(ms);
}

/**
 * 启动月度质押奖励和分红定时任务
 */
export function startRewardScheduler() {
  const { stakingManagerAddress, revenueDistributorAddress, deployerPrivateKey, blockchainRpcUrl } = ENV;
  if (!deployerPrivateKey || !blockchainRpcUrl) {
    console.warn("[RewardScheduler] 缺少区块链配置，月度奖励/分红定时任务未启动");
    return;
  }
  if (stakingManagerAddress) {
    // 质押奖励：每月 1 日 00:00 UTC+8
    scheduleTask(
      "质押奖励",
      0, 0,
      () => runMonthlyStakingReward("scheduler"),
      { current: stakingTimer }
    );
  } else {
    console.warn("[RewardScheduler] 未配置 VITE_STAKING_MANAGER_ADDRESS，质押奖励定时任务未启动");
  }
  if (revenueDistributorAddress) {
    // 分红：每月 1 日 00:10 UTC+8
    scheduleTask(
      "分红",
      0, 10,
      () => runMonthlyRevenue("scheduler"),
      { current: revenueTimer }
    );
  } else {
    console.warn("[RewardScheduler] 未配置 VITE_REVENUE_DISTRIBUTOR_ADDRESS，分红定时任务未启动");
  }

  // 每月 1 日 00:20 UTC+8：推送月度执行摘要（质押奖励 + 分红均完成后汇总）
  scheduleTask(
    "月度执行摘要",
    0, 20,
    async () => {
      const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
      const { year, month } = getLastMonth();
      const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

      // 从数据库读取本月已执行的交易记录（取最近 50 条以涵盖当月所有批次）
      const allTx: AdminTransaction[] = await listAdminTransactions(50);
      const stakingTx = allTx.filter(
        (tx: AdminTransaction) => tx.txType === "distribute_staking_reward" && tx.createdBy === "system"
      );
      const revenueTx = allTx.filter(
        (tx: AdminTransaction) => tx.txType === "distribute_revenue" && tx.createdBy === "system"
      );
      const airdropTx = allTx.filter(
        (tx: AdminTransaction) => tx.txType === "airdrop_calculate" && tx.createdBy === "system"
      );

      // 质押奖励统计
      const stakingSuccess = stakingTx.some((tx: AdminTransaction) => tx.status === "confirmed");
      const stakingAmount = stakingTx.find((tx: AdminTransaction) => tx.status === "confirmed")?.amount ?? "N/A";

      // 分红统计
      const revenueSuccess = revenueTx.some((tx: AdminTransaction) => tx.status === "confirmed");
      const revenueAmount = revenueTx.find((tx: AdminTransaction) => tx.status === "confirmed")?.amount ?? "N/A";

      // 空投统计：汇总成功批次数和总地址数
      const airdropConfirmed = airdropTx.filter((tx: AdminTransaction) => tx.status === "confirmed");
      const airdropFailed = airdropTx.filter((tx: AdminTransaction) => tx.status === "failed");
      const airdropTotalAddresses = airdropConfirmed.reduce(
        (sum: number, tx: AdminTransaction) => sum + (parseInt(tx.amount ?? "0") || 0), 0
      );
      const airdropBatches = airdropConfirmed.length;
      const airdropHasAny = airdropTx.length > 0;
      const airdropAllOk = airdropHasAny && airdropFailed.length === 0;

      let airdropLine: string;
      if (!airdropHasAny) {
        airdropLine = "❌ 未执行或无记录";
      } else if (airdropAllOk) {
        airdropLine = `✅ 已完成（共 ${airdropTotalAddresses} 个地址，${airdropBatches} 批次）`;
      } else {
        airdropLine = `⚠️ 部分失败（成功 ${airdropBatches} 批 / 失败 ${airdropFailed.length} 批，共 ${airdropTotalAddresses} 个地址已处理）`;
      }

      const lines = [
        `月份：${periodLabel}`,
        `质押奖励：${stakingSuccess ? `✅ 已完成（${stakingAmount} USDT）` : "❌ 未成功或未执行"}`,
        `分红：${revenueSuccess ? `✅ 已完成（${revenueAmount} USDT）` : "❌ 未成功或未执行"}`,
        `空投：${airdropLine}`,
        `汇总时间：${now}`,
      ];

      const allOk = stakingSuccess && revenueSuccess && airdropAllOk;
      await notifyOwner({
        title: allOk ? "✅ 月度自动任务执行摘要" : "⚠️ 月度自动任务执行摘要（部分失败）",
        content: lines.join("\n"),
      }).catch(() => {});

      console.log(`[RewardScheduler] 月度执行摘要已推送：${lines.join(" | ")}`);
    },
    { current: null }
  );
}

/**
 * 停止月度奖励/分红定时任务
 */
export function stopRewardScheduler() {
  if (stakingTimer) { clearTimeout(stakingTimer); stakingTimer = null; }
  if (revenueTimer) { clearTimeout(revenueTimer); revenueTimer = null; }
  console.log("[RewardScheduler] 月度奖励/分红定时任务已停止");
}
