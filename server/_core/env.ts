export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Blockchain
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL ?? "",
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY ?? "",
  pvCoinAddress: process.env.PV_COIN_ADDRESS ?? "",
  usdtAddress: process.env.USDT_ADDRESS ?? "",
  privateSaleAddress: process.env.PRIVATE_SALE_ADDRESS ?? "",
  stakingManagerAddress: process.env.VITE_STAKING_MANAGER_ADDRESS ?? "",
  revenueDistributorAddress: process.env.VITE_REVENUE_DISTRIBUTOR_ADDRESS ?? "",
  c2CoinAddress: process.env.VITE_C2_COIN_ADDRESS ?? "",
};
