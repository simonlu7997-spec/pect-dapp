import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";

function WalletButton() {
  const { isConnected, shortAddress, isConnecting, connectWallet, disconnectWallet } = useWalletContext();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:block px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
          {shortAddress}
        </div>
        <Button
          onClick={disconnectWallet}
          variant="outline"
          size="sm"
          className="hidden sm:flex gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
        >
          <LogOut className="w-4 h-4" />
          断开
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      variant="default"
      size="sm"
      className="hidden sm:flex gap-2 bg-emerald-600 hover:bg-emerald-700"
    >
      <Wallet className="w-4 h-4" />
      {isConnecting ? "连接中..." : "连接钱包"}
    </Button>
  );
}

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, shortAddress, isConnecting, connectWallet, disconnectWallet } = useWalletContext();

  const navItems = [
    { label: "购买", href: "/buy" },
    { label: "资产", href: "/portfolio" },
    { label: "质押", href: "/stake" },
    { label: "数据分析", href: "/analytics" },
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

            {/* Mobile Menu Button */}
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
                onClick={() => {
                  setLocation(item.href);
                  setIsOpen(false);
                }}
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
                <div className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium text-center">
                  {shortAddress}
                </div>
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  className="w-full mt-4 gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                >
                  <LogOut className="w-4 h-4" />
                  断开连接
                </Button>
              </>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                variant="default"
                className="w-full mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? "连接中..." : "连接钱包"}
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
