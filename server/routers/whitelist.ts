import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ethers } from "ethers";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";
import { sendApprovedEmail, sendRejectedEmail } from "../email";
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

// Sale 合约白名单 ABI（PrivateSale 和 PublicSale 共用）
const SaleWhitelistABI = [
  "function addToWhitelist(address[] calldata _users) external",
  "function removeFromWhitelist(address[] calldata _users) external",
  "function isWhitelisted(address _user) external view returns (bool)",
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
        console.error("[Whitelist] 检查状态失败，尝试重试:", error);
        // 重试一次，避免 RPC 偶发超时导致误报 KYC 未通过
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const provider2 = new ethers.JsonRpcProvider(rpcUrl);
          const pvCoinContract2 = new ethers.Contract(pvCoinAddress, PVCoinABI, provider2);
          const [isKycVerified2, isSenderWhitelisted2] = await Promise.all([
            pvCoinContract2.isKycVerified(input.walletAddress),
            pvCoinContract2.isSenderWhitelisted(input.walletAddress),
          ]);
          return { isKycVerified: isKycVerified2, isSenderWhitelisted: isSenderWhitelisted2, contractConfigured: true, dbRecord: dbRecord ?? null };
        } catch (retryError) {
          console.error("[Whitelist] 重试也失败，返回 queryFailed:", retryError);
          // 返回 null 而非 false，让前端区分「查询失败」和「真正未通过」
          return { isKycVerified: null as unknown as boolean, isSenderWhitelisted: null as unknown as boolean, contractConfigured: true, error: "查询失败", dbRecord: dbRecord ?? null };
        }
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
      // 如果已审批，仍然重新同步 Sale 白名单（防止之前同步失败）
      const alreadyApproved = kyc.status === "approved";

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

        // 如果已审批，跳过 PVCoin KYC 步骤，仅同步 Sale 白名单
        if (!alreadyApproved) {
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
        }

        // 同步添加到 PrivateSale 和 PublicSale 白名单（合规要求）
        const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
        const publicSaleAddress  = process.env.PUBLIC_SALE_ADDRESS;

        const saleWhitelistPromises: Promise<void>[] = [];

        if (privateSaleAddress && privateSaleAddress !== "0x0000000000000000000000000000000000000000") {
          const privateSaleContract = new ethers.Contract(privateSaleAddress, SaleWhitelistABI, deployerWallet);
          saleWhitelistPromises.push(
            privateSaleContract.isWhitelisted(kyc.walletAddress).then(async (already: boolean) => {
              if (!already) {
                const tx = await privateSaleContract.addToWhitelist([kyc.walletAddress]);
                await tx.wait();
                console.log(`[Whitelist] PrivateSale 白名单添加成功: ${kyc.walletAddress}, tx: ${tx.hash}`);
              }
            })
          );
        }

        if (publicSaleAddress && publicSaleAddress !== "0x0000000000000000000000000000000000000000") {
          const publicSaleContract = new ethers.Contract(publicSaleAddress, SaleWhitelistABI, deployerWallet);
          saleWhitelistPromises.push(
            publicSaleContract.isWhitelisted(kyc.walletAddress).then(async (already: boolean) => {
              if (!already) {
                const tx = await publicSaleContract.addToWhitelist([kyc.walletAddress]);
                await tx.wait();
                console.log(`[Whitelist] PublicSale 白名单添加成功: ${kyc.walletAddress}, tx: ${tx.hash}`);
              }
            })
          );
        }

        // Sale 白名单同步失败时抛出错误，不再静默吁掉
        let saleWhitelistError: string | undefined;
        if (saleWhitelistPromises.length > 0) {
          try {
            await Promise.all(saleWhitelistPromises);
          } catch (err) {
            console.error("[Whitelist] Sale 合约白名单添加失败:", err);
            saleWhitelistError = err instanceof Error ? err.message : String(err);
          }
        }

        await updateKycStatus(input.id, "approved", {
          txHashKyc,
          txHashSender,
          reviewNote: input.reviewNote || "管理员审核通过",
        });

        // 发送审核通过邮件通知（异步，不阻塞响应）
        sendApprovedEmail({
          to: kyc.email,
          fullName: kyc.fullName,
          walletAddress: kyc.walletAddress,
          txHashKyc,
          txHashSender,
        }).catch((err) => console.error("[Email] Failed to send approved email:", err));

        return {
          success: true,
          message: alreadyApproved
            ? (saleWhitelistError ? "已重新同步，但部分 Sale 白名单添加失败：" + saleWhitelistError : "已重新同步 Sale 白名单")
            : (saleWhitelistError ? "审核通过，但部分 Sale 白名单添加失败：" + saleWhitelistError : "审核通过，已成功添加到链上白名单"),
          txHashKyc,
          txHashSender,
          alreadyApproved,
          saleWhitelistError,
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

      // 发送拒绝邮件通知（异步，不阻塞响应）
      sendRejectedEmail({
        to: kyc.email,
        fullName: kyc.fullName,
        walletAddress: kyc.walletAddress,
        reviewNote: input.reviewNote,
      }).catch((err) => console.error("[Email] Failed to send rejected email:", err));

      // 异步从 PrivateSale 和 PublicSale 白名单移除（如果已在白名单中）
      const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
      const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;

      if (deployerPrivateKey && rpcUrl && kyc.walletAddress) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);

        // 异步移除 PrivateSale 白名单
        if (privateSaleAddress && privateSaleAddress !== "0x0000000000000000000000000000000000000000") {
          const privateSaleContract = new ethers.Contract(privateSaleAddress, SaleWhitelistABI, deployerWallet);
          privateSaleContract.isWhitelisted(kyc.walletAddress).then(async (isIn: boolean) => {
            if (isIn) {
              const tx = await privateSaleContract.removeFromWhitelist([kyc.walletAddress]);
              console.log(`[Whitelist] PrivateSale 白名单移除成功: ${kyc.walletAddress}, tx: ${tx.hash}`);
            }
          }).catch((err: unknown) => console.error("[Whitelist] PrivateSale 移除失败:", err));
        }

        // 异步移除 PublicSale 白名单
        if (publicSaleAddress && publicSaleAddress !== "0x0000000000000000000000000000000000000000") {
          const publicSaleContract = new ethers.Contract(publicSaleAddress, SaleWhitelistABI, deployerWallet);
          publicSaleContract.isWhitelisted(kyc.walletAddress).then(async (isIn: boolean) => {
            if (isIn) {
              const tx = await publicSaleContract.removeFromWhitelist([kyc.walletAddress]);
              console.log(`[Whitelist] PublicSale 白名单移除成功: ${kyc.walletAddress}, tx: ${tx.hash}`);
            }
          }).catch((err: unknown) => console.error("[Whitelist] PublicSale 移除失败:", err));
        }
      }

      return { success: true, message: "已拒绝该申请" };
    }),

  // ── 查询指定钱包在 Sale 合约中的白名单状态 ──────────────────────────
  getSaleWhitelistStatus: protectedProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }

      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
      const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
      const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      let privateWhitelisted: boolean | null = null;
      let publicWhitelisted: boolean | null = null;

      try {
        if (privateSaleAddress && privateSaleAddress !== "0x0000000000000000000000000000000000000000") {
          const contract = new ethers.Contract(privateSaleAddress, SaleWhitelistABI, provider);
          privateWhitelisted = await contract.isWhitelisted(input.walletAddress);
        }
      } catch (err) {
        console.error("[Whitelist] 查询 PrivateSale 白名单失败:", err);
      }

      try {
        if (publicSaleAddress && publicSaleAddress !== "0x0000000000000000000000000000000000000000") {
          const contract = new ethers.Contract(publicSaleAddress, SaleWhitelistABI, provider);
          publicWhitelisted = await contract.isWhitelisted(input.walletAddress);
        }
      } catch (err) {
        console.error("[Whitelist] 查询 PublicSale 白名单失败:", err);
      }

      return { privateWhitelisted, publicWhitelisted };
    }),

  // ── 批量查询所有已审批用户的 Sale 白名单状态 ──────────────────────────
  batchGetSaleWhitelistStatus: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }

      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
      const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
      const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // 获取所有已审批的 KYC 用户
      const approvedList = await listKycApplications("approved");
      if (approvedList.length === 0) return { results: [] };

      const results: Array<{
        walletAddress: string;
        fullName: string;
        privateWhitelisted: boolean | null;
        publicWhitelisted: boolean | null;
      }> = [];

      for (const kyc of approvedList) {
        let privateWl: boolean | null = null;
        let publicWl: boolean | null = null;

        try {
          if (privateSaleAddress && privateSaleAddress !== "0x0000000000000000000000000000000000000000") {
            const contract = new ethers.Contract(privateSaleAddress, SaleWhitelistABI, provider);
            privateWl = await contract.isWhitelisted(kyc.walletAddress);
          }
        } catch { privateWl = null; }

        try {
          if (publicSaleAddress && publicSaleAddress !== "0x0000000000000000000000000000000000000000") {
            const contract = new ethers.Contract(publicSaleAddress, SaleWhitelistABI, provider);
            publicWl = await contract.isWhitelisted(kyc.walletAddress);
          }
        } catch { publicWl = null; }

        results.push({
          walletAddress: kyc.walletAddress,
          fullName: kyc.fullName,
          privateWhitelisted: privateWl,
          publicWhitelisted: publicWl,
        });
      }

      return { results };
    }),

  // ── 管理员：批量同步所有已审批用户到 Sale 合约白名单 ──────────────────
  batchSyncWhitelist: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
      }

      const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
      const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
      const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;

      if (!deployerPrivateKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "部署者私钥未配置" });
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);

      // 获取所有已审批的 KYC 用户
      const approvedList = await listKycApplications("approved");
      if (approvedList.length === 0) {
        return { success: true, message: "没有已审批的用户需要同步", synced: 0, failed: 0, details: [] };
      }

      const allAddresses = approvedList.map(k => k.walletAddress);
      const details: Array<{ walletAddress: string; fullName: string; privateSale: string; publicSale: string }> = [];
      let syncedCount = 0;
      let failedCount = 0;

      // 逐个检查并添加到私募白名单
      if (privateSaleAddress && privateSaleAddress !== "0x0000000000000000000000000000000000000000") {
        const privateSaleContract = new ethers.Contract(privateSaleAddress, SaleWhitelistABI, deployerWallet);
        const needsAdding: string[] = [];

        for (const addr of allAddresses) {
          try {
            const isIn = await privateSaleContract.isWhitelisted(addr);
            if (!isIn) needsAdding.push(addr);
          } catch (err) {
            console.error(`[BatchSync] 查询 PrivateSale 白名单失败 ${addr}:`, err);
          }
        }

        if (needsAdding.length > 0) {
          try {
            // 批量添加（合约支持 address[] 参数）
            const tx = await privateSaleContract.addToWhitelist(needsAdding);
            await tx.wait();
            console.log(`[BatchSync] PrivateSale 批量添加 ${needsAdding.length} 个地址成功, tx: ${tx.hash}`);
            needsAdding.forEach(addr => {
              const kyc = approvedList.find(k => k.walletAddress === addr);
              const existing = details.find(d => d.walletAddress === addr);
              if (existing) {
                existing.privateSale = "已同步";
              } else {
                details.push({ walletAddress: addr, fullName: kyc?.fullName || "", privateSale: "已同步", publicSale: "待处理" });
              }
            });
            syncedCount += needsAdding.length;
          } catch (err) {
            console.error("[BatchSync] PrivateSale 批量添加失败:", err);
            needsAdding.forEach(addr => {
              const kyc = approvedList.find(k => k.walletAddress === addr);
              const existing = details.find(d => d.walletAddress === addr);
              if (existing) {
                existing.privateSale = "失败";
              } else {
                details.push({ walletAddress: addr, fullName: kyc?.fullName || "", privateSale: "失败", publicSale: "待处理" });
              }
            });
            failedCount += needsAdding.length;
          }
        }
      }

      // 逐个检查并添加到公募白名单
      if (publicSaleAddress && publicSaleAddress !== "0x0000000000000000000000000000000000000000") {
        const publicSaleContract = new ethers.Contract(publicSaleAddress, SaleWhitelistABI, deployerWallet);
        const needsAdding: string[] = [];

        for (const addr of allAddresses) {
          try {
            const isIn = await publicSaleContract.isWhitelisted(addr);
            if (!isIn) needsAdding.push(addr);
          } catch (err) {
            console.error(`[BatchSync] 查询 PublicSale 白名单失败 ${addr}:`, err);
          }
        }

        if (needsAdding.length > 0) {
          try {
            const tx = await publicSaleContract.addToWhitelist(needsAdding);
            await tx.wait();
            console.log(`[BatchSync] PublicSale 批量添加 ${needsAdding.length} 个地址成功, tx: ${tx.hash}`);
            needsAdding.forEach(addr => {
              const kyc = approvedList.find(k => k.walletAddress === addr);
              const existing = details.find(d => d.walletAddress === addr);
              if (existing) {
                existing.publicSale = "已同步";
              } else {
                details.push({ walletAddress: addr, fullName: kyc?.fullName || "", privateSale: "已在白名单", publicSale: "已同步" });
              }
            });
            syncedCount += needsAdding.length;
          } catch (err) {
            console.error("[BatchSync] PublicSale 批量添加失败:", err);
            needsAdding.forEach(addr => {
              const kyc = approvedList.find(k => k.walletAddress === addr);
              const existing = details.find(d => d.walletAddress === addr);
              if (existing) {
                existing.publicSale = "失败";
              } else {
                details.push({ walletAddress: addr, fullName: kyc?.fullName || "", privateSale: "已在白名单", publicSale: "失败" });
              }
            });
            failedCount += needsAdding.length;
          }
        }
      }

      // 标记已在白名单中的用户
      for (const kyc of approvedList) {
        if (!details.find(d => d.walletAddress === kyc.walletAddress)) {
          details.push({ walletAddress: kyc.walletAddress, fullName: kyc.fullName, privateSale: "已在白名单", publicSale: "已在白名单" });
        }
      }

      return {
        success: true,
        message: syncedCount > 0
          ? `同步完成：${syncedCount} 个地址已添加${failedCount > 0 ? `，${failedCount} 个失败` : ""}`
          : (failedCount > 0 ? `同步失败：${failedCount} 个地址添加失败` : "所有用户已在白名单中，无需同步"),
        synced: syncedCount,
        failed: failedCount,
        details,
      };
    }),
});
