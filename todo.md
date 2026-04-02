# PECT DApp TODO

## 已完成

- [x] 项目初始化（React + tRPC + MySQL + Manus Auth）
- [x] SIWE 钱包签名登录（MetaMask / WalletConnect）
- [x] 导航栏登录状态显示（钱包地址、登出按钮、下拉菜单）
- [x] 首页（Hero、代币分布、Oracle 数据、电站列表、FAQ）
- [x] KYC 白名单申请表单（用户端）
- [x] KYC 管理后台（/admin/kyc）：申请列表、审核通过/拒绝、合约上链
- [x] 后端 API 重构（submit 只写数据库，approve/reject 管理员操作）
- [x] Manus 部署修复（dist/index.js 输出）
- [x] 导航栏为管理员角色添加后台入口下拉菜单（KYC 审核 + 分红管理）
- [x] 接入 Resend 邮件服务，审核通过/拒绝后自动发送邮件通知申请人
- [x] 私募轮代币购买流程：USDT 授权 + PrivateSale 合约调用 + 交易状态追踪
- [x] PV-Coin 分红查询与一键领取（RevenueDistributor.claim）
- [x] 资产页完善购买历史列表（USDT 金额、PVC 数量、交易哈希、确认状态）
- [x] C2-Coin 质押/解质押功能（StakingManager 合约接入）
- [x] 配置合约地址环境变量（VITE_STAKING_MANAGER_ADDRESS、VITE_C2_COIN_ADDRESS、VITE_REVENUE_DISTRIBUTOR_ADDRESS）
- [x] 管理后台：分红数据管理页面（/admin/revenue）含质押统计面板

## 待完成

- [ ] 绑定自定义域名 pect-dapp.io
- [x] 交易确认状态自动轮询（后端定时任务，pending → confirmed/failed，每 60 秒）
- [x] 后端定时轮询任务：pending 交易自动更新为 confirmed/failed（每 60 秒）
- [x] 首页 Oracle 数据动态化：从 revenue_records 读取真实分红数据
- [x] 修复管理后台菜单不显示：SIWE 登录用户的 role 字段未传递到前端
- [x] 修复管理后台页面权限检查：同时支持 SIWE 钱包 admin 用户访问（前端 AdminKyc/AdminRevenue + 后端 context.ts SIWE fallback）
