export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 已移除 Manus OAuth 登录，统一使用钱包签名（MetaMask/WalletConnect）
// 未登录时跳转到首页，引导用户连接钱包
export const getLoginUrl = () => "/";
