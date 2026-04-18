import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Wallet, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import walletConnectionGuide from "@/data/walletGuide";

const CONTRACT_ADDRESSES = [
  { name: "PV-Coin (PVC)", address: "0x60F1E9deA2cBE622Bc86562f2bb62e2A9A479D0D" },
  { name: "C2-Coin (C2C)", address: "0x1E9e7977dA3542c32d1cF62122Ab76fe35C90Ff1" },
  { name: "PrivateSale", address: "0x81D5B063cF16FF7EC56491596b379314C8f28411" },
  { name: "PublicSale", address: "0x44F8E4C74caC9196DF8038041A64716081Ba04e1" },
  { name: "RevenueDistributor", address: "0x40434E74aF82225451d06C664FDF28229c53b8f1" },
  { name: "StakingManager", address: "0x063F639D7f0dEE9410b1C84d74cfe89c27cb426e" },
];

export default function Docs() {
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [showContractAddresses, setShowContractAddresses] = useState(false);
  const [selectedSection, setSelectedSection] = useState("overview");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const documents = [
    {
      title: "钱包连接指南",
      description: "详细的多平台钱包连接说明，包括 iOS、Android 和桌面用户指南",
      icon: "💼",
      isGuide: true,
      version: "Latest"
    },
    {
      title: "PECT 白皮书（中文版）",
      description: "详细介绍 PECT 项目的技术架构、代币经济学和发展路线图",
      icon: "📄",
      downloadUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663279243720/8stZafG66C8pumsuGH6Z2q/PECT_Whitepaper_v6.1_CN_110db6ae.pdf",
      version: "v6.1"
    },
    {
      title: "PECT Whitepaper (English)",
      description: "Comprehensive overview of PECT's technical architecture, tokenomics and roadmap",
      icon: "📋",
      downloadUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663279243720/8stZafG66C8pumsuGH6Z2q/PECT_Whitepaper_v6.1_EN_da0498cb.pdf",
      version: "v6.1"
    },
    {
      title: "智能合约审计报告（中文版）",
      description: "PECT 智能合约安全审计报告，包含漏洞分析、风险评级和修复建议",
      icon: "🔐",
      downloadUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663279243720/8stZafG66C8pumsuGH6Z2q/PECT_Smart_Contract_Audit_CN_1b73efb9.pdf",
      version: "v1.0"
    },
    {
      title: "PECT Smart Contract Audit Report",
      description: "Security audit report for PECT smart contracts, including vulnerability analysis and recommendations",
      icon: "🛡️",
      downloadUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663279243720/8stZafG66C8pumsuGH6Z2q/PECT_Smart_Contract_Audit_EN_0959a9cc.pdf",
      version: "v1.0"
    }
  ];

  const renderGuideContent = () => {
    const section = walletConnectionGuide.sections.find(s => s.id === selectedSection);
    if (!section) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
        <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
          {section.content}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-20">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            项目文档
          </h1>
          <p className="text-xl text-gray-600">
            获取 PECT 项目的完整文档和技术资料
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {documents.map((doc, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow border-2 border-gray-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{doc.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">版本: {doc.version}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{doc.description}</p>
                {doc.isGuide ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setSelectedSection("overview");
                      setShowWalletGuide(true);
                    }}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    查看指南
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(doc.downloadUrl, "_blank")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载文档
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle>快速链接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://github.com/simonlu7997-spec/pect-contracts"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">GitHub 代码仓库</span>
              </a>
              <button
                onClick={() => setShowContractAddresses(true)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">合约地址</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Connection Guide Dialog */}
      <Dialog open={showWalletGuide} onOpenChange={setShowWalletGuide}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{walletConnectionGuide.title}</DialogTitle>
            <DialogDescription>
              {walletConnectionGuide.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 h-[60vh]">
            {/* Navigation */}
            <div className="w-40 border-r border-gray-200">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-4">
                  {walletConnectionGuide.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedSection === section.id
                          ? "bg-emerald-100 text-emerald-900 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Content */}
            <div className="flex-1">
              <ScrollArea className="h-full">
                <div className="pr-4">
                  {renderGuideContent()}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Addresses Dialog */}
      <Dialog open={showContractAddresses} onOpenChange={setShowContractAddresses}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>PECT 合约地址</DialogTitle>
            <DialogDescription>
              以下为部署在 Polygon Amoy 测试网的合约地址，点击复制按钮可复制地址
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {CONTRACT_ADDRESSES.map((item) => (
              <div key={item.address} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 mb-1">{item.name}</p>
                  <p className="text-xs font-mono text-gray-800 break-all">{item.address}</p>
                </div>
                <button
                  onClick={() => handleCopy(item.address)}
                  className="shrink-0 p-1.5 rounded hover:bg-gray-200 transition-colors"
                  title="复制地址"
                >
                  {copiedAddress === item.address ? (
                    <span className="text-xs text-green-600 font-medium">已复制</span>
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
