/**
 * 诊断私募和公募购买失败的原因
 * 用法: node scripts/diagnose-both-sales.mjs [用户钱包地址]
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const PRIVATE_SALE_ADDRESS = process.env.PRIVATE_SALE_ADDRESS;
const PUBLIC_SALE_ADDRESS = process.env.PUBLIC_SALE_ADDRESS;
const USDT_ADDRESS = process.env.USDT_ADDRESS;
const PV_COIN_ADDRESS = process.env.PV_COIN_ADDRESS;

const USER_ADDRESS = process.argv[2] || null;

// 两个合约 ABI 相同（PrivateSale 和 PublicSale v2 接口一致）
const SALE_ABI = [
  'function paused() external view returns (bool)',
  'function isWhitelisted(address) external view returns (bool)',
  'function usdt() external view returns (address)',
  'function pvCoin() external view returns (address)',
  'function exchangeRate() external view returns (uint256)',
  'function maxPerUser() external view returns (uint256)',
  'function purchaseAmount(address) external view returns (uint256)',
  'function totalSold() external view returns (uint256)',
  'function saleEndTime() external view returns (uint256)',
  'function saleStartTime() external view returns (uint256)',
  'function getPVCoinBalance() external view returns (uint256)',
  'function getUSDTBalance() external view returns (uint256)',
  'function getRemainingQuota(address) external view returns (uint256)',
  'function purchase(uint256 _usdtAmount) external',
];

const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

const PVCOIN_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function isKycVerified(address) external view returns (bool)',
  'function isSenderWhitelisted(address) external view returns (bool)',
];

async function diagnoseSale(provider, name, saleAddress, usdt, pvcoin, userAddress) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name} (${saleAddress})`);
  console.log('='.repeat(60));

  const sale = new ethers.Contract(saleAddress, SALE_ABI, provider);

  // 合约基本状态
  const [
    paused,
    contractUsdtAddr,
    contractPvcAddr,
    exchangeRate,
    maxPerUser,
    totalSold,
    saleStartTime,
    saleEndTime,
    pvcBalance,
    usdtBalance,
  ] = await Promise.all([
    sale.paused().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.usdt().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.pvCoin().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.exchangeRate().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.maxPerUser().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.totalSold().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.saleStartTime().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.saleEndTime().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.getPVCoinBalance().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    sale.getUSDTBalance().catch(e => `ERROR: ${e.message.substring(0, 50)}`),
  ]);

  const now = Math.floor(Date.now() / 1000);

  console.log('\n--- 合约状态 ---');
  console.log(`paused:          ${paused}`);
  console.log(`合约内 USDT:     ${contractUsdtAddr}`);
  console.log(`前端 USDT:       ${USDT_ADDRESS}`);
  const usdtMatch = typeof contractUsdtAddr === 'string' && 
    contractUsdtAddr.toLowerCase() === USDT_ADDRESS?.toLowerCase();
  console.log(`USDT 地址匹配:   ${usdtMatch ? '✅' : '❌ 不匹配！'}`);
  console.log(`合约内 PVC:      ${contractPvcAddr}`);
  console.log(`前端 PVC:        ${PV_COIN_ADDRESS}`);
  const pvcMatch = typeof contractPvcAddr === 'string' && 
    contractPvcAddr.toLowerCase() === PV_COIN_ADDRESS?.toLowerCase();
  console.log(`PVC 地址匹配:    ${pvcMatch ? '✅' : '❌ 不匹配！'}`);

  if (typeof exchangeRate === 'bigint') {
    // exchangeRate: PVC per USDT, 精度 6 位
    console.log(`exchangeRate:    ${exchangeRate.toString()} (raw) = ${Number(exchangeRate) / 1e6} PVC/USDT`);
  } else {
    console.log(`exchangeRate:    ${exchangeRate}`);
  }

  if (typeof maxPerUser === 'bigint') {
    console.log(`maxPerUser:      ${ethers.formatUnits(maxPerUser, 6)} USDT`);
  } else {
    console.log(`maxPerUser:      ${maxPerUser}`);
  }

  if (typeof totalSold === 'bigint') {
    console.log(`totalSold:       ${ethers.formatUnits(totalSold, 18)} PVC`);
  } else {
    console.log(`totalSold:       ${totalSold}`);
  }

  if (typeof saleStartTime === 'bigint') {
    const start = Number(saleStartTime);
    const end = typeof saleEndTime === 'bigint' ? Number(saleEndTime) : 0;
    console.log(`saleStartTime:   ${new Date(start * 1000).toISOString()} ${start <= now ? '(已开始)' : '(未开始)'}`);
    console.log(`saleEndTime:     ${new Date(end * 1000).toISOString()} ${end >= now ? '(未结束)' : '(已结束)'}`);
    const isActive = !paused && start <= now && end >= now;
    console.log(`销售状态:        ${isActive ? '✅ 进行中' : '❌ 不在销售期'}`);
  }

  if (typeof pvcBalance === 'bigint') {
    const pvcFmt = ethers.formatUnits(pvcBalance, 18);
    console.log(`合约 PVC 余额:   ${pvcFmt} PVC ${Number(pvcFmt) < 1 ? '⚠️ 余额不足！' : '✅'}`);
  } else {
    console.log(`合约 PVC 余额:   ${pvcBalance}`);
  }

  if (typeof usdtBalance === 'bigint') {
    console.log(`合约 USDT 余额:  ${ethers.formatUnits(usdtBalance, 6)} USDT`);
  } else {
    console.log(`合约 USDT 余额:  ${usdtBalance}`);
  }

  // 用户状态
  if (userAddress) {
    console.log('\n--- 用户状态 ---');
    const [
      isWhitelisted,
      userPurchased,
      remainingQuota,
      usdtBal,
      usdtAllowance,
      usdtDecimals,
    ] = await Promise.all([
      sale.isWhitelisted(userAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
      sale.purchaseAmount(userAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
      sale.getRemainingQuota(userAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
      usdt.balanceOf(userAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
      usdt.allowance(userAddress, saleAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
      usdt.decimals().catch(() => 6),
    ]);

    console.log(`白名单状态:      ${isWhitelisted === true ? '✅ 已通过' : isWhitelisted === false ? '❌ 未通过' : isWhitelisted}`);
    if (typeof userPurchased === 'bigint') {
      console.log(`已购买 PVC:      ${ethers.formatUnits(userPurchased, 18)} PVC`);
    }
    if (typeof remainingQuota === 'bigint') {
      console.log(`剩余可购额度:    ${ethers.formatUnits(remainingQuota, 6)} USDT`);
    }
    if (typeof usdtBal === 'bigint') {
      console.log(`用户 USDT 余额:  ${ethers.formatUnits(usdtBal, usdtDecimals)} USDT`);
    }
    if (typeof usdtAllowance === 'bigint') {
      const allowFmt = ethers.formatUnits(usdtAllowance, usdtDecimals);
      console.log(`USDT allowance:  ${allowFmt} USDT ${Number(allowFmt) > 0 ? '✅' : '❌ 未授权'}`);
    }

    // PVCoin KYC 状态
    const pvcContract = new ethers.Contract(PV_COIN_ADDRESS, PVCOIN_ABI, provider);
    const [isKyc, isSender] = await Promise.all([
      pvcContract.isKycVerified(userAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
      pvcContract.isSenderWhitelisted(saleAddress).catch(e => `ERROR: ${e.message.substring(0, 50)}`),
    ]);
    console.log(`PVCoin KYC:      ${isKyc === true ? '✅ 已验证' : isKyc === false ? '❌ 未验证' : isKyc}`);
    console.log(`合约 SenderWL:   ${isSender === true ? '✅ 已添加' : isSender === false ? '❌ 未添加' : isSender}`);

    // 模拟购买（estimateGas）
    console.log('\n--- 模拟购买 1 USDT (estimateGas) ---');
    try {
      const testAmount = ethers.parseUnits('1', usdtDecimals);
      const gasEstimate = await sale.purchase.estimateGas(testAmount, { from: userAddress });
      console.log(`✅ estimateGas 成功，预估 gas: ${gasEstimate.toString()}`);
    } catch (err) {
      console.log(`❌ estimateGas 失败（这是购买失败的直接原因）:`);
      // 解析 revert reason
      const msg = err.message || '';
      const dataMatch = msg.match(/data="([^"]+)"/);
      const reasonMatch = msg.match(/reason="([^"]+)"/);
      if (reasonMatch) console.log(`  revert reason: ${reasonMatch[1]}`);
      if (dataMatch) console.log(`  revert data:   ${dataMatch[1]}`);
      console.log(`  完整错误: ${msg.substring(0, 500)}`);
    }
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);

  console.log('=== PECT 购买诊断工具 ===');
  console.log(`RPC:             ${RPC_URL}`);
  console.log(`USDT:            ${USDT_ADDRESS}`);
  console.log(`PVCoin:          ${PV_COIN_ADDRESS}`);
  if (USER_ADDRESS) {
    console.log(`用户地址:        ${USER_ADDRESS}`);
  } else {
    console.log(`用户地址:        (未提供，跳过用户状态检查)`);
  }

  await diagnoseSale(provider, '私募 (PrivateSale)', PRIVATE_SALE_ADDRESS, usdt, null, USER_ADDRESS);
  await diagnoseSale(provider, '公募 (PublicSale)', PUBLIC_SALE_ADDRESS, usdt, null, USER_ADDRESS);

  console.log('\n=== 诊断完成 ===\n');
}

main().catch(console.error);
