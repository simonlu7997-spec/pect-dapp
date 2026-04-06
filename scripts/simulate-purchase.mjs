/**
 * 模拟私募和公募购买流程（用 deployer 账户测试）
 * 用法: node scripts/simulate-purchase.mjs [用户钱包地址]
 * 
 * 如果不提供用户地址，使用 deployer 地址测试
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const PRIVATE_SALE_ADDRESS = process.env.PRIVATE_SALE_ADDRESS;
const PUBLIC_SALE_ADDRESS = process.env.PUBLIC_SALE_ADDRESS;
const USDT_ADDRESS = process.env.USDT_ADDRESS;
const PV_COIN_ADDRESS = process.env.PV_COIN_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const USER_ADDRESS = process.argv[2] || null;

const SALE_ABI = [
  'function paused() view returns (bool)',
  'function isWhitelisted(address) view returns (bool)',
  'function usdt() view returns (address)',
  'function pvCoin() view returns (address)',
  'function exchangeRate() view returns (uint256)',
  'function maxPerUser() view returns (uint256)',
  'function purchaseAmount(address) view returns (uint256)',
  'function totalSold() view returns (uint256)',
  'function saleStartTime() view returns (uint256)',
  'function saleEndTime() view returns (uint256)',
  'function getPVCoinBalance() view returns (uint256)',
  'function getRemainingQuota(address) view returns (uint256)',
  'function purchase(uint256 _usdtAmount) external',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const PVCOIN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function isKycVerified(address) view returns (bool)',
  'function isSenderWhitelisted(address) view returns (bool)',
];

async function testSale(provider, name, saleAddress, testAddress, usdtContract, pvcContract) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`  合约: ${saleAddress}`);
  console.log(`  测试用户: ${testAddress}`);
  console.log('='.repeat(60));

  const sale = new ethers.Contract(saleAddress, SALE_ABI, provider);
  const usdtDecimals = Number(await usdtContract.decimals());
  const pvcDecimals = Number(await pvcContract.decimals());

  // 1. 合约状态
  const [paused, contractUsdt, exchangeRate, maxPerUser, totalSold, startTime, endTime, pvcBalance] = await Promise.all([
    sale.paused(),
    sale.usdt(),
    sale.exchangeRate(),
    sale.maxPerUser(),
    sale.totalSold(),
    sale.saleStartTime(),
    sale.saleEndTime(),
    sale.getPVCoinBalance(),
  ]);

  const now = Math.floor(Date.now() / 1000);
  const isActive = !paused && Number(startTime) <= now && Number(endTime) >= now;

  console.log('\n--- 合约状态 ---');
  console.log(`paused:        ${paused}`);
  console.log(`USDT 地址匹配: ${contractUsdt.toLowerCase() === USDT_ADDRESS.toLowerCase() ? '✅' : '❌ ' + contractUsdt}`);
  console.log(`exchangeRate:  ${Number(exchangeRate) / 10**6} PVC/USDT`);
  console.log(`maxPerUser:    ${ethers.formatUnits(maxPerUser, usdtDecimals)} USDT`);
  console.log(`totalSold:     ${ethers.formatUnits(totalSold, pvcDecimals)} PVC`);
  console.log(`销售状态:      ${isActive ? '✅ 进行中' : '❌ 不在销售期'}`);
  console.log(`PVC 余额:      ${ethers.formatUnits(pvcBalance, pvcDecimals)} PVC ${Number(ethers.formatUnits(pvcBalance, pvcDecimals)) < 1 ? '⚠️ 不足！' : '✅'}`);

  // 2. 用户状态
  const [isWhitelisted, userPurchased, remainingQuota, usdtBalance, usdtAllowance, isKyc] = await Promise.all([
    sale.isWhitelisted(testAddress),
    sale.purchaseAmount(testAddress),
    sale.getRemainingQuota(testAddress),
    usdtContract.balanceOf(testAddress),
    usdtContract.allowance(testAddress, saleAddress),
    pvcContract.isKycVerified(testAddress),
  ]);

  console.log('\n--- 用户状态 ---');
  console.log(`白名单:        ${isWhitelisted ? '✅ 已通过' : '❌ 未通过'}`);
  console.log(`PVC KYC:       ${isKyc ? '✅ 已验证' : '❌ 未验证'}`);
  console.log(`已购买 PVC:    ${ethers.formatUnits(userPurchased, pvcDecimals)} PVC`);
  console.log(`剩余额度:      ${ethers.formatUnits(remainingQuota, usdtDecimals)} USDT`);
  console.log(`USDT 余额:     ${ethers.formatUnits(usdtBalance, usdtDecimals)} USDT`);
  console.log(`USDT allowance:${ethers.formatUnits(usdtAllowance, usdtDecimals)} USDT ${Number(ethers.formatUnits(usdtAllowance, usdtDecimals)) > 0 ? '✅' : '❌ 需要先 approve'}`);

  // 3. 模拟购买 1 USDT
  console.log('\n--- 模拟购买 1 USDT ---');
  const testAmount = ethers.parseUnits('1', usdtDecimals);
  try {
    const gasEstimate = await sale.purchase.estimateGas(testAmount, { from: testAddress });
    console.log(`✅ estimateGas 成功: ${gasEstimate.toString()} gas`);
  } catch (err) {
    console.log(`❌ estimateGas 失败（购买会 revert）:`);
    const msg = err.message || '';
    // 提取 revert reason
    const reasonMatch = msg.match(/reason="([^"]+)"/);
    const dataMatch = msg.match(/"data":"([^"]+)"/);
    if (reasonMatch) {
      console.log(`  revert reason: "${reasonMatch[1]}"`);
    } else if (msg.includes('execution reverted')) {
      // 尝试解码 revert data
      const hexMatch = msg.match(/0x[0-9a-fA-F]+/);
      if (hexMatch) {
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + hexMatch[0].slice(10));
          console.log(`  revert message: "${decoded[0]}"`);
        } catch {
          console.log(`  revert data: ${hexMatch[0]}`);
        }
      }
      console.log(`  原始错误: ${msg.substring(0, 300)}`);
    } else {
      console.log(`  错误: ${msg.substring(0, 300)}`);
    }
  }

  // 4. 诊断建议
  console.log('\n--- 诊断建议 ---');
  const issues = [];
  if (paused) issues.push('❌ 合约已暂停');
  if (!isActive) issues.push('❌ 不在销售时间范围内');
  if (!isWhitelisted) issues.push('❌ 用户未通过白名单');
  if (!isKyc) issues.push('❌ 用户未通过 PVCoin KYC（购买后 PVC 无法转账）');
  if (Number(ethers.formatUnits(usdtAllowance, usdtDecimals)) === 0) issues.push('❌ USDT allowance 为 0（需要先 approve）');
  if (Number(ethers.formatUnits(usdtBalance, usdtDecimals)) < 1) issues.push('❌ USDT 余额不足');
  if (Number(ethers.formatUnits(pvcBalance, pvcDecimals)) < 1) issues.push('❌ 合约 PVC 余额不足');
  if (Number(ethers.formatUnits(remainingQuota, usdtDecimals)) < 1) issues.push('❌ 用户已达购买上限');
  
  if (issues.length === 0) {
    console.log('✅ 所有条件满足，购买应该可以成功');
  } else {
    issues.forEach(i => console.log(i));
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const testAddress = USER_ADDRESS || deployerWallet.address;

  const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
  const pvcContract = new ethers.Contract(PV_COIN_ADDRESS, PVCOIN_ABI, provider);

  console.log('=== PECT 购买流程模拟诊断 ===');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`USDT: ${USDT_ADDRESS}`);
  console.log(`PVC: ${PV_COIN_ADDRESS}`);
  console.log(`测试地址: ${testAddress}${!USER_ADDRESS ? ' (deployer)' : ''}`);

  await testSale(provider, '私募 (PrivateSale)', PRIVATE_SALE_ADDRESS, testAddress, usdtContract, pvcContract);
  await testSale(provider, '公募 (PublicSale)', PUBLIC_SALE_ADDRESS, testAddress, usdtContract, pvcContract);

  console.log('\n=== 诊断完成 ===\n');
}

main().catch(console.error);
