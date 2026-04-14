import { ethers } from "ethers";

const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

async function main() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
  const c2Addr = process.env.VITE_C2_COIN_ADDRESS || process.env.C2_COIN_ADDRESS;
  
  console.log("C2 Address:", c2Addr);
  
  if (!c2Addr) { console.log("No C2 address"); return; }
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const c2 = new ethers.Contract(c2Addr, ERC20_ABI, provider);
  
  const [decimals, symbol] = await Promise.all([c2.decimals(), c2.symbol()]);
  console.log("C2 symbol:", symbol);
  console.log("C2 decimals:", decimals.toString());
  
  // 用正确精度格式化
  const totalStakedABI = ["function getTotalStaked() public view returns (uint256)"];
  const stakingAddr = process.env.VITE_STAKING_MANAGER_ADDRESS;
  const staking = new ethers.Contract(stakingAddr!, totalStakedABI, provider);
  const raw = await staking.getTotalStaked();
  console.log("totalStaked formatted with correct decimals:", ethers.formatUnits(raw, decimals));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
