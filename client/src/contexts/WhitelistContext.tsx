import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WhitelistEntry {
  id: string;
  walletAddress: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  investmentAmount: string;
  investmentCurrency: string;
  status: 'pending' | 'approved' | 'rejected';
  isKycVerified: boolean;
  isSenderWhitelisted: boolean;
  submittedAt: string;
  approvedAt?: string;
}

interface WhitelistContextType {
  // 状态
  whitelistEntries: WhitelistEntry[];
  isLoading: boolean;
  error: string | null;
  
  // 操作
  addWhitelistEntry: (entry: Omit<WhitelistEntry, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  updateWhitelistEntry: (id: string, updates: Partial<WhitelistEntry>) => Promise<void>;
  removeWhitelistEntry: (id: string) => Promise<void>;
  getWhitelistEntry: (walletAddress: string) => WhitelistEntry | undefined;
  fetchWhitelistEntries: () => Promise<void>;
  clearError: () => void;
}

const WhitelistContext = createContext<WhitelistContextType | undefined>(undefined);

export const WhitelistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从本地存储加载白名单数据
  useEffect(() => {
    const loadWhitelistData = () => {
      try {
        const stored = localStorage.getItem('pect_whitelist_entries');
        if (stored) {
          setWhitelistEntries(JSON.parse(stored));
        }
      } catch (err) {
        console.error('加载白名单数据失败:', err);
      }
    };

    loadWhitelistData();
  }, []);

  // 保存白名单数据到本地存储
  const saveToLocalStorage = (entries: WhitelistEntry[]) => {
    try {
      localStorage.setItem('pect_whitelist_entries', JSON.stringify(entries));
    } catch (err) {
      console.error('保存白名单数据失败:', err);
    }
  };

  // 添加白名单条目
  const addWhitelistEntry = async (entry: Omit<WhitelistEntry, 'id' | 'status' | 'submittedAt'>) => {
    setIsLoading(true);
    setError(null);

    try {
      // 检查钱包地址是否已存在
      const existing = whitelistEntries.find(
        (e) => e.walletAddress.toLowerCase() === entry.walletAddress.toLowerCase()
      );

      if (existing) {
        throw new Error('该钱包地址已在白名单中');
      }

      const newEntry: WhitelistEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      const updated = [...whitelistEntries, newEntry];
      setWhitelistEntries(updated);
      saveToLocalStorage(updated);

      // 这里可以调用后端 API 来保存数据
      // await fetch('/api/whitelist', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newEntry),
      // });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加白名单条目失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 更新白名单条目
  const updateWhitelistEntry = async (id: string, updates: Partial<WhitelistEntry>) => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = whitelistEntries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );

      setWhitelistEntries(updated);
      saveToLocalStorage(updated);

      // 这里可以调用后端 API 来更新数据
      // await fetch(`/api/whitelist/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updates),
      // });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新白名单条目失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 删除白名单条目
  const removeWhitelistEntry = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = whitelistEntries.filter((entry) => entry.id !== id);
      setWhitelistEntries(updated);
      saveToLocalStorage(updated);

      // 这里可以调用后端 API 来删除数据
      // await fetch(`/api/whitelist/${id}`, {
      //   method: 'DELETE',
      // });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除白名单条目失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 获取特定钱包的白名单条目
  const getWhitelistEntry = (walletAddress: string) => {
    return whitelistEntries.find(
      (entry) => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  };

  // 获取所有白名单条目
  const fetchWhitelistEntries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 这里可以调用后端 API 来获取数据
      // const response = await fetch('/api/whitelist');
      // const data = await response.json();
      // setWhitelistEntries(data);
      
      // 目前使用本地存储的数据
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取白名单数据失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除错误信息
  const clearError = () => {
    setError(null);
  };

  const value: WhitelistContextType = {
    whitelistEntries,
    isLoading,
    error,
    addWhitelistEntry,
    updateWhitelistEntry,
    removeWhitelistEntry,
    getWhitelistEntry,
    fetchWhitelistEntries,
    clearError,
  };

  return (
    <WhitelistContext.Provider value={value}>
      {children}
    </WhitelistContext.Provider>
  );
};

export const useWhitelist = () => {
  const context = useContext(WhitelistContext);
  if (!context) {
    throw new Error('useWhitelist must be used within WhitelistProvider');
  }
  return context;
};
