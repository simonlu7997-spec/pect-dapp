import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/contexts/WalletContext";
import { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function Buy() {
  const { account, isConnected } = useWallet();
  const [privateSaleAmount, setPrivateSaleAmount] = useState("");
  const [publicSaleAmount, setPublicSaleAmount] = useState("");

  const privateSalePrice = 0.10;
  const publicSalePrice = 0.10;

  const privateUsdtRequired = privateSaleAmount ? (parseFloat(privateSaleAmount) * privateSalePrice).toFixed(2) : "0.00";
  const publicUsdtRequired = publicSaleAmount ? (parseFloat(publicSaleAmount) * publicSalePrice).toFixed(2) : "0.00";

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>购买 PV-Coin</CardTitle>
            <CardDescription>请先连接钱包</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              连接钱包后，您可以购买 PV-Coin。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="container max-w-4xl">
        {/* 页面标题 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">购买 PV-Coin</h1>
          <p className="text-lg text-gray-600">选择私募或公募购买 PV-Coin</p>
        </div>

        {/* 标签页 */}
        <Tabs defaultValue="private" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="private" className="text-lg">私募</TabsTrigger>
            <TabsTrigger value="public" className="text-lg">公募</TabsTrigger>
          </TabsList>

          {/* 私募标签页 */}
          <TabsContent value="private" className="space-y-6">
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="text-green-700">私募信息</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">私募价格</p>
                    <p className="text-2xl font-bold text-green-600">{privateSalePrice} USDT/PVC</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">最低购买</p>
                    <p className="text-2xl font-bold text-gray-900">5,000 PVC</p>
                    <p className="text-xs text-gray-500">(500 USDT)</p>
                  </div>
                </div>
                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">锁仓期</p>
                    <p className="text-2xl font-bold text-gray-900">3 个月</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">募资进度</p>
                    <p className="text-2xl font-bold text-gray-900">80,000 / 80,000 USDT</p>
                    <p className="text-xs text-gray-500">(100%)</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-1">状态</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-lg font-semibold text-green-600">已结束</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 购买表单 */}
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="text-green-700">购买表单</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">购买数量 (PVC)</label>
                  <Input
                    type="number"
                    placeholder="输入购买数量"
                    value={privateSaleAmount}
                    onChange={(e) => setPrivateSaleAmount(e.target.value)}
                    className="text-lg p-3"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">需支付 USDT 金额</p>
                  <p className="text-3xl font-bold text-gray-900">{privateUsdtRequired} USDT</p>
                </div>
                <div className="space-y-3">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700 py-6 text-lg">
                    连接钱包
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg">
                    批准 USDT
                  </Button>
                  <Button className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg">
                    购买
                  </Button>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">您已在白名单中 ✓</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 公募标签页 */}
          <TabsContent value="public" className="space-y-6">
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="text-blue-700">公募信息</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">公募价格</p>
                    <p className="text-2xl font-bold text-blue-600">{publicSalePrice} USDT/PVC</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">最低购买</p>
                    <p className="text-2xl font-bold text-gray-900">1,000 PVC</p>
                    <p className="text-xs text-gray-500">(100 USDT)</p>
                  </div>
                </div>
                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">锁仓期</p>
                    <p className="text-2xl font-bold text-gray-900">无</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">募资进度</p>
                    <p className="text-2xl font-bold text-gray-900">180,000 / 200,000 USDT</p>
                    <p className="text-xs text-gray-500">(90%)</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-1">状态</p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <p className="text-lg font-semibold text-yellow-600">进行中</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 购买表单 */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="text-blue-700">购买表单</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">购买数量 (PVC)</label>
                  <Input
                    type="number"
                    placeholder="输入购买数量"
                    value={publicSaleAmount}
                    onChange={(e) => setPublicSaleAmount(e.target.value)}
                    className="text-lg p-3"
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">需支付 USDT 金额</p>
                  <p className="text-3xl font-bold text-gray-900">{publicUsdtRequired} USDT</p>
                </div>
                <div className="space-y-3">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700 py-6 text-lg">
                    连接钱包
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg">
                    批准 USDT
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg">
                    购买
                  </Button>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-700">需完成 KYC 验证</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 风险提示 */}
        <Card className="mt-8 border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800">
                <strong>⚠️ 加密资产投资风险高</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800">
                <strong>⚠️ 请勿投入超过承受范围的资金</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-800">
                <strong>⚠️ 详见白皮书风险披露部分</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
