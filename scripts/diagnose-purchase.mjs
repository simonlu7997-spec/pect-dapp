/**
 * 诊断公募购买失败的原因
 * 用法: node scripts/diagnose-purchase.mjs <用户钱包地址>
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PUBLIC_SALE_ADDRESS = process.env.PUBLIC_SALE_ADDRESS || process.env.VITE_PUBLIC_SALE_ADDRESS;
const USDT_ADDRESS = process.env.USDT_ADDRESS || process.env.VITE_USDT_ADDRESS;
const PV_COIN_ADDRESS = process.env.PV_COIN_ADDRESS || process.env.VITE_PV_COIN_ADDRESS;

// 用命令行参数或默认测试地址
const USER_ADDRESS = process.argv[2] || '0x0000000000000000000000000000000000000001';

const PUBLIC_SALE_ABI = [
  'function paused() external view returns (bool)',
  'function isActive() external view returns (bool)',
  'function isWhitelisted(address) external view returns (bool)',
  'function usdtToken() external view returns (address)',
  'function pvcToken() external view returns (address)',
  'function tokenPrice() external view returns (uint256)',
  'function maxPurchaseAmount() external view returns (uint256)',
  'function minPurchaseAmount() external view returns (uint256)',
  'function purchaseAmount(address) external view returns (uint256)',
  'function totalSold() external view returns (uint256)',
  'function saleEndTime() external view returns (uint256)',
  'function saleStartTime() external view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

async function diagnose() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  console.log('=== 公募购买诊断 ===');
  console.log('RPC:', RPC_URL);
  console.log('PublicSale:', PUBLIC_SALE_ADDRESS);
  console.log('USDT:', USDT_ADDRESS);
  console.log('PVCoin:', PV_COIN_ADDRESS);
  console.log('用户地址:', USER_ADDRESS);
  console.log('');

  if (!PUBLIC_SALE_ADDRESS || PUBLIC_SALE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('❌ PUBLIC_SALE_ADDRESS 未配置');
    return;
  }

  const publicSale = new ethers.Contract(PUBLIC_SALE_ADDRESS, PUBLIC_SALE_ABI, provider);
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);

  try {
    // 1. 合约状态
    const [paused, isActive, contractUsdtAddr, contractPvcAddr, tokenPrice, maxPurchase, minPurchase, totalSold] = await Promise.all([
      publicSale.paused().catch(() => 'N/A'),
      publicSale.isActive().catch(() => 'N/A'),
      publicSale.usdtToken().catch(() => 'N/A'),
      publicSale.pvcToken().catch(() => 'N/A'),
      publicSale.tokenPrice().catch(() => 'N/A'),
      publicSale.maxPurchaseAmount().catch(() => 'N/A'),
      publicSale.minPurchaseAmount().catch(() => 'N/A'),
      publicSale.totalSold().catch(() => 'N/A'),
    ]);

    console.log('=== 合约状态 ===');
    console.log('paused:', paused);
    console.log('isActive:', isActive);
    console.log('合约内 USDT 地址:', contractUsdtAddr);
    console.log('前端 USDT 地址:  ', USDT_ADDRESS);
    console.log('USDT 地址匹配:', contractUsdtAddr?.toLowerCase() === USDT_ADDRESS?.toLowerCase() ? '✅' : '❌ 不匹配！');
    console.log('合约内 PVC 地址:', contractPvcAddr);
    console.log('tokenPrice (wei):', tokenPrice?.toString());
    console.log('maxPurchaseAmount (wei):', maxPurchase?.toString());
    console.log('minPurchaseAmount (wei):', minPurchase?.toString());
    console.log('totalSold (wei):', totalSold?.toString());
    console.log('');

    // 2. 用户状态
    if (USER_ADDRESS !== '0x0000000000000000000000000000000000000001') {
      const [isWhitelisted, userPurchased, usdtBalance, usdtAllowance, usdtDecimals] = await Promise.all([
        publicSale.isWhitelisted(USER_ADDRESS).catch(() => 'N/A'),
        publicSale.purchaseAmount(USER_ADDRESS).catch(() => 'N/A'),
        usdt.balanceOf(USER_ADDRESS).catch(() => 'N/A'),
        usdt.allowance(USER_ADDRESS, PUBLIC_SALE_ADDRESS).catch(() => 'N/A'),
        usdt.decimals().catch(() => 6),
      ]);

      console.log('=== 用户状态 ===');
      console.log('白名单:', isWhitelisted ? '✅ 已通过' : '❌ 未通过');
      console.log('已购买 PVC (wei):', userPurchased?.toString());
      console.log('USDT 余额:', usdtBalance !== 'N/A' ? ethers.formatUnits(usdtBalance, usdtDecimals) : 'N/A');
      console.log('USDT allowance:', usdtAllowance !== 'N/A' ? ethers.formatUnits(usdtAllowance, usdtDecimals) : 'N/A');
    }

    // 3. PVC 余额
    if (PV_COIN_ADDRESS && PV_COIN_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      const pvc = new ethers.Contract(PV_COIN_ADDRESS, ERC20_ABI, provider);
      const [pvcBalance, pvcDecimals] = await Promise.all([
        pvc.balanceOf(PUBLIC_SALE_ADDRESS).catch(() => 'N/A'),
        pvc.decimals().catch(() => 18),
      ]);
      console.log('');
      console.log('=== 合约 PVC 余额 ===');
      console.log('PVC balance:', pvcBalance !== 'N/A' ? ethers.formatUnits(pvcBalance, pvcDecimals) : 'N/A');
    }

    // 4. 尝试 estimateGas（模拟购买 1 USDT）
    if (USER_ADDRESS !== '0x0000000000000000000000000000000000000001') {
      console.log('');
      console.log('=== 模拟购买 (estimateGas) ===');
      try {
        const usdtDecimals = await usdt.decimals().catch(() => 6);
        const testAmount = ethers.parseUnits('1', usdtDecimals); // 1 USDT
        const gasEstimate = await publicSale.purchase.estimateGas(testAmount, { from: USER_ADDRESS });
        console.log('✅ estimateGas 成功，预估 gas:', gasEstimate.toString());
      } catch (err) {
        console.log('❌ estimateGas 失败（这是购买失败的直接原因）:');
        console.log('  错误信息:', err.message?.substring(0, 300));
        if (err.data) console.log('  revert data:', err.data);
      }
    }

  } catch (err) {
    console.error('诊断失败:', err.message);
  }
}

diagnose().catch(console.error);
