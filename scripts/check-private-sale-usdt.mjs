/**
 * 临时脚本：验证 PrivateSale 合约内部 USDT 地址
 * 运行：node scripts/check-private-sale-usdt.mjs
 */
import { ethers } from "ethers";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 .env 文件
function readEnv() {
  try {
    const envPath = join(__dirname, "../.env");
    const content = readFileSync(envPath, "utf8");
    const vars = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) vars[match[1].trim()] = match[2].trim();
    }
    return vars;
  } catch {
    return {};
  }
}

const env = readEnv();
const privateSaleAddr = env.PRIVATE_SALE_ADDRESS || env.VITE_PRIVATE_SALE_ADDRESS;
const publicSaleAddr = env.PUBLIC_SALE_ADDRESS || env.VITE_PUBLIC_SALE_ADDRESS;
const usdtAddr = env.USDT_ADDRESS || env.VITE_USDT_ADDRESS;
const rpcUrl = env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";

console.log("=== 环境变量 ===");
console.log("PRIVATE_SALE_ADDRESS:", privateSaleAddr);
console.log("PUBLIC_SALE_ADDRESS:", publicSaleAddr);
console.log("USDT_ADDRESS:", usdtAddr);
console.log("RPC_URL:", rpcUrl);
console.log("");

const SaleABI = ["function usdt() external view returns (address)"];
const provider = new ethers.JsonRpcProvider(rpcUrl);

async function checkContract(name, addr) {
  if (!addr) {
    console.log(`${name}: 地址未配置，跳过`);
    return;
  }
  try {
    const sale = new ethers.Contract(addr, SaleABI, provider);
    const contractUsdt = await sale.usdt();
    const match = contractUsdt.toLowerCase() === (usdtAddr || "").toLowerCase();
    console.log(`${name} (${addr})`);
    console.log(`  合约内部 USDT: ${contractUsdt}`);
    console.log(`  环境变量 USDT: ${usdtAddr}`);
    console.log(`  地址一致: ${match ? "✅ 是" : "❌ 否 — 需要更新环境变量！"}`);
  } catch (e) {
    console.log(`${name}: 查询失败 — ${e.message}`);
  }
  console.log("");
}

await checkContract("PrivateSale", privateSaleAddr);
await checkContract("PublicSale", publicSaleAddr);
