import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ethers } from "ethers";
import { notifyOwner } from "../_core/notification";
import {
  createKycApplication,
  getKycByWallet,
  listKycApplications,
  updateKycStatus,
  recordTransaction,
} from "../db";

// PVCoin 合约 ABI（只需要白名单相关函数）
const PVCoinABI = [
  "function addKyc(address _account) external",
  "function addSenderWhitelist(address _account) external",
  "function isKycVerified(address _account) external view returns (bool)",
  "function isSenderWhitelisted(address _account) external view returns (bool)",
];

export const whitelistRouter = router({
  // 提交白名单申请（后端使用部署者私钥调用合约，并记录到数据库）
  submit: publicProcedure
    .input(
      z.object({
        fullName: z.string().min(1, "请输入完整姓名"),
        email: z.string().email("请输入有效的邮箱地址"),
        phone: z.string().min(1, "请输入联系电话"),
        country: z.string().min(1, "请选择国家/地区"),
        investmentAmount: z.string().min(1, "请输入投资金额"),
        investmentCurrency: z.string().default("USDT"),
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的钱包地址"),
      })
    )
    .mutation(async ({ input }) => {
      const pvCoinAddress = process.env.PV_COIN_ADDRESS;
      const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
      const normalizedAddress = input.walletAddress.toLowerCase();

      if (!pvCoinAddress || pvCoinAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("PVCoin 合约地址未配置，请联系管理员");
      }
      if (!deployerPrivateKey) {
        throw new Error("部署者私钥未配置，请联系管理员");
      }

      // 检查数据库中是否已有申请记录
      const existingKyc = await getKycByWallet(normalizedAddress).catch(() => undefined);
      if (existingKyc && existingKyc.status === "approved") {
        return { success: true, message: "该钱包地址已通过白名单审核", alreadyWhitelisted: true };
      }
      if (existingKyc && existingKyc.status === "pending") {
        return { success: true, message: "您的申请正在审核中，请耐心等待", alreadyWhitelisted: false };
      }

      // 先将申请记录写入数据库（状态 pending）
      let kycId: number | undefined;
      try {
        const insertResult = await createKycApplication({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          country: input.country,
          investmentAmount: input.investmentAmount,
          investmentCurrency: input.investmentCurrency,
          walletAddress: normalizedAddress,
          status: "pending",
        });
        kycId = Number((insertResult as any).insertId);
      } catch (dbErr) {
        console.warn("[Whitelist] 数据库写入失败（继续执行合约调用）:", dbErr);
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);
        const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, deployerWallet);

        const [isKycVerified, isSenderWhitelisted] = await Promise.all([
          pvCoinContract.isKycVerified(input.walletAddress),
          pvCoinContract.isSenderWhitelisted(input.walletAddress),
        ]);

        if (isKycVerified && isSenderWhitelisted) {
          if (kycId) await updateKycStatus(kycId, "approved", { reviewNote: "已在链上白名单" }).catch(() => {});
          return { success: true, message: "该钱包地址已在白名单中", alreadyWhitelisted: true };
        }

        let txHashKyc: string | undefined;
        let txHashSender: string | undefined;

        if (!isKycVerified) {
          const kycTx = await pvCoinContract.addKyc(input.walletAddress);
          txHashKyc = kycTx.hash;
          await kycTx.wait();
          // 记录交易到数据库
          await recordTransaction({
            walletAddress: normalizedAddress,
            txHash: kycTx.hash,
            txType: "whitelist",
            status: "confirmed",
            confirmedAt: new Date(),
          }).catch(() => {});
        }

        if (!isSenderWhitelisted) {
          const senderTx = await pvCoinContract.addSenderWhitelist(input.walletAddress);
          txHashSender = senderTx.hash;
          await senderTx.wait();
        }

        // 更新数据库状态为 approved
        if (kycId) {
          await updateKycStatus(kycId, "approved", { txHashKyc, txHashSender }).catch(() => {});
        }

        // 通知项目方
        try {
          await notifyOwner({
            title: "新白名单申请",
            content: `新用户申请加入白名单：\n- 姓名：${input.fullName}\n- 邮箱：${input.email}\n- 电话：${input.phone}\n- 国家：${input.country}\n- 投资金额：${input.investmentAmount} ${input.investmentCurrency}\n- 钱包地址：${input.walletAddress}\n- 状态：已成功添加到合约白名单`,
          });
        } catch {}

        return { success: true, message: "白名单申请成功！您的钱包地址已成功添加到白名单。", alreadyWhitelisted: false };
      } catch (error) {
        // 合约调用失败，更新数据库状态
        if (kycId) {
          await updateKycStatus(kycId, "rejected", {
            reviewNote: error instanceof Error ? error.message : "合约调用失败",
          }).catch(() => {});
        }
        console.error("[Whitelist] 合约调用失败:", error);
        let errorMessage = "白名单添加失败，请稍后重试";
        if (error instanceof Error) {
          if (error.message.includes("insufficient funds")) errorMessage = "合约账户余额不足以支付 Gas 费用，请联系管理员";
          else if (error.message.includes("execution reverted")) errorMessage = "合约执行失败，请联系管理员检查合约权限";
          else if (error.message.includes("network")) errorMessage = "区块链网络连接失败，请稍后重试";
          else if (error.message.includes("未配置")) errorMessage = error.message;
        }
        throw new Error(errorMessage);
      }
    }),

  // 检查钱包地址是否已在白名单中
  checkStatus: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的钱包地址") }))
    .query(async ({ input }) => {
      const pvCoinAddress = process.env.PV_COIN_ADDRESS;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";

      // 同时查询数据库状态
      const dbRecord = await getKycByWallet(input.walletAddress.toLowerCase()).catch(() => undefined);

      if (!pvCoinAddress || pvCoinAddress === "0x0000000000000000000000000000000000000000") {
        return { isKycVerified: false, isSenderWhitelisted: false, contractConfigured: false, dbStatus: dbRecord?.status };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, provider);
        const [isKycVerified, isSenderWhitelisted] = await Promise.all([
          pvCoinContract.isKycVerified(input.walletAddress),
          pvCoinContract.isSenderWhitelisted(input.walletAddress),
        ]);
        return { isKycVerified, isSenderWhitelisted, contractConfigured: true, dbStatus: dbRecord?.status };
      } catch (error) {
        console.error("[Whitelist] 检查状态失败:", error);
        return { isKycVerified: false, isSenderWhitelisted: false, contractConfigured: true, error: "查询失败", dbStatus: dbRecord?.status };
      }
    }),

  // 管理员查看所有 KYC 申请（需要登录）
  listApplications: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("需要管理员权限");
      return listKycApplications(input.status);
    }),
});
