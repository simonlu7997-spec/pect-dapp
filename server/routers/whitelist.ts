import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { ethers } from "ethers";
import { notifyOwner } from "../_core/notification";

// PVCoin 合约 ABI（只需要白名单相关函数）
const PVCoinABI = [
  "function addKyc(address _account) external",
  "function addSenderWhitelist(address _account) external",
  "function isKycVerified(address _account) external view returns (bool)",
  "function isSenderWhitelisted(address _account) external view returns (bool)",
];

export const whitelistRouter = router({
  // 提交白名单申请（后端使用部署者私钥调用合约）
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
      // 从环境变量获取配置
      const pvCoinAddress = process.env.PV_COIN_ADDRESS;
      const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";

      // 检查必要的环境变量
      if (!pvCoinAddress || pvCoinAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("PVCoin 合约地址未配置，请联系管理员");
      }

      if (!deployerPrivateKey) {
        throw new Error("部署者私钥未配置，请联系管理员");
      }

      try {
        // 创建 provider 和 signer（使用部署者私钥）
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);

        // 创建合约实例（使用部署者钱包）
        const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, deployerWallet);

        // 检查地址是否已在白名单中
        const [isKycVerified, isSenderWhitelisted] = await Promise.all([
          pvCoinContract.isKycVerified(input.walletAddress),
          pvCoinContract.isSenderWhitelisted(input.walletAddress),
        ]);

        if (isKycVerified && isSenderWhitelisted) {
          return {
            success: true,
            message: "该钱包地址已在白名单中",
            alreadyWhitelisted: true,
          };
        }

        // 添加到 KYC 白名单
        if (!isKycVerified) {
          console.log(`[Whitelist] 添加 KYC 白名单: ${input.walletAddress}`);
          const kycTx = await pvCoinContract.addKyc(input.walletAddress);
          console.log(`[Whitelist] KYC 交易哈希: ${kycTx.hash}`);
          await kycTx.wait();
          console.log(`[Whitelist] KYC 白名单添加成功`);
        }

        // 添加到发送方白名单
        if (!isSenderWhitelisted) {
          console.log(`[Whitelist] 添加发送方白名单: ${input.walletAddress}`);
          const senderTx = await pvCoinContract.addSenderWhitelist(input.walletAddress);
          console.log(`[Whitelist] 发送方白名单交易哈希: ${senderTx.hash}`);
          await senderTx.wait();
          console.log(`[Whitelist] 发送方白名单添加成功`);
        }

        // 通知项目方有新的白名单申请
        try {
          await notifyOwner({
            title: "新白名单申请",
            content: `新用户申请加入白名单：
- 姓名：${input.fullName}
- 邮箱：${input.email}
- 电话：${input.phone}
- 国家：${input.country}
- 投资金额：${input.investmentAmount} ${input.investmentCurrency}
- 钱包地址：${input.walletAddress}
- 状态：已成功添加到合约白名单`,
          });
        } catch (notifyError) {
          // 通知失败不影响主流程
          console.warn("[Whitelist] 通知失败:", notifyError);
        }

        return {
          success: true,
          message: "白名单申请成功！您的钱包地址已成功添加到白名单。",
          alreadyWhitelisted: false,
        };
      } catch (error) {
        console.error("[Whitelist] 合约调用失败:", error);

        let errorMessage = "白名单添加失败，请稍后重试";

        if (error instanceof Error) {
          if (error.message.includes("insufficient funds")) {
            errorMessage = "合约账户余额不足以支付 Gas 费用，请联系管理员";
          } else if (error.message.includes("execution reverted")) {
            errorMessage = "合约执行失败，请联系管理员检查合约权限";
          } else if (error.message.includes("network")) {
            errorMessage = "区块链网络连接失败，请稍后重试";
          } else if (error.message.includes("未配置")) {
            errorMessage = error.message;
          }
        }

        throw new Error(errorMessage);
      }
    }),

  // 检查钱包地址是否已在白名单中
  checkStatus: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的钱包地址"),
      })
    )
    .query(async ({ input }) => {
      const pvCoinAddress = process.env.PV_COIN_ADDRESS;
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";

      if (!pvCoinAddress || pvCoinAddress === "0x0000000000000000000000000000000000000000") {
        return {
          isKycVerified: false,
          isSenderWhitelisted: false,
          contractConfigured: false,
        };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const pvCoinContract = new ethers.Contract(pvCoinAddress, PVCoinABI, provider);

        const [isKycVerified, isSenderWhitelisted] = await Promise.all([
          pvCoinContract.isKycVerified(input.walletAddress),
          pvCoinContract.isSenderWhitelisted(input.walletAddress),
        ]);

        return {
          isKycVerified,
          isSenderWhitelisted,
          contractConfigured: true,
        };
      } catch (error) {
        console.error("[Whitelist] 检查状态失败:", error);
        return {
          isKycVerified: false,
          isSenderWhitelisted: false,
          contractConfigured: true,
          error: "查询失败",
        };
      }
    }),
});
