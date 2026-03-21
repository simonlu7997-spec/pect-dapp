import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

interface WalletContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  isConnecting: boolean;
  shortAddress: string | null;
  connectWallet: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnectWallet: () => void;
  balance: string;
  connectionMethod: 'metamask' | 'walletconnect' | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'metamask' | 'walletconnect' | null>(null);

  // 从 localStorage 恢复连接状态
  useEffect(() => {
    const savedMethod = localStorage.getItem('walletConnectionMethod') as 'metamask' | 'walletconnect' | null;
    if (savedMethod === 'walletconnect') {
      restoreWalletConnectConnection();
    } else if (savedMethod === 'metamask' && window.ethereum) {
      restoreMetaMaskConnection();
    }
  }, []);

  // 恢复 MetaMask 连接
  const restoreMetaMaskConnection = async () => {
    try {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await newProvider.getSigner();
        setAccount(accounts[0]);
        setProvider(newProvider);
        setSigner(newSigner);
        setConnectionMethod('metamask');
        
        const balance = await newProvider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(balance));
      }
    } catch (error) {
      console.error('恢复 MetaMask 连接失败:', error);
    }
  };

  // 恢复 WalletConnect 连接
  const restoreWalletConnectConnection = async () => {
    try {
      const provider = await EthereumProvider.init({
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [1, 137, 56], // Ethereum, Polygon, BSC
        showQrModal: false,
      });

      if (provider.connected) {
        const accounts = provider.accounts;
        if (accounts.length > 0) {
          const ethersProvider = new ethers.BrowserProvider(provider);
          const signer = await ethersProvider.getSigner();
          setAccount(accounts[0]);
          setProvider(ethersProvider);
          setSigner(signer);
          setConnectionMethod('walletconnect');

          const balance = await ethersProvider.getBalance(accounts[0]);
          setBalance(ethers.formatEther(balance));
        }
      }
    } catch (error) {
      console.error('恢复 WalletConnect 连接失败:', error);
    }
  };

  // MetaMask 连接
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
      setConnectionMethod('metamask');
      localStorage.setItem('walletConnectionMethod', 'metamask');

      // 获取余额
      const balance = await newProvider.getBalance(address);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('连接 MetaMask 失败:', error);
      alert('连接 MetaMask 失败，请重试');
    } finally {
      setIsConnecting(false);
    }
  };

  // WalletConnect 连接
  const connectWalletConnect = async () => {
    try {
      setIsConnecting(true);
      const provider = await EthereumProvider.init({
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [1, 137, 56], // Ethereum, Polygon, BSC
        showQrModal: true,
      });

      await provider.connect();

      const accounts = provider.accounts;
      if (accounts.length > 0) {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        
        setAccount(accounts[0]);
        setProvider(ethersProvider);
        setSigner(signer);
        setConnectionMethod('walletconnect');
        localStorage.setItem('walletConnectionMethod', 'walletconnect');

        // 获取余额
        const balance = await ethersProvider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(balance));
      }
    } catch (error) {
      console.error('连接 WalletConnect 失败:', error);
      if ((error as any).code !== 'USER_REJECTED_REQUEST') {
        alert('连接 WalletConnect 失败，请重试');
      }
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
    setConnectionMethod(null);
    localStorage.removeItem('walletConnectionMethod');
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
        connectWalletConnect,
        disconnectWallet,
        balance,
        connectionMethod,
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
