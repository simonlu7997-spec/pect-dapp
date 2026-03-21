import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Stake() {
  const { isConnected, connectWallet } = useWallet();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const handleStake = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    alert(`质押 ${stakeAmount} C2-Coin`);
  };

  const handleUnstake = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    alert(`解押 ${unstakeAmount} C2-Coin`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">C2-Coin 质押</h1>

        {/* 质押统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">我的质押</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">0 C2C</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">月度奖励</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-pink-600">0 USDT</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">年化收益率</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">12%</p>
            </CardContent>
          </Card>
        </div>

        {/* 质押/解押表单 */}
        <Card>
          <CardHeader>
            <CardTitle>质押操作</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stake" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stake">质押</TabsTrigger>
                <TabsTrigger value="unstake">解押</TabsTrigger>
              </TabsList>

              <TabsContent value="stake" className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    质押金额
                  </label>
                  <Input
                    type="number"
                    placeholder="输入 C2-Coin 数量"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                </div>

                {stakeAmount && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      预计月度奖励：<span className="font-bold text-gray-900">{(parseFloat(stakeAmount) * 0.01).toFixed(2)} USDT</span>
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleStake}
                  className="w-full bg-purple-600 hover:bg-purple-700 h-12"
                  disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                >
                  {isConnected ? '立即质押' : '连接钱包质押'}
                </Button>
              </TabsContent>

              <TabsContent value="unstake" className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    解押金额
                  </label>
                  <Input
                    type="number"
                    placeholder="输入 C2-Coin 数量"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleUnstake}
                  className="w-full bg-pink-600 hover:bg-pink-700 h-12"
                  disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0}
                >
                  {isConnected ? '立即解押' : '连接钱包解押'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
