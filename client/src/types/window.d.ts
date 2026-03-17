/**
 * Window 类型扩展
 * 用于支持 MetaMask 等钱包提供的 window.ethereum 对象
 */

/**
 * EthereumProvider 接口
 * 定义了 MetaMask 和其他 EIP-1193 兼容钱包的标准接口
 */
interface EthereumProvider {
  /**
   * 发送 JSON-RPC 请求
   * @param args 包含 method 和可选的 params
   * @returns 返回 Promise 的响应
   */
  request: (args: { method: string; params?: any[] }) => Promise<any>;

  /**
   * 监听事件
   * @param event 事件名称（如 'accountsChanged', 'chainChanged', 'connect', 'disconnect'）
   * @param callback 回调函数
   */
  on: (event: string, callback: (...args: any[]) => void) => void;

  /**
   * 移除事件监听
   * @param event 事件名称
   * @param callback 回调函数
   */
  removeListener: (event: string, callback: (...args: any[]) => void) => void;

  /**
   * 检查是否已连接
   */
  isConnected?: () => boolean;

  /**
   * 检查是否是 MetaMask
   */
  isMetaMask?: boolean;

  /**
   * 检查是否是 WalletConnect
   */
  isWalletConnect?: boolean;

  /**
   * 当前连接的账户列表
   */
  selectedAddress?: string | null;

  /**
   * 当前连接的链 ID
   */
  chainId?: string;

  /**
   * 网络 ID
   */
  networkVersion?: string;
}

/**
 * 扩展 Window 接口以包含 ethereum 属性
 */
declare global {
  interface Window {
    /**
     * MetaMask 或其他 EIP-1193 兼容钱包提供的对象
     */
    ethereum?: EthereumProvider;
  }
}

/**
 * 确保这个文件被视为模块
 */
export {};
