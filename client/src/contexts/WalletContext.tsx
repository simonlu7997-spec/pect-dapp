import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { trpc } from '@/lib/trpc';

interface SiweUser {
  address: string;
  name: string;
  userId: number;
}

interface WalletContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSignedIn: boolean;         // 是否已完成 SIWE 签名登录
  siweUser: SiweUser | null;   // 当前登录用户信息
  shortAddress: string | null;
  connectWallet: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  disconnectWallet: () => void;
  signIn: () => Promise<void>; // SIWE 签名登录
  signOut: () => Promise<void>;
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
  const [siweUser, setSiweUser] = useState<SiweUser | null>(null);

  // tRPC mutations
  const getNonceMutation = trpc.siweAuth.getNonce.useMutation();
  const verifyMutation = trpc.siweAuth.verify.useMutation();
  const logoutMutation = trpc.siweAuth.logout.useMutation();

  // 查询当前登录状态
  const { data: meData, refetch: refetchMe } = trpc.siweAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (meData) {
      setSiweUser(meData);
    } else {
      setSiweUser(null);
    }
  }, [meData]);

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
        const bal = await newProvider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(bal));
      }
    } catch (error) {
      console.error('恢复 MetaMask 连接失败:', error);
    }
  };

  // 恢复 WalletConnect 连接
  const restoreWalletConnectConnection = async () => {
    try {
      const wcProvider = await EthereumProvider.init({
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [1, 137, 56],
        showQrModal: false,
      });
      if (wcProvider.connected) {
        const accounts = wcProvider.accounts;
        if (accounts.length > 0) {
          const ethersProvider = new ethers.BrowserProvider(wcProvider);
          const s = await ethersProvider.getSigner();
          setAccount(accounts[0]);
          setProvider(ethersProvider);
          setSigner(s);
          setConnectionMethod('walletconnect');
          const bal = await ethersProvider.getBalance(accounts[0]);
          setBalance(ethers.formatEther(bal));
        }
      }
    } catch (error) {
      console.error('恢复 WalletConnect 连接失败:', error);
    }
  };

  // MetaMask 连接（仅连接钱包，不自动登录）
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
      const bal = await newProvider.getBalance(address);
      setBalance(ethers.formatEther(bal));
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
      const wcProvider = await EthereumProvider.init({
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [1, 137, 56],
        showQrModal: true,
      });
      await wcProvider.connect();
      const accounts = wcProvider.accounts;
      if (accounts.length > 0) {
        const ethersProvider = new ethers.BrowserProvider(wcProvider);
        const s = await ethersProvider.getSigner();
        setAccount(accounts[0]);
        setProvider(ethersProvider);
        setSigner(s);
        setConnectionMethod('walletconnect');
        localStorage.setItem('walletConnectionMethod', 'walletconnect');
        const bal = await ethersProvider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(bal));
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

  // SIWE 签名登录
  const signIn = useCallback(async () => {
    if (!account || !signer) {
      alert('请先连接钱包');
      return;
    }
    try {
      // 1. 获取 nonce
      const { nonce } = await getNonceMutation.mutateAsync({ address: account });

      // 2. 构建 SIWE 消息（使用 SiweMessage 对象生成标准 EIP-4361 格式）
      // 注意：siwe@3.0.0 的 ABNF 解析器不支持中文字符，statement 必须使用英文
      const { SiweMessage } = await import('siwe');
      const checksumAddress = ethers.getAddress(account);
      const issuedAt = new Date().toISOString();
      const siweMsg = new SiweMessage({
        domain: window.location.host,
        address: checksumAddress,
        statement: 'Sign in to PECT DApp - Solar Power Revenue & Carbon Credit Platform',
        uri: window.location.origin,
        version: '1',
        chainId: 80002,
        nonce,
        issuedAt,
      });
      const message = siweMsg.prepareMessage();

      // 3. 请求钉包签名
      const signature = await signer.signMessage(message);

      // 4. 后端验证签名并签发 JWT
      const result = await verifyMutation.mutateAsync({ message, signature });

      if (result.success) {
        await refetchMe();
      }
    } catch (error: any) {
      console.error('SIWE 登录失败:', error);
      if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
        // 用户拒绝签名，不显示错误
        return;
      }
      alert('登录失败，请重试');
    }
  }, [account, signer, getNonceMutation, verifyMutation, refetchMe]);

  // 登出
  const signOut = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
      setSiweUser(null);
    } catch (error) {
      console.error('登出失败:', error);
    }
  }, [logoutMutation]);

  // 断开钱包连接（同时登出）
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setBalance('0');
    setIsConnecting(false);
    setConnectionMethod(null);
    localStorage.removeItem('walletConnectionMethod');
    // 同时清除 SIWE 登录状态
    logoutMutation.mutate();
    setSiweUser(null);
  };

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
        isSignedIn: !!siweUser,
        siweUser,
        shortAddress: getShortAddress(account),
        connectWallet,
        connectWalletConnect,
        disconnectWallet,
        signIn,
        signOut,
        balance,
        connectionMethod,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
};
