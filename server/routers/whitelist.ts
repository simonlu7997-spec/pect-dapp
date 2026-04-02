import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ethers } from "ethers";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";
import {
  createKycApplication,
  getKycByWallet,
  listKycApplications,
  updateKycStatus,
  recordTransaction,
  getKycById,
} from "../db";

// PVCoin 合约 ABI（只需要白名单相关函数）
const PVCoinABI = [
  "function addKyc(address _account) external",
  "function addSenderWhitelist(address _account) external",
  "function isKycVerified(address _account) external view returns (bool)",
  "function isSenderWhitelisted(address _account) external view returns (bool)",
];

export const whitelistRouter = router({
  // ── 用户提交 KYC 申请（只写数据库，等待管理员审核）──────────────────
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
      const normalizedAddress = input.walletAddress.toLowerCase();

      // 检查是否已有申请记录
      const existingKyc = await getKycByWallet(normalizedAddress).catch(() => undefined);
      if (existingKyc) {
        if (existingKyc.status === "approved") {
          return { success: true, message: "您的钱包地址已通过 KYC 审核，无需重复申请", status: "approved" as const };
        }
        if (existingKyc.status === "pending") {
          return { success: true, message: "您已提交申请，正在等待审核，请耐心等待", status: "pending" as const };
        }
        if (existingKyc.status === "rejected") {
          // 被拒绝后允许重新申请，更新记录
          await updateKycStatus(existingKyc.id, "pending", {
            reviewNote: `重新申请（原拒绝原因：${existingKyc.reviewNote || "无"}）`,
          });
          return { success: true, message: "已重新提交申请，等待审核", status: "pending" as const };
        }
      }

      // 写入数据库（状态 pending）
      await createKycApplication({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        country: input.country,
        investmentAmount: input.investmentAmount,
        investmentCurrency: input.investmentCurrency,
        walletAddress: normalizedAddress,
        status: "pending",
      });

      // 通知项目方有新申请
      notifyOwner({
        title: "📋 新 KYC 白名单申请",
        content: `新用户提交 KYC 申请，请登录管理后台审核：\n- 姓名：${input.fullName}\n- 邮箱：${input.email}\n- 电话：${input.phone}\n- 国家：${input.country}\n- 投资金额：${input.investmentAmount} ${input.investmentCurrency}\n- 钱包地址：${input.walletAddress}`,
      }).catch(() => {});

      return { success: true, message: "申请已提交，请等待管理员审核（通常 1-3 个工作日）", status: "pending" as const };
    }),

  // ── 查询申请状态 ────────────────────────────────────────────────────
  checkStatus: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的钱包地址") }))
    .query(async ({ input }) => {
      const pvCoinAddress = process.env.PV_COIN_ADDRESS;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
      const normalizedAddress = input.walletAddress.toLowerCase();

      // 查询数据库状态
      const dbRecord = await getKycByWallet(normalizedAddress).catch(() => undefined);

      // 查询链上状态
      if (!pvCoinAddress || pvCoinAddress === "0x0000000000000000000000000000000000000000") {
        return {
          isKycVerified: false,
          isSenderWhitelisted: false,
          contractConfigured: false,
          dbRecord: dbRecord ?? null,
        };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, provider);
        const [isKycVerified, isSenderWhitelisted] = await Promise.all([
          pvCoinContract.isKycVerified(input.walletAddress),
          pvCoinContract.isSenderWhitelisted(input.walletAddress),
        ]);
        return { isKycVerified, isSenderWhitelisted, contractConfigured: true, dbRecord: dbRecord ?? null };
      } catch (error) {
        console.error("[Whitelist] 检查状态失败:", error);
        return { isKycVerified: false, isSenderWhitelisted: false, contractConfigured: true, error: "查询失败", dbRecord: dbRecord ?? null };
      }
    }),

  // ── 管理员：查看所有 KYC 申请列表 ──────────────────────────────────
  listApplications: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }
      return listKycApplications(input.status);
    }),

  // ── 管理员：审核通过并调用合约上链 ─────────────────────────────────
  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }

      const kyc = await getKycById(input.id);
      if (!kyc) throw new TRPCError({ code: "NOT_FOUND", message: "申请记录不存在" });
      if (kyc.status === "approved") {
        return { success: true, message: "该申请已经审核通过", alreadyApproved: true };
      }

      const pvCoinAddress = process.env.PV_COIN_ADDRESS;
      const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";

      if (!pvCoinAddress || pvCoinAddress === "0x0000000000000000000000000000000000000000") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PVCoin 合约地址未配置" });
      }
      if (!deployerPrivateKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "部署者私钥未配置" });
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);
        const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, deployerWallet);

        const [isKycVerified, isSenderWhitelisted] = await Promise.all([
          pvCoinContract.isKycVerified(kyc.walletAddress),
          pvCoinContract.isSenderWhitelisted(kyc.walletAddress),
        ]);

        let txHashKyc: string | undefined;
        let txHashSender: string | undefined;

        if (!isKycVerified) {
          const kycTx = await pvCoinContract.addKyc(kyc.walletAddress);
          txHashKyc = kycTx.hash;
          await kycTx.wait();
          await recordTransaction({
            walletAddress: kyc.walletAddress,
            txHash: kycTx.hash,
            txType: "whitelist",
            status: "confirmed",
            confirmedAt: new Date(),
          }).catch(() => {});
        }

        if (!isSenderWhitelisted) {
          const senderTx = await pvCoinContract.addSenderWhitelist(kyc.walletAddress);
          txHashSender = senderTx.hash;
          await senderTx.wait();
        }

        await updateKycStatus(input.id, "approved", {
          txHashKyc,
          txHashSender,
          reviewNote: input.reviewNote || "管理员审核通过",
        });

        return {
          success: true,
          message: "审核通过，已成功添加到链上白名单",
          txHashKyc,
          txHashSender,
          alreadyApproved: false,
        };
      } catch (error) {
        console.error("[Whitelist] 合约调用失败:", error);
        let errorMessage = "合约调用失败，请稍后重试";
        if (error instanceof Error) {
          if (error.message.includes("insufficient funds")) errorMessage = "合约账户余额不足以支付 Gas 费用";
          else if (error.message.includes("execution reverted")) errorMessage = "合约执行失败，请检查合约权限";
          else if (error.message.includes("network")) errorMessage = "区块链网络连接失败，请稍后重试";
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errorMessage });
      }
    }),

  // ── 管理员：拒绝申请 ────────────────────────────────────────────────
  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      reviewNote: z.string().min(1, "请填写拒绝原因"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }

      const kyc = await getKycById(input.id);
      if (!kyc) throw new TRPCError({ code: "NOT_FOUND", message: "申请记录不存在" });

      await updateKycStatus(input.id, "rejected", { reviewNote: input.reviewNote });
      return { success: true, message: "已拒绝该申请" };
    }),
});
