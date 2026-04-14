import { ethers } from "ethers";

const STAKING_MANAGER_ABI = [
  "function getTotalStaked() public view returns (uint256)",
];

async function main() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
  const stakingAddr = process.env.VITE_STAKING_MANAGER_ADDRESS || process.env.STAKING_MANAGER_ADDRESS;
  
  console.log("RPC URL:", rpcUrl);
  console.log("Staking Address:", stakingAddr);
  
  if (!stakingAddr) {
    console.log("No staking address configured");
    return;
  }
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(stakingAddr, STAKING_MANAGER_ABI, provider);
  
  try {
    const totalStaked = await contract.getTotalStaked();
    console.log("getTotalStaked() raw:", totalStaked.toString());
    console.log("getTotalStaked() formatted (18 decimals):", ethers.formatUnits(totalStaked, 18));
  } catch (err) {
    console.error("Error calling getTotalStaked():", (err as Error).message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
