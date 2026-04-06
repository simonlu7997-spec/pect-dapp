/**
 * 检查 deployer 和两个 Sale 合约的 PVC 余额
 * 同时检查 Sale 合约是否在 PVCoin KYC 白名单和 SenderWhitelist 中
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
const PV_COIN_ADDRESS = process.env.PV_COIN_ADDRESS;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const PVC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function isKycVerified(address) view returns (bool)',
  'function isSenderWhitelisted(address) view returns (bool)',
];

const SALE_ABI = [
  'function getPVCoinBalance() view returns (uint256)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const pvc = new ethers.Contract(PV_COIN_ADDRESS, PVC_ABI, provider);
  
  const decimals = Number(await pvc.decimals());
  const symbol = await pvc.symbol();
  
  console.log(`PVCoin: ${PV_COIN_ADDRESS}`);
  console.log(`Symbol: ${symbol}, Decimals: ${decimals}`);
  console.log('');

  // Deployer 余额
  const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const deployerAddr = deployerWallet.address;
  const deployerRaw = await pvc.balanceOf(deployerAddr);
  console.log(`Deployer: ${deployerAddr}`);
  console.log(`  PVC 余额 (raw):    ${deployerRaw.toString()}`);
  console.log(`  PVC 余额 (格式化): ${ethers.formatUnits(deployerRaw, decimals)} ${symbol}`);
  console.log(`  KYC 状态:          ${await pvc.isKycVerified(deployerAddr)}`);
  console.log(`  SenderWhitelist:   ${await pvc.isSenderWhitelisted(deployerAddr)}`);
  console.log('');

  // 私募合约
  const privateSale = new ethers.Contract(PRIVATE_SALE_ADDRESS, SALE_ABI, provider);
  const privateRaw = await privateSale.getPVCoinBalance();
  const privateKyc = await pvc.isKycVerified(PRIVATE_SALE_ADDRESS);
  const privateSender = await pvc.isSenderWhitelisted(PRIVATE_SALE_ADDRESS);
  console.log(`PrivateSale: ${PRIVATE_SALE_ADDRESS}`);
  console.log(`  PVC 余额 (raw):    ${privateRaw.toString()}`);
  console.log(`  PVC 余额 (格式化): ${ethers.formatUnits(privateRaw, decimals)} ${symbol}`);
  console.log(`  KYC 状态:          ${privateKyc} ${!privateKyc ? '⚠️ 需要添加 KYC' : '✅'}`);
  console.log(`  SenderWhitelist:   ${privateSender}`);
  console.log('');

  // 公募合约
  const publicSale = new ethers.Contract(PUBLIC_SALE_ADDRESS, SALE_ABI, provider);
  const publicRaw = await publicSale.getPVCoinBalance();
  const publicKyc = await pvc.isKycVerified(PUBLIC_SALE_ADDRESS);
  const publicSender = await pvc.isSenderWhitelisted(PUBLIC_SALE_ADDRESS);
  console.log(`PublicSale: ${PUBLIC_SALE_ADDRESS}`);
  console.log(`  PVC 余额 (raw):    ${publicRaw.toString()}`);
  console.log(`  PVC 余额 (格式化): ${ethers.formatUnits(publicRaw, decimals)} ${symbol}`);
  console.log(`  KYC 状态:          ${publicKyc} ${!publicKyc ? '⚠️ 需要添加 KYC' : '✅'}`);
  console.log(`  SenderWhitelist:   ${publicSender}`);
  console.log('');

  // 充值建议
  console.log('=== 充值建议 ===');
  const privateNeeded = Number(ethers.formatUnits(privateRaw, decimals)) < 100000;
  const publicNeeded = Number(ethers.formatUnits(publicRaw, decimals)) < 100000;
  if (privateNeeded) {
    console.log(`⚠️  私募合约 PVC 不足，建议充入 500000 PVC`);
    console.log(`   在管理后台点击「充入私募 PVC」，输入 500000`);
  }
  if (publicNeeded) {
    console.log(`⚠️  公募合约 PVC 不足，建议充入 500000 PVC`);
    console.log(`   在管理后台点击「充入公募 PVC」，输入 500000`);
  }
  if (!privateNeeded && !publicNeeded) {
    console.log('✅ 两个合约 PVC 余额充足');
  }
}

main().catch(console.error);
