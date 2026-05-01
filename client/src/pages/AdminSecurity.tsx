import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Loader2,
  Lock,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_URL ?? "https://amoy.polygonscan.com";

function shortenAddress(addr: string) {
  if (!addr || addr === "未配置") return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} 已复制到剪贴板`);
  });
}

export default function AdminSecurity() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();

  const { data: securityStatus, isLoading, refetch } =
    trpc.adminSecurity.getSecurityStatus.useQuery(undefined, { enabled: isAdmin });

  const { data: contractAddresses } =
    trpc.adminSecurity.getContractAddresses.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">无权限访问</p>
          <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
        </div>
      </div>
    );
  }

  const contracts = securityStatus?.contracts ?? [];
  const warnings = securityStatus?.securityWarnings ?? [];
  const deployerAddress = securityStatus?.deployerAddress;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航 */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/kyc")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              管理后台
            </Button>
            <span className="text-gray-600">/</span>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              安全中心
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="container max-w-6xl py-8 space-y-6">

        {/* M-01 安全警告横幅 */}
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-base">
                M-01：Owner 单点控制风险（中等严重程度）
              </p>
              <p className="text-amber-200/70 text-sm mt-1 leading-relaxed">
                所有合约均使用单一 EOA 地址（Deployer）作为 Owner。若私钥泄露，攻击者可执行
                紧急提取、撤销 KYC、修改兑换率等高危操作。
              </p>
              <div className="mt-3 space-y-1 text-sm text-amber-200/60">
                <p><span className="text-amber-400 font-medium">建议修复方案：</span></p>
                <p>1. 将 Owner 迁移至 Gnosis Safe 多签钱包（至少 2/3 签名）</p>
                <p>2. 对高风险参数变更（兑换率、总供应量）引入 TimeLock（24-48 小时延迟）</p>
                <p>3. 将 emergencyWithdraw 限制为只能提取超过已分配总量的余额</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-amber-900/50 text-amber-400 border-amber-700 text-xs">
                  状态：待修复
                </Badge>
                <Badge className="bg-gray-800 text-gray-400 border-gray-700 text-xs">
                  DApp 层面已缓解
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* M-02 已修复提示 */}
        <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-300 font-semibold text-base">
                M-02：DateHelper 日期计算精度误差（已修复）
              </p>
              <p className="text-green-200/70 text-sm mt-1 leading-relaxed">
                DateHelper.sol 已使用 Howard Hinnant 精确日期算法重写，替换了原有的近似公式
                <code className="bg-gray-800 px-1 rounded text-xs mx-1">(days_since_year_ * 12 + 373) / 367</code>。
                新算法在所有月份边界（含闰年 2 月）均通过了 17 项精度验证测试，无 ±1 天误差。
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-green-900/50 text-green-400 border-green-700 text-xs">
                  状态：已修复（合约代码已更新）
                </Badge>
                <Badge className="bg-gray-800 text-gray-400 border-gray-700 text-xs">
                  需重新部署合约生效
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Deployer / Owner 地址面板 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" />
              Owner 地址（当前为单一 EOA — 高风险）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                查询链上数据中...
              </div>
            ) : deployerAddress ? (
              <div className="bg-red-900/10 border border-red-800/40 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Deployer / Owner 地址</p>
                    <p className="font-mono text-red-300 text-sm break-all">{deployerAddress}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(deployerAddress, "Owner 地址")}
                      className="text-gray-400 hover:text-white h-8 w-8 p-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`${EXPLORER_BASE}/address/${deployerAddress}`, "_blank")}
                      className="text-gray-400 hover:text-white h-8 w-8 p-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-red-900/20 rounded-lg">
                  <p className="text-red-400 text-xs font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    安全建议
                  </p>
                  <p className="text-red-300/70 text-xs mt-1">
                    此地址是所有合约的唯一 Owner。请确保私钥存储在硬件钱包中，
                    并尽快迁移至 Gnosis Safe 多签地址以降低单点风险。
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">无法获取 Deployer 地址（私钥未配置）</p>
            )}
          </CardContent>
        </Card>

        {/* 合约 Owner 验证状态 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              链上合约 Owner 验证
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              验证每个合约的链上 owner() 是否与当前 Deployer 地址一致
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                查询链上数据中...
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">{c.name}</span>
                        {c.paused === true && (
                          <Badge className="bg-yellow-900/50 text-yellow-400 border-yellow-800 text-xs">已暂停</Badge>
                        )}
                        {c.paused === false && (
                          <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">运行中</Badge>
                        )}
                      </div>
                      <p className="font-mono text-gray-400 text-xs truncate">{c.address}</p>
                      {c.owner && (
                        <p className="font-mono text-gray-500 text-xs mt-0.5">
                          Owner: {shortenAddress(c.owner)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.ownerMismatch ? (
                        <div className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs">Owner 不匹配</span>
                        </div>
                      ) : c.owner ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs">Owner 一致</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">查询失败</span>
                      )}
                      {c.address && c.address !== "未配置" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${EXPLORER_BASE}/address/${c.address}`, "_blank")}
                          className="text-gray-500 hover:text-white h-7 w-7 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 合约地址公示（公开透明度） */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              合约地址公示
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              所有合约地址均已公开，用户可在区块链浏览器上独立验证
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(contractAddresses ?? []).map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-300 text-sm">{c.name}</span>
                    <p className="font-mono text-gray-500 text-xs mt-0.5 truncate">{c.address}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {c.address !== "未配置" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(c.address, c.name)}
                          className="text-gray-500 hover:text-white h-7 w-7 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${EXPLORER_BASE}/address/${c.address}`, "_blank")}
                          className="text-gray-500 hover:text-white h-7 w-7 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 敏感操作安全提示 */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              敏感操作安全规范（M-01 DApp 层面缓解）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                {
                  op: "链上分红 / 质押奖励发放",
                  risk: "高",
                  color: "red",
                  tips: [
                    "执行前确认分红池金额与数据库记录一致",
                    "确认本月尚未执行过相同操作（防止重复发放）",
                    "操作已启用二次 AlertDialog 确认",
                  ],
                },
                {
                  op: "USDT Approve 授权",
                  risk: "高",
                  color: "red",
                  tips: [
                    "仅授权实际需要的金额，不建议无限额授权",
                    "授权后立即检查 allowance 是否正确",
                    "操作使用 deployer 私钥，确保私钥安全存储",
                  ],
                },
                {
                  op: "PVC 充入销售合约",
                  risk: "中",
                  color: "amber",
                  tips: [
                    "充入前确认 deployer PVC 余额充足",
                    "充入金额应与实际销售计划匹配",
                  ],
                },
                {
                  op: "KYC 审批 / 白名单同步",
                  risk: "中",
                  color: "amber",
                  tips: [
                    "审批前核实用户提交的身份信息",
                    "白名单同步操作会消耗 gas，批量同步时注意 gas 余额",
                  ],
                },
              ].map((item) => (
                <div
                  key={item.op}
                  className={`rounded-lg p-4 border ${
                    item.color === "red"
                      ? "bg-red-900/10 border-red-800/40"
                      : "bg-amber-900/10 border-amber-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">{item.op}</span>
                    <Badge
                      className={`text-xs ${
                        item.color === "red"
                          ? "bg-red-900/50 text-red-400 border-red-800"
                          : "bg-amber-900/50 text-amber-400 border-amber-800"
                      }`}
                    >
                      风险：{item.risk}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {item.tips.map((tip, i) => (
                      <li key={i} className={`text-xs flex items-start gap-1.5 ${
                        item.color === "red" ? "text-red-300/70" : "text-amber-300/70"
                      }`}>
                        <span className="mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
