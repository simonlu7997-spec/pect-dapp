import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

export default function Docs() {
  const documents = [
    {
      title: "PECT 白皮书（中文版）",
      description: "详细介绍 PECT 项目的技术架构、代币经济学和发展路线图",
      icon: "📄",
      downloadUrl: "#",
      version: "v6.0"
    },
    {
      title: "PECT Whitepaper (English)",
      description: "Comprehensive overview of PECT's technical architecture, tokenomics and roadmap",
      icon: "📋",
      downloadUrl: "#",
      version: "v6.0"
    },
    {
      title: "智能合约审计报告",
      description: "第三方安全审计机构对 PECT 智能合约的审计结果和安全评估",
      icon: "🔐",
      downloadUrl: "#",
      version: "Latest"
    },
    {
      title: "API 文档",
      description: "DApp 前端与区块链交互的 API 接口文档和集成指南",
      icon: "🔗",
      downloadUrl: "#",
      version: "v1.0"
    }
  ];

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
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // 实现下载逻辑
                    alert("文档下载功能即将推出");
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载文档
                </Button>
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
                href="#" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">GitHub 代码仓库</span>
              </a>
              <a 
                href="#" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Polygon Amoy 测试网</span>
              </a>
              <a 
                href="#" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">合约地址</span>
              </a>
              <a 
                href="#" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">开发者指南</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
