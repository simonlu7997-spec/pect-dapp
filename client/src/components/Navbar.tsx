import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Menu, X, Wallet, LogOut, QrCode, CheckCircle, UserCircle,
  ChevronDown, Copy, ExternalLink, ShieldCheck, Users, BarChart3,
  Zap, TrendingUp, Gift, Layers, ShoppingCart, PieChart,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── 我的资产子菜单项 ─────────────────────────────────────────────────────────
const assetSubItems = [
  { label: "资产总览", href: "/portfolio", icon: PieChart, desc: "持仓汇总" },
  { label: "分红领取", href: "/revenue", icon: TrendingUp, desc: "PV-Coin 分红" },
  { label: "C2 空投", href: "/airdrop", icon: Gift, desc: "C2-Coin 空投" },
  { label: "质押管理", href: "/staking", icon: Layers, desc: "C2-Coin 质押" },
];

// ─── WalletButton ─────────────────────────────────────────────────────────────
function WalletButton() {
  const {
    isConnected, isSignedIn, siweUser, account, shortAddress,
    isConnecting, connectWallet, connectWalletConnect,
    disconnectWallet, signIn, signOut,
  } = useWalletContext();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const copyAddress = () => {
    if (account) { navigator.clipboard.writeText(account); toast.success("地址已复制"); }
  };
  const openExplorer = () => {
    if (account) window.open(`https://amoy.polygonscan.com/address/${account}`, "_blank");
  };

  // 已连接 + 已签名
  if (isConnected && isSignedIn) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-sm font-medium hover:bg-emerald-100 transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
          <span className="hidden sm:inline max-w-[120px] truncate">{siweUser?.name || shortAddress}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">已登录</p>
                  <p className="text-xs text-gray-500 truncate">{shortAddress}</p>
                </div>
              </div>
            </div>
            <div className="py-1">
              <button onClick={copyAddress} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <Copy className="w-4 h-4 text-gray-400" />复制地址
              </button>
              <button onClick={openExplorer} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <ExternalLink className="w-4 h-4 text-gray-400" />在浏览器查看
              </button>
            </div>
            <div className="border-t border-gray-100 py-1">
              <button onClick={() => { signOut(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" />退出登录
              </button>
              <button onClick={() => { disconnectWallet(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <X className="w-4 h-4" />断开钱包
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 已连接未签名
  if (isConnected && !isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {shortAddress}
        </div>
        <Button onClick={signIn} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 h-8 rounded-full gap-1.5">
          <UserCircle className="w-3.5 h-3.5" />签名登录
        </Button>
        <button onClick={disconnectWallet} className="hidden sm:flex p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="断开钱包">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 未连接
  return (
    <>
      <Button onClick={() => setShowWalletOptions(true)} disabled={isConnecting} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-full px-4">
        <Wallet className="w-4 h-4" />{isConnecting ? "连接中..." : "连接钱包"}
      </Button>

      <Dialog open={showWalletOptions} onOpenChange={setShowWalletOptions}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">选择钱包</DialogTitle>
            <DialogDescription className="text-center text-sm">连接钱包后，通过签名验证身份，不产生任何 Gas 费用</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <button onClick={() => { connectWallet(); setShowWalletOptions(false); }} disabled={isConnecting} className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-800">MetaMask</p>
                <p className="text-xs text-gray-400">浏览器扩展钱包</p>
              </div>
            </button>
            <button onClick={() => { connectWalletConnect(); setShowWalletOptions(false); }} disabled={isConnecting} className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-800">WalletConnect</p>
                <p className="text-xs text-gray-400">手机扫码连接</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 主 Navbar ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: siweUser } = trpc.siweAuth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const isAdmin = user?.role === "admin" || siweUser?.role === "admin";

  // 桌面端下拉菜单状态
  const [showAssetMenu, setShowAssetMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const assetMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // 移动端手风琴状态
  const [mobileAssetOpen, setMobileAssetOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);

  const {
    isConnected, isSignedIn, shortAddress, isConnecting,
    connectWallet, connectWalletConnect, disconnectWallet, signIn, signOut,
  } = useWalletContext();

  // 点击外部关闭桌面端下拉
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (assetMenuRef.current && !assetMenuRef.current.contains(e.target as Node)) setShowAssetMenu(false);
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) setShowAdminMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 路由变化时关闭移动菜单
  useEffect(() => { setIsOpen(false); }, [location]);

  const isActive = (href: string) => location === href;
  const isAssetActive = assetSubItems.some((i) => location === i.href);
  const isAdminActive = location.startsWith("/admin");

  // 顶层导航（不含资产子项）
  const topNavItems = [
    { label: "购买", href: "/buy", icon: ShoppingCart },
    { label: "数据分析", href: "/analytics", icon: BarChart3 },
    { label: "白名单", href: "/whitelist", icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-sm">
      <div className="container">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => setLocation("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-lg text-emerald-900 hidden sm:inline">PECT</span>
          </button>

          {/* ── 桌面端导航 ── */}
          <div className="hidden md:flex items-center gap-1">

            {/* 购买 */}
            <button
              onClick={() => setLocation("/buy")}
              className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${isActive("/buy") ? "bg-emerald-100 text-emerald-900" : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"}`}
            >
              购买
            </button>

            {/* 我的资产 下拉 */}
            <div className="relative" ref={assetMenuRef}>
              <button
                onClick={() => setShowAssetMenu(!showAssetMenu)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  isAssetActive
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"
                }`}
              >
                我的资产
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAssetMenu ? "rotate-180" : ""}`} />
              </button>

              {showAssetMenu && (
                <div className="absolute left-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-700">资产管理</p>
                  </div>
                  <div className="py-1">
                    {assetSubItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          onClick={() => { setLocation(item.href); setShowAssetMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                            isActive(item.href)
                              ? "bg-emerald-50 text-emerald-800 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium leading-tight">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 数据分析 */}
            <button
              onClick={() => setLocation("/analytics")}
              className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${isActive("/analytics") ? "bg-emerald-100 text-emerald-900" : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"}`}
            >
              数据分析
            </button>

            {/* 白名单 */}
            <button
              onClick={() => setLocation("/whitelist")}
              className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${isActive("/whitelist") ? "bg-emerald-100 text-emerald-900" : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"}`}
            >
              白名单
            </button>

            {/* 管理后台 下拉 */}
            {isAdmin && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                    isAdminActive
                      ? "bg-violet-100 text-violet-900"
                      : "text-violet-700 hover:text-violet-900 hover:bg-violet-50"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  管理后台
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAdminMenu ? "rotate-180" : ""}`} />
                </button>

                {showAdminMenu && (
                  <div className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 bg-violet-50 border-b border-violet-100">
                      <p className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />管理员面板
                      </p>
                    </div>
                    <div className="py-1">
                      {[
                        { href: "/admin/kyc", label: "KYC 审核", icon: Users },
                        { href: "/admin/revenue", label: "分红管理", icon: BarChart3 },
                        { href: "/admin/airdrop", label: "空投管理", icon: Gift },
                        { href: "/admin/stations", label: "电站管理", icon: Zap },
                      ].map(({ href, label, icon: Icon }) => (
                        <button
                          key={href}
                          onClick={() => { setLocation(href); setShowAdminMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                            location === href ? "bg-violet-50 text-violet-800 font-medium" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-gray-400" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <WalletButton />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── 移动端菜单 ── */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-emerald-100 pt-2 space-y-1">

            {/* 购买 */}
            <button
              onClick={() => setLocation("/buy")}
              className={`flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive("/buy") ? "bg-emerald-100 text-emerald-900" : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"}`}
            >
              <ShoppingCart className="w-4 h-4" />购买
            </button>

            {/* 我的资产 手风琴 */}
            <div>
              <button
                onClick={() => setMobileAssetOpen(!mobileAssetOpen)}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                  isAssetActive
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <PieChart className="w-4 h-4" />我的资产
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileAssetOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileAssetOpen && (
                <div className="mt-1 ml-4 border-l-2 border-emerald-100 pl-3 space-y-0.5">
                  {assetSubItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => setLocation(item.href)}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive(item.href)
                            ? "bg-emerald-100 text-emerald-900 font-medium"
                            : "text-gray-600 hover:text-emerald-900 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                        <span className="ml-auto text-xs text-gray-400">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 数据分析 */}
            <button
              onClick={() => setLocation("/analytics")}
              className={`flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive("/analytics") ? "bg-emerald-100 text-emerald-900" : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"}`}
            >
              <BarChart3 className="w-4 h-4" />数据分析
            </button>

            {/* 白名单 */}
            <button
              onClick={() => setLocation("/whitelist")}
              className={`flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive("/whitelist") ? "bg-emerald-100 text-emerald-900" : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"}`}
            >
              <Users className="w-4 h-4" />白名单
            </button>

            {/* 管理后台 手风琴（仅 admin） */}
            {isAdmin && (
              <div>
                <button
                  onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                    isAdminActive
                      ? "bg-violet-100 text-violet-900"
                      : "text-violet-700 hover:bg-violet-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />管理后台
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${mobileAdminOpen ? "rotate-180" : ""}`} />
                </button>

                {mobileAdminOpen && (
                  <div className="mt-1 ml-4 border-l-2 border-violet-100 pl-3 space-y-0.5">
                    {[
                      { href: "/admin/kyc", label: "KYC 审核", icon: Users },
                      { href: "/admin/revenue", label: "分红管理", icon: BarChart3 },
                      { href: "/admin/airdrop", label: "空投管理", icon: Gift },
                      { href: "/admin/stations", label: "电站管理", icon: Zap },
                    ].map(({ href, label, icon: Icon }) => (
                      <button
                        key={href}
                        onClick={() => setLocation(href)}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                          location === href
                            ? "bg-violet-100 text-violet-900 font-medium"
                            : "text-violet-600 hover:bg-violet-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 钱包区域 */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {isConnected ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${isSignedIn ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
                    <span className="text-sm font-medium text-emerald-800">{shortAddress}</span>
                    {isSignedIn && <span className="text-xs text-emerald-600 ml-auto">✓ 已登录</span>}
                  </div>
                  {!isSignedIn && (
                    <Button onClick={() => signIn()} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                      <UserCircle className="w-4 h-4" />签名登录
                    </Button>
                  )}
                  {isSignedIn && (
                    <Button onClick={() => signOut()} variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" />退出登录
                    </Button>
                  )}
                  <Button onClick={() => disconnectWallet()} variant="outline" className="w-full gap-2 border-gray-200 text-gray-500">
                    <X className="w-4 h-4" />断开钱包
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => connectWallet()} disabled={isConnecting} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Wallet className="w-4 h-4" />{isConnecting ? "连接中..." : "MetaMask"}
                  </Button>
                  <Button onClick={() => connectWalletConnect()} disabled={isConnecting} variant="outline" className="w-full gap-2 border-blue-300 text-blue-600 hover:bg-blue-50">
                    <QrCode className="w-4 h-4" />WalletConnect
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
