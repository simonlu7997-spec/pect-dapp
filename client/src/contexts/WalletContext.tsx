import React, { createContext, useContext, useState } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  isConnecting: boolean;
  shortAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  balance: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      if (!window.ethereum) {
        alert('请安装 MetaMask 或其他以太坊钱包');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const address = accounts[0];

      setAccount(address);
      setProvider(newProvider);
      setSigner(newSigner);

      // 获取余额
      const balance = await newProvider.getBalance(address);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('连接钱包失败:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setBalance('0');
    setIsConnecting(false);
  };

  /**
   * 获取缩短的地址（显示前 6 位和后 4 位）
   * 例如：0x5FbD...aa3
   */
  const getShortAddress = (addr: string | null): string | null => {
    if (!addr) return null;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        provider,
        signer,
        isConnected: !!account,
        isConnecting,
        shortAddress: getShortAddress(account),
        connectWallet,
        disconnectWallet,
        balance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

/**
 * Hook: 使用钱包上下文
 * @throws 如果在 WalletProvider 外部使用会抛出错误
 * @returns 钱包上下文对象
 */
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

/**
 * Hook: 使用钱包上下文（别名）
 * 与 useWallet 功能相同，提供更明确的命名
 * @throws 如果在 WalletProvider 外部使用会抛出错误
 * @returns 钱包上下文对象
 */
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
};
