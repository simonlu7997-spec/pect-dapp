import { router, publicProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet, getTransactionsByWalletPaged } from "../db";

// PrivateSale / PublicSale 合约 ABI（对照合约实际函数名）
// 合约实际函数：exchangeRate, totalSold, maxPerUser, saleStartTime, saleEndTime, paused, purchaseAmount, purchase
const SaleABI = [
  "function exchangeRate() external view returns (uint256)",   // PVC per USDT（如 10 表示 1 USDT = 10 PVC）
  "function totalSold() external view returns (uint256)",      // 已售出 PVC 数量
  "function maxPerUser() external view returns (uint256)",     // 每人最大购买 USDT 上限
  "function saleStartTime() external view returns (uint256)",  // 销售开始时间（unix timestamp）
  "function saleEndTime() external view returns (uint256)",    // 销售结束时间（unix timestamp）
  "function paused() external view returns (bool)",            // 是否暂停
  "function purchaseAmount(address) external view returns (uint256)", // 用户已购买 USDT 数量
  "function purchase(uint256 _usdtAmount) external",           // 购买函数
];

// ERC20 USDT ABI（授权和余额查询）
const ERC20ABI = [
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

function getContracts() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
  const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
  const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;
  const usdtAddress = process.env.USDT_ADDRESS;
  return { rpcUrl, privateSaleAddress, publicSaleAddress, usdtAddress };
}

/** 通用：从链上读取某个 Sale 合约的完整信息 */
async function fetchSaleInfo(
  rpcUrl: string,
  saleAddress: string,
  usdtAddress: string | undefined,
  walletAddress: string | undefined,
) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const sale = new ethers.Contract(saleAddress, SaleABI, provider);

  // 第一步：读取合约基础信息（不依赖用户地址）
  const [exchangeRate, totalSold, maxPerUser, saleStartTime, saleEndTime, paused] =
    await Promise.all([
      sale.exchangeRate(),
      sale.totalSold(),
      sale.maxPerUser(),
      sale.saleStartTime(),
      sale.saleEndTime(),
      sale.paused(),
    ]);

  // 推算 isActive：当前时间在销售区间内且未暂停
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(saleStartTime);
  const endTime = Number(saleEndTime);
  const isActive = !paused && now >= startTime && now <= endTime;

  // exchangeRate 带 6 位精度：exchangeRate / 10^6 = PVC per USDT
  // 例如 exchangeRate = 10000000 → 10 PVC per USDT → tokenPrice = 0.1 USDT/PVC
  const exchangeRateRaw = Number(exchangeRate);
  const pvcPerUsdt = exchangeRateRaw / 1e6;  // 实际兑换比例（如 10）
  const tokenPriceStr = pvcPerUsdt > 0
    ? (1 / pvcPerUsdt).toFixed(4)
    : "0";

  // totalSold 是 PVC 数量（18位精度），转换为 USDT 等价值用于显示进度
  // totalRaised（USDT）= totalSold（PVC）/ pvcPerUsdt
  const totalSoldPvc = parseFloat(ethers.formatUnits(totalSold, 18));
  const totalRaisedUsdt = pvcPerUsdt > 0
    ? (totalSoldPvc / pvcPerUsdt).toFixed(2)
    : "0";

  // maxPerUser 是 USDT 数量（6位精度）
  const maxPerUserFormatted = ethers.formatUnits(maxPerUser, 6);

  // 第二步：读取用户相关数据（可选）
  let usdtDecimals = 6;
  let userUsdtBalance = "0";
  let userAllowance = "0";
  let userPurchased = "0";

  if (usdtAddress && walletAddress) {
    const usdt = new ethers.Contract(usdtAddress, ERC20ABI, provider);
    // 将用户数据查询与合约数据查询分开，避免一个失败导致全部失败
    const [decimals, balance, allowance, purchased] = await Promise.all([
      usdt.decimals(),
      usdt.balanceOf(walletAddress),
      usdt.allowance(walletAddress, saleAddress),
      sale.purchaseAmount(walletAddress),
    ]);
    usdtDecimals = Number(decimals);
    userUsdtBalance = ethers.formatUnits(balance, usdtDecimals);
    userAllowance = ethers.formatUnits(allowance, usdtDecimals);
    userPurchased = ethers.formatUnits(purchased, usdtDecimals);
  }

  // 进度百分比：totalRaised / hardCap（这里用 maxPerUser 作为参考，合约无 hardCap）
  // 实际上合约没有 hardCap，进度基于 totalSold PVC / 合约 PVC 余额（暂用 0）
  const progressPercent = 0; // 合约无 hardCap，暂不显示进度

  return {
    contractConfigured: true,
    isActive,
    tokenPrice: tokenPriceStr,           // USDT per PVC
    exchangeRate: pvcPerUsdt,             // PVC per USDT（已除以 10^6）
    totalRaised: totalRaisedUsdt,         // 等价 USDT
    hardCap: "0",                         // 合约无 hardCap
    minPurchase: "1",                     // 合约无 minPurchase，默认 1 USDT
    maxPurchase: maxPerUserFormatted,     // 每人上限
    progressPercent,
    userPurchased,
    userUsdtBalance,
    userAllowance,
    saleStartTime: startTime,
    saleEndTime: endTime,
  };
}

export const purchaseRouter = router({
  // ── 查询私募轮信息（链上实时数据）──────────────────────────────────
  getPrivateSaleInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().optional() }))
    .query(async ({ input }) => {
      const { rpcUrl, privateSaleAddress, usdtAddress } = getContracts();

      if (!privateSaleAddress || privateSaleAddress === "0x0000000000000000000000000000000000000000") {
        return {
          contractConfigured: false,
          isActive: false,
          tokenPrice: "0.10",
          exchangeRate: 10,
          totalRaised: "0",
          hardCap: "80000",
          minPurchase: "500",
          maxPurchase: "100000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
          saleStartTime: 0,
          saleEndTime: 0,
        };
      }

      try {
        return await fetchSaleInfo(rpcUrl, privateSaleAddress, usdtAddress, input.walletAddress);
      } catch (error) {
        console.error("[Purchase] 查询私募轮信息失败:", error);
        return {
          contractConfigured: true,
          isActive: false,
          tokenPrice: "0.10",
          exchangeRate: 10,
          totalRaised: "0",
          hardCap: "80000",
          minPurchase: "500",
          maxPurchase: "100000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
          saleStartTime: 0,
          saleEndTime: 0,
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 查询公募轮信息（链上实时数据）──────────────────────────────────
  getPublicSaleInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().optional() }))
    .query(async ({ input }) => {
      const { rpcUrl, publicSaleAddress, usdtAddress } = getContracts();

      if (!publicSaleAddress || publicSaleAddress === "0x0000000000000000000000000000000000000000") {
        return {
          contractConfigured: false,
          isActive: false,
          tokenPrice: "0.20",
          exchangeRate: 5,
          totalRaised: "0",
          hardCap: "200000",
          minPurchase: "100",
          maxPurchase: "50000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
          saleStartTime: 0,
          saleEndTime: 0,
        };
      }

      try {
        return await fetchSaleInfo(rpcUrl, publicSaleAddress, usdtAddress, input.walletAddress);
      } catch (error) {
        console.error("[Purchase] 查询公募轮信息失败:", error);
        return {
          contractConfigured: true,
          isActive: false,
          tokenPrice: "0.20",
          exchangeRate: 5,
          totalRaised: "0",
          hardCap: "200000",
          minPurchase: "100",
          maxPurchase: "50000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
          saleStartTime: 0,
          saleEndTime: 0,
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 记录购买交易到数据库（前端完成链上操作后调用）──────────────────
  recordPurchase: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        usdtAmount: z.string(),
        pvcAmount: z.string(),
        saleType: z.enum(["private", "public"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await recordTransaction({
          walletAddress: input.walletAddress.toLowerCase(),
          txHash: input.txHash,
          txType: input.saleType === "private" ? "purchase_private" : "purchase_public",
          amount: input.usdtAmount,
          tokenSymbol: "USDT",
          pvcAmount: input.pvcAmount,
          status: "pending",
        });
        // 推送运营通知
        notifyOwner({
          title: `🛒 新代币购买（${input.saleType === "private" ? "私募" : "公募"}）`,
          content: [
            `钱包：${input.walletAddress}`,
            `支付 USDT：${input.usdtAmount}`,
            `获得 PVC：${input.pvcAmount}`,
            `交易哈希：${input.txHash}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          ].join("\n"),
        }).catch((e) => console.warn("[Purchase] notifyOwner failed:", e));
        return { success: true };
      } catch (error) {
        console.error("[Purchase] 记录交易失败:", error);
        return { success: false, error: "记录失败，但链上交易已成功" };
      }
    }),

  // ── 确认交易状态（轮询链上确认）──────────────────────────────────────
  confirmTransaction: publicProcedure
    .input(z.object({ txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl } = getContracts();
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const receipt = await provider.getTransactionReceipt(input.txHash);
        if (!receipt) return { status: "pending" as const };
        const confirmed = receipt.status === 1;
        return {
          status: confirmed ? ("confirmed" as const) : ("failed" as const),
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
        };
      } catch {
        return { status: "pending" as const };
      }
    }),

  // ── 查询用户购买历史（数据库）───────────────────────────────────────────────
  getPurchaseHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter(
        (tx) => tx.txType === "purchase_private" || tx.txType === "purchase_public"
      );
    }),

  // ── 查询用户全部链上操作历史（支持分页）───────────────────────────────
  getAllTransactions: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return getTransactionsByWalletPaged(
        input.walletAddress.toLowerCase(),
        input.page,
        input.pageSize,
      );
    }),
});