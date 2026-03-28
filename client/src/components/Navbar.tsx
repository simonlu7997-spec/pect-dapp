import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Wallet, LogOut, QrCode, CheckCircle, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function WalletButton() {
  const {
    isConnected,
    isSignedIn,
    siweUser,
    shortAddress,
    isConnecting,
    connectWallet,
    connectWalletConnect,
    disconnectWallet,
    signIn,
    signOut,
  } = useWalletContext();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 已连接且已签名登录
  if (isConnected && isSignedIn) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="hidden sm:inline">{siweUser?.name || shortAddress}</span>
        </button>
        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500">已登录</p>
              <p className="text-sm font-medium text-gray-800 truncate">{shortAddress}</p>
            </div>
            <button
              onClick={() => { signOut(); setShowUserMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
            <button
              onClick={() => { disconnectWallet(); setShowUserMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
            >
              <X className="w-4 h-4" />
              断开钱包
            </button>
          </div>
        )}
      </div>
    );
  }

  // 已连接但未签名登录
  if (isConnected && !isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:block px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
          {shortAddress}
        </div>
        <Button
          onClick={signIn}
          variant="default"
          size="sm"
          className="hidden sm:flex gap-2 bg-emerald-600 hover:bg-emerald-700 text-xs"
        >
          <UserCircle className="w-4 h-4" />
          签名登录
        </Button>
        <Button
          onClick={disconnectWallet}
          variant="outline"
          size="sm"
          className="hidden sm:flex gap-1 border-gray-300 text-gray-500 hover:bg-gray-50 text-xs"
        >
          <LogOut className="w-3 h-3" />
          断开
        </Button>
      </div>
    );
  }

  // 未连接
  return (
    <>
      <Button
        onClick={() => setShowWalletOptions(true)}
        disabled={isConnecting}
        variant="default"
        size="sm"
        className="hidden sm:flex gap-2 bg-emerald-600 hover:bg-emerald-700"
      >
        <Wallet className="w-4 h-4" />
        {isConnecting ? "连接中..." : "连接钱包"}
      </Button>

      <Dialog open={showWalletOptions} onOpenChange={setShowWalletOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>连接钱包</DialogTitle>
            <DialogDescription>
              连接钱包后，您可以通过签名登录 PECT DApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={() => { connectWallet(); setShowWalletOptions(false); }}
              disabled={isConnecting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Wallet className="w-4 h-4 mr-2" />
              MetaMask
            </Button>
            <Button
              onClick={() => { connectWalletConnect(); setShowWalletOptions(false); }}
              disabled={isConnecting}
              variant="outline"
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <QrCode className="w-4 h-4 mr-2" />
              WalletConnect（手机扫码）
            </Button>
            <p className="text-xs text-gray-400 text-center">
              连接后需要签名消息以验证身份，不会产生任何 Gas 费用
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const {
    isConnected,
    isSignedIn,
    shortAddress,
    isConnecting,
    connectWallet,
    connectWalletConnect,
    disconnectWallet,
    signIn,
    signOut,
  } = useWalletContext();

  const navItems = [
    { label: "购买", href: "/buy" },
    { label: "资产", href: "/portfolio" },
    { label: "质押", href: "/stake" },
    { label: "数据分析", href: "/analytics" },
    { label: "白名单", href: "/whitelist" },
  ];

  const isActive = (href: string) => location === href;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-lg text-emerald-900 hidden sm:inline">PECT</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  isActive(item.href)
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
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

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-emerald-100">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => { setLocation(item.href); setIsOpen(false); }}
                className={`block w-full text-left px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  isActive(item.href)
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-gray-600 hover:text-emerald-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}

            {isConnected ? (
              <>
                <div className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium text-center mt-2">
                  {shortAddress}
                  {isSignedIn && <span className="ml-2 text-xs text-emerald-500">✓ 已登录</span>}
                </div>
                {!isSignedIn && (
                  <Button
                    onClick={() => { signIn(); setIsOpen(false); }}
                    variant="default"
                    className="w-full mt-2 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <UserCircle className="w-4 h-4" />
                    签名登录
                  </Button>
                )}
                {isSignedIn && (
                  <Button
                    onClick={() => { signOut(); setIsOpen(false); }}
                    variant="outline"
                    className="w-full mt-2 gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </Button>
                )}
                <Button
                  onClick={() => { disconnectWallet(); setIsOpen(false); }}
                  variant="outline"
                  className="w-full mt-2 gap-2 border-gray-300 text-gray-500"
                >
                  <X className="w-4 h-4" />
                  断开钱包
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => { connectWallet(); setIsOpen(false); }}
                  disabled={isConnecting}
                  variant="default"
                  className="w-full mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? "连接中..." : "MetaMask"}
                </Button>
                <Button
                  onClick={() => { connectWalletConnect(); setIsOpen(false); }}
                  disabled={isConnecting}
                  variant="outline"
                  className="w-full mt-2 gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <QrCode className="w-4 h-4" />
                  WalletConnect
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
