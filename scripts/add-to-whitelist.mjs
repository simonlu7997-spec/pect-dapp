/**
 * 直接将指定地址加入 PrivateSale 和 PublicSale 白名单
 * 用法: node scripts/add-to-whitelist.mjs <钱包地址>
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

const TARGET_ADDRESS = process.argv[2];
if (!TARGET_ADDRESS || !ethers.isAddress(TARGET_ADDRESS)) {
  console.error('用法: node scripts/add-to-whitelist.mjs <钱包地址>');
  process.exit(1);
}

const SALE_ABI = [
  'function isWhitelisted(address) view returns (bool)',
  'function addToWhitelist(address[] calldata _users) external',
];

const PVCOIN_ABI = [
  'function isKycVerified(address) view returns (bool)',
  'function isSenderWhitelisted(address) view returns (bool)',
  'function addKyc(address _account) external',
  'function addSenderWhitelist(address _account) external',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log(`=== 白名单添加工具 ===`);
  console.log(`目标地址: ${TARGET_ADDRESS}`);
  console.log(`Deployer: ${signer.address}`);
  console.log('');

  const pvc = new ethers.Contract(PV_COIN_ADDRESS, PVCOIN_ABI, signer);
  const privateSale = new ethers.Contract(PRIVATE_SALE_ADDRESS, SALE_ABI, signer);
  const publicSale = new ethers.Contract(PUBLIC_SALE_ADDRESS, SALE_ABI, signer);

  // 1. PVCoin KYC
  const isKyc = await pvc.isKycVerified(TARGET_ADDRESS);
  if (!isKyc) {
    console.log('添加 PVCoin KYC...');
    const tx = await pvc.addKyc(TARGET_ADDRESS);
    await tx.wait();
    console.log(`✅ PVCoin KYC 添加成功: ${tx.hash}`);
  } else {
    console.log('✅ PVCoin KYC 已存在，跳过');
  }

  // 2. PVCoin SenderWhitelist
  const isSender = await pvc.isSenderWhitelisted(TARGET_ADDRESS);
  if (!isSender) {
    console.log('添加 PVCoin SenderWhitelist...');
    const tx = await pvc.addSenderWhitelist(TARGET_ADDRESS);
    await tx.wait();
    console.log(`✅ PVCoin SenderWhitelist 添加成功: ${tx.hash}`);
  } else {
    console.log('✅ PVCoin SenderWhitelist 已存在，跳过');
  }

  // 3. PrivateSale 白名单
  const isPrivate = await privateSale.isWhitelisted(TARGET_ADDRESS);
  if (!isPrivate) {
    console.log('添加 PrivateSale 白名单...');
    const tx = await privateSale.addToWhitelist([TARGET_ADDRESS]);
    await tx.wait();
    console.log(`✅ PrivateSale 白名单添加成功: ${tx.hash}`);
  } else {
    console.log('✅ PrivateSale 白名单已存在，跳过');
  }

  // 4. PublicSale 白名单
  const isPublic = await publicSale.isWhitelisted(TARGET_ADDRESS);
  if (!isPublic) {
    console.log('添加 PublicSale 白名单...');
    const tx = await publicSale.addToWhitelist([TARGET_ADDRESS]);
    await tx.wait();
    console.log(`✅ PublicSale 白名单添加成功: ${tx.hash}`);
  } else {
    console.log('✅ PublicSale 白名单已存在，跳过');
  }

  // 5. 验证结果
  console.log('\n=== 验证结果 ===');
  const [kycFinal, senderFinal, privateFinal, publicFinal] = await Promise.all([
    pvc.isKycVerified(TARGET_ADDRESS),
    pvc.isSenderWhitelisted(TARGET_ADDRESS),
    privateSale.isWhitelisted(TARGET_ADDRESS),
    publicSale.isWhitelisted(TARGET_ADDRESS),
  ]);
  console.log(`PVCoin KYC:         ${kycFinal ? '✅' : '❌'}`);
  console.log(`PVCoin SenderWL:    ${senderFinal ? '✅' : '❌'}`);
  console.log(`PrivateSale 白名单: ${privateFinal ? '✅' : '❌'}`);
  console.log(`PublicSale 白名单:  ${publicFinal ? '✅' : '❌'}`);

  if (kycFinal && privateFinal && publicFinal) {
    console.log('\n🎉 所有白名单添加完成！用户现在可以购买 PVC 了。');
  } else {
    console.log('\n⚠️ 部分白名单添加失败，请检查上方错误信息。');
  }
}

main().catch(console.error);
