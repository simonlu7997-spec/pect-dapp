import { useEffect, useState } from 'react';
import { AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}

export function WalletConnectionGuide() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /mobile|tablet/.test(userAgent);

    setDeviceInfo({
      isIOS,
      isAndroid,
      isMobile,
      isDesktop: !isMobile,
    });
  }, []);

  if (!deviceInfo) return null;

  // iOS 用户提示
  if (deviceInfo.isIOS) {
    return (
      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-2">
          <strong>iOS 用户提示：</strong> Safari 浏览器无法直接连接钱包。建议使用 <strong>MetaMask App</strong> 或 <strong>Trust Wallet</strong>，或在本网站使用 <strong>WalletConnect</strong> 连接方式（扫描二维码）。
        </AlertDescription>
      </Alert>
    );
  }

  // Android 用户提示
  if (deviceInfo.isAndroid) {
    return (
      <Alert className="border-green-200 bg-green-50 mb-4">
        <Smartphone className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 ml-2">
          <strong>Android 用户提示：</strong> 您可以使用 <strong>Chrome 浏览器 + MetaMask 扩展</strong>，或使用 <strong>WalletConnect</strong> 连接方式。
        </AlertDescription>
      </Alert>
    );
  }

  // 桌面用户提示
  if (deviceInfo.isDesktop) {
    return (
      <div className="space-y-2 mb-4">
        <Alert className="border-purple-200 bg-purple-50">
          <Monitor className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 ml-2">
            <strong>桌面用户提示：</strong> 建议安装 <strong>MetaMask 浏览器扩展</strong>，或使用 <strong>WalletConnect</strong> 连接方式（使用手机扫描二维码）。
          </AlertDescription>
        </Alert>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 ml-2">
            支持 <strong className="whitespace-nowrap">Chrome、Edge、Firefox</strong> 等现代浏览器，暂不支持 IE 浏览器。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

export default WalletConnectionGuide;
