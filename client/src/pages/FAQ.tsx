import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import walletConnectionGuide from "@/data/walletGuide";

interface FAQItem {
  category: string;
  items: Array<{
    q: string;
    a: string;
  }>;
}

const faqData: FAQItem[] = [
  {
    category: "关于 PECT",
    items: [
      {
        q: "PECT 是什么？",
        a: "PECT（Photovoltaic Energy Carbon Token）是一个基于区块链的绿色能源代币化平台。通过将光伏电站的收益权代币化，让投资者可以直接获得电站运营收益，同时支持碳中和目标。"
      },
      {
        q: "PECT 的核心价值是什么？",
        a: "PECT 将传统光伏电站投资与区块链技术结合，提供透明、高效、低门槛的绿色能源投资方案。投资者可以获得稳定的电站收益分红，同时参与环保事业。"
      },
      {
        q: "PECT 安全吗？",
        a: "PECT 的智能合约已通过第三方安全审计，所有交易在 Polygon 区块链上进行，具有高度的透明性和不可篡改性。我们遵循业界最佳安全实践。"
      }
    ]
  },
  {
    category: "代币相关",
    items: [
      {
        q: "PV-Coin 和 C2-Coin 有什么区别？",
        a: "PV-Coin 是收益权代币，持有者可以获得电站运营收益的分红。C2-Coin 是碳额排代币，可以质押获得额外收益，同时支持项目的碳中和目标。"
      },
      {
        q: "PV-Coin 如何分红？",
        a: "PV-Coin 持有者每月可获得电站收益的分红。分红金额根据持仓比例和当月电站实际收益计算，自动分配到用户钱包。"
      },
      {
        q: "C2-Coin 有什么用？",
        a: "C2-Coin 可以质押获得额外收益，同时参与项目治理。C2-Coin 还支持项目的碳中和机制，每个 C2-Coin 代表一定的碳抵消权。"
      },
      {
        q: "代币的最大供应量是多少？",
        a: "PV-Coin 最大供应量为 400 万枚。C2-Coin 的供应量根据电站发电量和碳抵消需求动态调整。"
      }
    ]
  },
  {
    category: "购买和销售",
    items: [
      {
        q: "如何购买 PV-Coin 和 C2-Coin？",
        a: "首先在 DApp 中连接钱包，然后进入购买页面。选择要购买的代币类型和数量，确认交易即可。需要注意的是，只有白名单成员才能购买 PV-Coin。"
      },
      {
        q: "最少购买数量是多少？",
        a: "PV-Coin 最少购买 100 枚，C2-Coin 最少购买 1000 枚。"
      },
      {
        q: "如何加入白名单？",
        a: "访问 DApp 中的白名单页面，填写相关信息并完成 KYC 认证。审核通过后即可加入白名单，获得购买权限。"
      },
      {
        q: "可以卖出代币吗？",
        a: "可以。在资产页面可以查看持仓，点击卖出按钮即可将代币卖出。卖出价格由市场供需决定。"
      }
    ]
  },
  {
    category: "质押和收益",
    items: [
      {
        q: "如何质押 C2-Coin？",
        a: "在质押页面输入要质押的 C2-Coin 数量，批准后即可质押。质押后每月会自动获得奖励。"
      },
      {
        q: "质押收益如何计算？",
        a: "质押收益 = 质押数量 x 年化收益率 / 12。年化收益率根据项目运营情况动态调整。"
      },
      {
        q: "可以随时取消质押吗？",
        a: "可以。在质押页面可以随时取消质押，取消后 C2-Coin 会立即返还到钱包。"
      },
      {
        q: "分红什么时候发放？",
        a: "PV-Coin 分红每月月底发放，C2-Coin 质押奖励每月月底发放。具体时间会在 DApp 中提前公告。"
      }
    ]
  },
  {
    category: "技术相关",
    items: [
      {
        q: "PECT 部署在哪个区块链网络？",
        a: "PECT 部署在 Polygon 区块链上，具有低手续费、高速交易的特点。目前在 Polygon Amoy 测试网进行测试。"
      },
      {
        q: "如何连接钱包？",
        a: "点击 DApp 右上角的连接钱包按钮，选择钱包类型（MetaMask、WalletConnect 等），按照提示完成连接。详细指南请查看文档页面的钱包连接指南。"
      },
      {
        q: "需要支付 Gas 费吗？",
        a: "是的，所有区块链交易都需要支付 Gas 费。Polygon 网络的 Gas 费相对较低，通常为几分钱。"
      },
      {
        q: "如何查看交易记录？",
        a: "在资产页面可以查看所有交易记录。也可以在 Polygon 区块浏览器上输入钱包地址查看详细的交易信息。"
      }
    ]
  },
  {
    category: "账户和安全",
    items: [
      {
        q: "如何保护账户安全？",
        a: "使用硬件钱包（如 Ledger）是最安全的方式。如果使用软件钱包，请妥善保管私钥和助记词，不要分享给任何人。"
      },
      {
        q: "忘记了私钥怎么办？",
        a: "私钥无法恢复。如果忘记了私钥，可以使用备份的助记词导入钱包。如果都没有，账户中的资产将无法访问。"
      },
      {
        q: "如何进行 KYC 认证？",
        a: "在白名单页面填写个人信息，上传身份证明文件。我们会在 3-5 个工作日内完成审核。"
      },
      {
        q: "个人信息会被泄露吗？",
        a: "我们严格遵守数据保护法规，所有个人信息都经过加密存储。我们不会将用户信息分享给第三方。"
      }
    ]
  },
  {
    category: "钱包连接",
    items: (walletConnectionGuide.sections.find(s => s.id === "faq")?.faqs || []).map(faq => ({
      q: faq.question,
      a: faq.answer
    }))
  }
];

export default function FAQ() {
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIndex(expandedIndex === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-20">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            常见问题
          </h1>
          <p className="text-xl text-gray-600">
            查找关于 PECT 的常见问题和解答
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqData.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-200">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => {
                  const itemId = `${sectionIndex}-${itemIndex}`;
                  const isExpanded = expandedIndex === itemId;

                  return (
                    <Card 
                      key={itemIndex}
                      className="border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(itemId)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold text-gray-900">
                            {item.q}
                          </CardTitle>
                          <ChevronDown 
                            className={`w-5 h-5 text-green-600 transition-transform ${isExpanded ? "transform rotate-180" : ""}`}
                          />
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="pt-0">
                          <p className="text-gray-600 leading-relaxed">
                            {item.a}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <Card className="mt-12 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle>没有找到答案？</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              如果您没有找到需要的答案，请通过以下方式联系我们：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="mailto:support@pect.io"
                className="p-4 rounded-lg bg-white border border-green-200 hover:border-green-600 transition-colors text-center"
              >
                <p className="font-semibold text-gray-900 mb-1">邮件</p>
                <p className="text-sm text-gray-600">support@pect.io</p>
              </a>
              <a 
                href="#"
                className="p-4 rounded-lg bg-white border border-green-200 hover:border-green-600 transition-colors text-center"
              >
                <p className="font-semibold text-gray-900 mb-1">Discord</p>
                <p className="text-sm text-gray-600">加入社区讨论</p>
              </a>
              <a 
                href="#"
                className="p-4 rounded-lg bg-white border border-green-200 hover:border-green-600 transition-colors text-center"
              >
                <p className="font-semibold text-gray-900 mb-1">Twitter</p>
                <p className="text-sm text-gray-600">@PECT_Official</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
