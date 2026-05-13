import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

const termsContent = {
  en: {
    title: "Terms of Service",
    effectiveDate: "Effective Date: May 13, 2026",
    lastUpdated: "Last Updated: May 13, 2026",
    sections: [
      {
        title: "1. Acceptance of Terms",
        content: `By accessing or using the PECT Platform at pect-dapp.io (the "Platform"), you ("User," "you," or "your") agree to be legally bound by these Terms of Service ("Terms") and all policies incorporated herein by reference, including our Privacy Policy and Disclaimer. If you do not agree to these Terms, you must immediately cease using the Platform.

These Terms constitute a legally binding agreement between you and PECT DApp ("PECT," "we," "our," or "us"). We reserve the right to modify these Terms at any time. Continued use of the Platform after any modification constitutes your acceptance of the revised Terms.`,
      },
      {
        title: "2. Eligibility",
        content: `2.1 You must be at least 18 years of age to use the Platform.

2.2 You represent and warrant that: (a) you have the legal capacity to enter into these Terms; (b) your use of the Platform does not violate any applicable law or regulation in your jurisdiction; (c) you are not a citizen or resident of any jurisdiction where participation in blockchain-based token offerings is prohibited or restricted, including but not limited to the United States of America, the People's Republic of China, and any jurisdiction subject to comprehensive economic sanctions.

2.3 Access to certain features of the Platform requires successful completion of our Know Your Customer (KYC) identity verification process. We reserve the right to refuse service to any individual or entity at our sole discretion.`,
      },
      {
        title: "3. Description of Services",
        content: `The Platform provides the following services:

• Token Purchase — Acquisition of PV-Coin (PVC) through private sale and public sale smart contracts
• Revenue Distribution — Periodic distribution of photovoltaic energy revenue to PVC holders
• C2-Coin Staking — Staking of C2-Coin (C2C) carbon credit tokens to earn staking rewards
• C2-Coin Airdrop — Distribution of C2C tokens based on verified electricity generation data
• Station Monitoring — Access to photovoltaic station operational data and imagery
• Portfolio Management — Dashboard for viewing token holdings, transaction history, and reward status

All services are provided through non-custodial smart contracts deployed on the Polygon blockchain network. We do not hold, control, or have access to your digital assets at any time.`,
      },
      {
        title: "4. KYC and Identity Verification",
        content: `4.1 Participation in token purchases requires successful KYC verification. You agree to provide accurate, current, and complete information during the KYC process.

4.2 We reserve the right to reject any KYC application, suspend or terminate access to the Platform, or reverse any transaction if we determine, in our sole discretion, that you have provided false or misleading information, or if we are required to do so by applicable law.

4.3 KYC approval does not constitute an endorsement of any investment decision, nor does it guarantee future access to the Platform.`,
      },
      {
        title: "5. Blockchain Transactions and Smart Contracts",
        content: `**5.1 Irreversibility.** All transactions executed on the blockchain are final and irreversible. Once a transaction is submitted to the blockchain network, it cannot be cancelled, reversed, or modified by us or any other party. You are solely responsible for verifying all transaction details before submission.

**5.2 Gas Fees.** You are solely responsible for all network transaction fees ("gas fees") associated with your use of the Platform. Gas fees are paid directly to blockchain network validators and are not collected by PECT.

**5.3 Smart Contract Risk.** While our smart contracts have been developed with security best practices and subjected to third-party security audits, no smart contract is entirely free from bugs or vulnerabilities. You acknowledge and accept the inherent risks associated with interacting with smart contracts.

**5.4 Wallet Security.** You are solely responsible for the security of your blockchain wallet, including safeguarding your private keys and seed phrases. We will never ask for your private key or seed phrase. Loss of your private key may result in permanent loss of access to your digital assets.

**5.5 Network Conditions.** Transaction processing times and costs are determined by the underlying blockchain network and are outside our control.`,
      },
      {
        title: "6. Token Economics and Revenue Distribution",
        content: `6.1 PV-Coin (PVC) represents a tokenized interest in the revenue generated by PECT's photovoltaic energy stations. PVC is not a security, equity interest, or debt instrument, and does not confer any ownership rights, voting rights, or rights to dividends under applicable corporate law.

6.2 Revenue distributions are calculated based on actual electricity generation data recorded on-chain and are subject to the terms of the RevenueDistributor smart contract. Distribution amounts and timing may vary based on operational conditions, grid pricing, and other factors beyond our control.

6.3 C2-Coin (C2C) represents tokenized carbon credit units derived from verified renewable energy generation. C2C staking rewards are calculated pursuant to the StakingManager smart contract and are subject to change based on available reward pools.

6.4 Past revenue distributions and staking rewards are not indicative of future performance. All projected returns are estimates only and are not guaranteed.`,
      },
      {
        title: "7. Prohibited Activities",
        content: `You agree not to engage in any of the following activities:

• Using the Platform for any unlawful purpose or in violation of any applicable law or regulation.
• Attempting to circumvent, disable, or interfere with the security features of the Platform or smart contracts.
• Engaging in market manipulation, wash trading, or any other deceptive trading practices.
• Using automated bots, scripts, or other tools to access the Platform in a manner that places excessive load on our infrastructure.
• Submitting false, misleading, or fraudulent information during the KYC process.
• Attempting to access accounts, data, or systems belonging to other users without authorization.
• Engaging in money laundering, terrorist financing, or any other financial crime.
• Violating any applicable sanctions laws or regulations.`,
      },
      {
        title: "8. Intellectual Property",
        content: `All content on the Platform, including but not limited to text, graphics, logos, software, and smart contract code, is the intellectual property of PECT DApp or its licensors and is protected by applicable intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access and use the Platform for personal, non-commercial purposes only.`,
      },
      {
        title: "9. Limitation of Liability",
        content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PECT DAPP, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, LOSS OF DIGITAL ASSETS, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT OF FEES PAID BY YOU TO PECT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.`,
      },
      {
        title: "10. Indemnification",
        content: `You agree to indemnify, defend, and hold harmless PECT DApp and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; or (d) your infringement of any third-party rights.`,
      },
      {
        title: "11. Governing Law and Dispute Resolution",
        content: `These Terms shall be governed by and construed in accordance with the laws of Singapore, without regard to its conflict of law provisions. Any dispute arising out of or in connection with these Terms shall be submitted to binding arbitration administered by the Singapore International Arbitration Centre (SIAC) in accordance with its rules. The arbitration shall be conducted in English, and the seat of arbitration shall be Singapore.`,
      },
      {
        title: "12. Termination",
        content: `We reserve the right to suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform will immediately cease. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.`,
      },
      {
        title: "13. Entire Agreement",
        content: `These Terms, together with our Privacy Policy and Disclaimer, constitute the entire agreement between you and PECT DApp with respect to your use of the Platform and supersede all prior agreements and understandings.`,
      },
      {
        title: "14. Contact Us",
        content: `For questions regarding these Terms of Service, please contact us:\n\nEmail: contact@pect-dapp.io\nTelegram: t.me/PECT_OFCL\nDiscord: discord.gg/6DGzsQpw4`,
      },
    ],
  },
  zh: {
    title: "服务条款",
    effectiveDate: "生效日期：2026 年 5 月 13 日",
    lastUpdated: "最后更新：2026 年 5 月 13 日",
    sections: [
      {
        title: "1. 条款接受",
        content: `访问或使用位于 pect-dapp.io 的 PECT 平台（以下简称"平台"），即表示您（"用户"、"您"）同意受本服务条款（以下简称"条款"）及本文引用的所有政策（包括隐私政策和免责声明）的法律约束。如您不同意本条款，您必须立即停止使用平台。

本条款构成您与 PECT DApp（以下简称"PECT"、"我们"）之间具有法律约束力的协议。我们保留随时修改本条款的权利。在任何修改后继续使用平台，即表示您接受修订后的条款。`,
      },
      {
        title: "2. 资格要求",
        content: `2.1 您必须年满 18 周岁方可使用平台。

2.2 您声明并保证：（a）您具有订立本条款的法律行为能力；（b）您使用平台不违反您所在司法管辖区的任何适用法律法规；（c）您不是任何禁止或限制参与基于区块链的代币发行的司法管辖区的公民或居民，包括但不限于美利坚合众国、中华人民共和国，以及任何受全面经济制裁的司法管辖区。

2.3 访问平台的某些功能需要成功完成我们的了解您的客户（KYC）身份验证流程。我们保留自行决定拒绝向任何个人或实体提供服务的权利。`,
      },
      {
        title: "3. 服务说明",
        content: `平台提供以下服务：

• 代币购买 — 通过私募和公募智能合约购买 PV-Coin（PVC）
• 收益分配 — 定期向 PVC 持有者分配光伏能源收益
• C2-Coin 质押 — 质押 C2-Coin（C2C）碳信用代币以获取质押奖励
• C2-Coin 空投 — 基于经核实的发电数据向用户分发 C2C 代币
• 电站监控 — 访问光伏电站运营数据和现场图像
• 资产管理 — 查看代币持仓、交易历史和奖励状态的仪表板

所有服务均通过部署在 Polygon 区块链网络上的非托管智能合约提供。我们在任何时候均不持有、控制或访问您的数字资产。`,
      },
      {
        title: "4. KYC 及身份核实",
        content: `4.1 参与代币购买需要成功完成 KYC 核实。您同意在 KYC 流程中提供准确、最新和完整的信息。

4.2 若我们自行判断您提供了虚假或误导性信息，或适用法律要求，我们保留拒绝任何 KYC 申请、暂停或终止平台访问权限或撤销任何交易的权利。

4.3 KYC 批准不构成对任何投资决策的背书，也不保证未来对平台的访问权限。`,
      },
      {
        title: "5. 区块链交易与智能合约",
        content: `**5.1 不可逆性。** 在区块链上执行的所有交易均为最终且不可撤销。一旦交易提交至区块链网络，我们或任何其他方均无法取消、撤销或修改。您对提交前核实所有交易详情负有全部责任。

**5.2 Gas 费用。** 您对使用平台所产生的所有网络交易费用（"Gas 费"）负有全部责任。Gas 费直接支付给区块链网络验证者，不由 PECT 收取。

**5.3 智能合约风险。** 虽然我们的智能合约已按照安全最佳实践开发并经过第三方安全审计，但没有任何智能合约能完全免于漏洞。您承认并接受与智能合约交互相关的固有风险。

**5.4 钱包安全。** 您对区块链钱包的安全负有全部责任，包括保护您的私钥和助记词。我们绝不会索取您的私钥或助记词。私钥丢失可能导致永久失去对您数字资产的访问权限。

**5.5 网络状况。** 交易处理时间和成本由底层区块链网络决定，不在我们的控制范围内。`,
      },
      {
        title: "6. 代币经济与收益分配",
        content: `6.1 PV-Coin（PVC）代表对 PECT 光伏能源电站产生收益的代币化权益。PVC 不是证券、股权或债务工具，不依据适用公司法赋予任何所有权、投票权或股息权。

6.2 收益分配基于链上记录的实际发电数据计算，并受 RevenueDistributor 智能合约条款约束。分配金额和时间可能因运营状况、电网定价及其他不可控因素而有所不同。

6.3 C2-Coin（C2C）代表来自经核实可再生能源发电的代币化碳信用单位。C2C 质押奖励依据 StakingManager 智能合约计算，并可能根据可用奖励池而变化。

6.4 过往收益分配和质押奖励不代表未来表现。所有预测收益仅为估算，不构成保证。`,
      },
      {
        title: "7. 禁止行为",
        content: `您同意不从事以下任何活动：

• 将平台用于任何非法目的或违反任何适用法律法规。
• 试图绕过、禁用或干扰平台或智能合约的安全功能。
• 从事市场操纵、洗盘交易或任何其他欺骗性交易行为。
• 使用自动机器人、脚本或其他工具以对我们基础设施造成过度负载的方式访问平台。
• 在 KYC 流程中提交虚假、误导性或欺诈性信息。
• 试图未经授权访问其他用户的账户、数据或系统。
• 从事洗钱、恐怖主义融资或任何其他金融犯罪。
• 违反任何适用的制裁法律法规。`,
      },
      {
        title: "8. 知识产权",
        content: `平台上的所有内容，包括但不限于文字、图形、标志、软件和智能合约代码，均为 PECT DApp 或其许可方的知识产权，受适用知识产权法律保护。您获得有限、非独家、不可转让的许可，仅可出于个人、非商业目的访问和使用平台。`,
      },
      {
        title: "9. 责任限制",
        content: `在适用法律允许的最大范围内，PECT DAPP 及其高管、董事、员工和代理人对因您使用平台而产生或与之相关的任何间接、附带、特殊、后果性或惩罚性损害不承担责任，包括但不限于利润损失、数据损失、数字资产损失或业务中断，即使我们已被告知此类损害的可能性。

我们对您就本条款提出的任何索赔的全部累计责任不超过您在索赔前十二（12）个月向 PECT 支付的费用金额。`,
      },
      {
        title: "10. 赔偿",
        content: `您同意就以下事项产生的任何索赔、责任、损害、损失、费用和开支（包括合理的律师费），对 PECT DApp 及其高管、董事、员工和代理人进行赔偿、辩护并使其免受损害：（a）您对平台的使用；（b）您违反本条款；（c）您违反任何适用法律法规；或（d）您侵犯任何第三方权利。`,
      },
      {
        title: "11. 适用法律与争议解决",
        content: `本条款受新加坡法律管辖并依其解释，不考虑法律冲突条款。因本条款产生或与之相关的任何争议应提交新加坡国际仲裁中心（SIAC）按其规则进行有约束力的仲裁。仲裁以英语进行，仲裁地为新加坡。`,
      },
      {
        title: "12. 终止",
        content: `我们保留随时暂停或终止您对平台的访问权限的权利，无论是否有原因，无论是否提前通知。终止后，您使用平台的权利立即停止。本条款中按其性质应在终止后继续有效的条款将继续有效，包括所有权条款、保证免责声明、赔偿及责任限制。`,
      },
      {
        title: "13. 完整协议",
        content: `本条款连同我们的隐私政策和免责声明，构成您与 PECT DApp 之间关于您使用平台的完整协议，并取代所有先前的协议和谅解。`,
      },
      {
        title: "14. 联系我们",
        content: `如对本服务条款有任何疑问，请联系我们：\n\n电子邮件：contact@pect-dapp.io\nTelegram：t.me/PECT_OFCL\nDiscord：discord.gg/6DGzsQpw4`,
      },
    ],
  },
};

export default function Terms() {
  const [lang, setLang] = useState<"en" | "zh">("zh");
  const content = termsContent[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
              Legal Document
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.title}</h1>
          <p className="text-sm text-gray-500">{content.effectiveDate} &nbsp;·&nbsp; {content.lastUpdated}</p>
          <div className="flex gap-2 mt-4">
            <Button
              variant={lang === "zh" ? "default" : "outline"}
              size="sm"
              onClick={() => setLang("zh")}
            >
              中文
            </Button>
            <Button
              variant={lang === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLang("en")}
            >
              English
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {content.sections.map((section, idx) => (
              <div key={idx} className="px-8 py-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {section.content.split("**").map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className="text-gray-800 font-semibold">
                        {part}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          © 2026 PECT DApp. All rights reserved.
        </p>
      </div>
    </div>
  );
}
