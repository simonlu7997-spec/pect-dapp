/**
 * 手动补发 C2Coin 空投 - 仅执行 calculateRewardsBatch
 * 利用当前合约中已有的 C2Coin 池（24,000 C2C），重新计算分配给所有 PVC 持有者
 * 不调用 issue，不新铸 C2C
 */

import "dotenv/config";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";

// 读取 C2Coin ABI
const abiContent = readFileSync("./client/src/contracts/C2Coin.ts", "utf8");
const abiMatch = abiContent.match(/export const C2COIN_ABI = (\[[\s\S]*?\]) as const/);
if (!abiMatch) throw new Error("无法解析 C2COIN_ABI");
const C2COIN_ABI = JSON.parse(abiMatch[1]);

const BATCH_SIZE = 100;

// 从数据库获取所有已确认购买的持有者地址
async function getPvcHoldersFromDB() {
  const conn = await createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    'SELECT DISTINCT walletAddress FROM transactions WHERE status = "confirmed" AND txType IN ("purchase_private", "purchase_public")'
  );
  await conn.end();
  const addresses = rows.map((r) => r.walletAddress.toLowerCase());
  console.log(`[Airdrop] 数据库持有者: ${addresses.length} 个`);
  addresses.forEach((a) => console.log(`  ${a}`));
  return addresses;
}

// 过滤 PVC 余额为 0 的地址
async function filterActiveHolders(provider, pvCoinAddress, addresses) {
  const pvCoinAbi = ["function balanceOf(address) external view returns (uint256)"];
  const pvCoin = new ethers.Contract(pvCoinAddress, pvCoinAbi, provider);
  const results = await Promise.allSettled(
    addresses.map(async (addr) => {
      const balance = await pvCoin.balanceOf(addr);
      return balance > BigInt(0) ? addr : null;
    })
  );
  const active = results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
  console.log(`[Airdrop] 过滤后有效持有者: ${active.length}/${addresses.length}`);
  return active;
}

async function main() {
  const blockchainRpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const pvCoinAddress = process.env.PV_COIN_ADDRESS;
  const c2CoinAddress = process.env.C2_COIN_ADDRESS;

  if (!blockchainRpcUrl || !deployerPrivateKey || !pvCoinAddress || !c2CoinAddress) {
    throw new Error("缺少必要环境变量（BLOCKCHAIN_RPC_URL / DEPLOYER_PRIVATE_KEY / PV_COIN_ADDRESS / C2_COIN_ADDRESS）");
  }

  const provider = new ethers.JsonRpcProvider(blockchainRpcUrl);
  const signer = new ethers.Wallet(deployerPrivateKey, provider);
  const c2Coin = new ethers.Contract(c2CoinAddress, C2COIN_ABI, signer);

  // 查询当前合约状态
  const lastIssuanceYearMonth = await c2Coin.lastIssuanceYearMonth();
  const totalSupply = await c2Coin.totalSupply();
  const deployerBalance = await c2Coin.balanceOf(signer.address);

  console.log("=== C2Coin 当前状态 ===");
  console.log(`lastIssuanceYearMonth: ${lastIssuanceYearMonth}`);
  console.log(`totalSupply: ${ethers.formatUnits(totalSupply, 6)} C2C`);
  console.log(`deployer 余额: ${ethers.formatUnits(deployerBalance, 6)} C2C`);
  console.log("======================\n");

  // 收集所有 PVC 持有者
  console.log("[Airdrop] 步骤 1: 从数据库获取购买者地址...");
  const chainHolders = await getPvcHoldersFromDB();

  console.log("[Airdrop] 步骤 2: 过滤余额为 0 的地址...");
  const activeHolders = await filterActiveHolders(provider, pvCoinAddress, chainHolders);

  if (activeHolders.length === 0) {
    console.log("[Airdrop] 没有有效的 PVC 持有者，退出");
    return;
  }

  console.log(`\n[Airdrop] 步骤 3: 开始 calculateRewardsBatch，共 ${activeHolders.length} 个持有者`);
  const totalBatches = Math.ceil(activeHolders.length / BATCH_SIZE);
  const txHashes = [];

  for (let i = 0; i < totalBatches; i++) {
    const batch = activeHolders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    console.log(`[Airdrop] 第 ${i + 1}/${totalBatches} 批，${batch.length} 个地址...`);
    try {
      const tx = await c2Coin.calculateRewardsBatch(batch);
      console.log(`[Airdrop]   txHash: ${tx.hash}`);
      const receipt = await tx.wait(2);
      txHashes.push(tx.hash);
      console.log(`[Airdrop]   确认成功，区块: ${receipt?.blockNumber}`);
      if (i < totalBatches - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`[Airdrop] 第 ${i + 1} 批失败:`, err.message);
    }
  }

  // 查询每个持有者的可领取金额
  console.log("\n=== 空投分配结果 ===");
  const userRewardAbi = ["function userRewards(address) external view returns (uint256)"];
  const c2CoinRead = new ethers.Contract(c2CoinAddress, userRewardAbi, provider);
  let totalAllocated = BigInt(0);
  for (const addr of activeHolders) {
    try {
      const reward = await c2CoinRead.userRewards(addr);
      if (reward > BigInt(0)) {
        console.log(`  ${addr}: ${ethers.formatUnits(reward, 6)} C2C`);
        totalAllocated += reward;
      }
    } catch {
      // 忽略查询失败
    }
  }
  console.log(`总已分配: ${ethers.formatUnits(totalAllocated, 6)} C2C`);
  console.log(`成功交易数: ${txHashes.length}/${totalBatches}`);
  console.log("===================");
}

main().catch((err) => {
  console.error("脚本执行失败:", err);
  process.exit(1);
});
