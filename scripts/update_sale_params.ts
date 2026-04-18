/**
 * 更新私募和公募合约的 exchangeRate 和 maxPerUser 参数
 *
 * 私募：0.08 USDT/PVC = 12.5 PVC/USDT → exchangeRate = 12.5 * 10^6 = 12500000
 *       最高购买 20000 USDT → maxPerUser = 20000 * 10^6 = 20000000000
 *
 * 公募：0.1 USDT/PVC = 10 PVC/USDT → exchangeRate = 10 * 10^6 = 10000000
 *       最高购买 10000 USDT → maxPerUser = 10000 * 10^6 = 10000000000
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const SALE_ABI = [
  "function setExchangeRate(uint256 _newRate) external",
  "function setMaxPerUser(uint256 _newMax) external",
  "function exchangeRate() external view returns (uint256)",
  "function maxPerUser() external view returns (uint256)",
  "function owner() external view returns (address)",
];

async function updateSaleParams() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
  const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;

  if (!rpcUrl || !privateKey || !privateSaleAddress || !publicSaleAddress) {
    throw new Error("缺少必要的环境变量：BLOCKCHAIN_RPC_URL / DEPLOYER_PRIVATE_KEY / PRIVATE_SALE_ADDRESS / PUBLIC_SALE_ADDRESS");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`\n钱包地址: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`MATIC 余额: ${ethers.formatEther(balance)} MATIC\n`);

  // ── 私募合约 ──────────────────────────────────────────────────────────────
  const privateSale = new ethers.Contract(privateSaleAddress, SALE_ABI, wallet);

  const privateOwner = await privateSale.owner();
  console.log(`[PrivateSale] Owner: ${privateOwner}`);
  if (privateOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`[PrivateSale] 当前钱包不是 Owner！Owner: ${privateOwner}, 当前: ${wallet.address}`);
  }

  const currentPrivateRate = await privateSale.exchangeRate();
  const currentPrivateMax = await privateSale.maxPerUser();
  console.log(`[PrivateSale] 当前 exchangeRate: ${currentPrivateRate.toString()} (= ${Number(currentPrivateRate) / 1e6} PVC/USDT)`);
  console.log(`[PrivateSale] 当前 maxPerUser: ${currentPrivateMax.toString()} (= ${Number(currentPrivateMax) / 1e6} USDT)`);

  // 私募：0.08 USDT/PVC → 12.5 PVC/USDT → exchangeRate = 12500000
  const newPrivateRate = 12500000n; // 12.5 * 10^6
  const newPrivateMax = 20000n * 1000000n; // 20000 * 10^6

  if (currentPrivateRate !== newPrivateRate) {
    console.log(`\n[PrivateSale] 更新 exchangeRate: ${currentPrivateRate} → ${newPrivateRate}`);
    const tx1 = await privateSale.setExchangeRate(newPrivateRate);
    console.log(`[PrivateSale] setExchangeRate tx: ${tx1.hash}`);
    await tx1.wait();
    console.log(`[PrivateSale] setExchangeRate 已确认 ✓`);
  } else {
    console.log(`[PrivateSale] exchangeRate 已是目标值，跳过`);
  }

  if (currentPrivateMax !== newPrivateMax) {
    console.log(`\n[PrivateSale] 更新 maxPerUser: ${currentPrivateMax} → ${newPrivateMax}`);
    const tx2 = await privateSale.setMaxPerUser(newPrivateMax);
    console.log(`[PrivateSale] setMaxPerUser tx: ${tx2.hash}`);
    await tx2.wait();
    console.log(`[PrivateSale] setMaxPerUser 已确认 ✓`);
  } else {
    console.log(`[PrivateSale] maxPerUser 已是目标值，跳过`);
  }

  // ── 公募合约 ──────────────────────────────────────────────────────────────
  const publicSale = new ethers.Contract(publicSaleAddress, SALE_ABI, wallet);

  const publicOwner = await publicSale.owner();
  console.log(`\n[PublicSale] Owner: ${publicOwner}`);
  if (publicOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`[PublicSale] 当前钱包不是 Owner！Owner: ${publicOwner}, 当前: ${wallet.address}`);
  }

  const currentPublicRate = await publicSale.exchangeRate();
  const currentPublicMax = await publicSale.maxPerUser();
  console.log(`[PublicSale] 当前 exchangeRate: ${currentPublicRate.toString()} (= ${Number(currentPublicRate) / 1e6} PVC/USDT)`);
  console.log(`[PublicSale] 当前 maxPerUser: ${currentPublicMax.toString()} (= ${Number(currentPublicMax) / 1e6} USDT)`);

  // 公募：0.1 USDT/PVC → 10 PVC/USDT → exchangeRate = 10000000（已是默认值，但仍显式设置）
  const newPublicRate = 10000000n; // 10 * 10^6
  const newPublicMax = 10000n * 1000000n; // 10000 * 10^6

  if (currentPublicRate !== newPublicRate) {
    console.log(`\n[PublicSale] 更新 exchangeRate: ${currentPublicRate} → ${newPublicRate}`);
    const tx3 = await publicSale.setExchangeRate(newPublicRate);
    console.log(`[PublicSale] setExchangeRate tx: ${tx3.hash}`);
    await tx3.wait();
    console.log(`[PublicSale] setExchangeRate 已确认 ✓`);
  } else {
    console.log(`[PublicSale] exchangeRate 已是目标值，跳过`);
  }

  if (currentPublicMax !== newPublicMax) {
    console.log(`\n[PublicSale] 更新 maxPerUser: ${currentPublicMax} → ${newPublicMax}`);
    const tx4 = await publicSale.setMaxPerUser(newPublicMax);
    console.log(`[PublicSale] setMaxPerUser tx: ${tx4.hash}`);
    await tx4.wait();
    console.log(`[PublicSale] setMaxPerUser 已确认 ✓`);
  } else {
    console.log(`[PublicSale] maxPerUser 已是目标值，跳过`);
  }

  // ── 验证最终值 ────────────────────────────────────────────────────────────
  console.log(`\n── 验证最终链上值 ──`);
  const finalPrivateRate = await privateSale.exchangeRate();
  const finalPrivateMax = await privateSale.maxPerUser();
  const finalPublicRate = await publicSale.exchangeRate();
  const finalPublicMax = await publicSale.maxPerUser();

  console.log(`[PrivateSale] exchangeRate: ${finalPrivateRate} (= ${Number(finalPrivateRate) / 1e6} PVC/USDT = 0.08 USDT/PVC)`);
  console.log(`[PrivateSale] maxPerUser: ${finalPrivateMax} (= ${Number(finalPrivateMax) / 1e6} USDT)`);
  console.log(`[PublicSale] exchangeRate: ${finalPublicRate} (= ${Number(finalPublicRate) / 1e6} PVC/USDT = 0.1 USDT/PVC)`);
  console.log(`[PublicSale] maxPerUser: ${finalPublicMax} (= ${Number(finalPublicMax) / 1e6} USDT)`);

  console.log(`\n✅ 所有链上参数更新完成！`);
}

updateSaleParams().catch((e) => {
  console.error("❌ 更新失败:", e.message);
  process.exit(1);
});
