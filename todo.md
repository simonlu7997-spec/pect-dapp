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
- [x] 管理后台：电站管理页面（/admin/stations）- 动态维护电站名称、容量、位置、发电量
- [x] 首页电站表格动态化：从数据库读取电站数据（stationsPublic.list 路由）
- [x] 分红管理页面：一键触发链上分红按钮（triggerDistributeRevenue，调用 RevenueDistributor 合约）
- [x] 分红管理页面：一键发放质押奖励按钮（triggerDistributeStakingReward，调用 StakingManager 合约）
- [x] 链上操作历史表格：记录并展示所有管理员发起的链上操作（交易哈希、状态、金额、备注）
- [x] 修复路由注册：/stake 指向旧版 Stake.tsx，改为 Staking.tsx；注册 /revenue 和 /airdrop 路由
- [x] 修复 Navbar：添加分红页面（/revenue）和空投页面（/airdrop）导航入口
- [x] 公募购买功能：后端添加 getPublicSaleInfo 路由，前端 Buy.tsx 公募 Tab 实现完整购买流程
- [x] C2-Coin 空投：新增空投领取和查询功能（后端路由 + 前端页面 /airdrop）
- [x] 修复电站管理新增表格输入限制（只能填一个字母）
- [x] Portfolio 页面整合 PV-Coin/C2-Coin/分红/质押汇总视图及近期操作状态
- [x] 空投页与质押页合并为单一页面（/staking）
- [x] 管理员链上操作成功后推送 notifyOwner 通知（金额、交易哈希、时间）
- [x] 用户购买/领取分红/质押奖励后推送 notifyOwner 通知，Portfolio 展示近期操作状态
- [x] 空投和质押页面分开，空投页新增"空投历史"Tab
- [x] 资产页：对调"可领取空投"和"待领取质押奖励"卡片顺序，对调"领取C2空投"和"领取质押奖励"按钮顺序
- [x] 资产页：将"质押/空投"按钮拆分为独立的"质押"和"空投"两个按钮
- [ ] 空投历史从Tab改为空投页面下方直接展示
- [ ] 资产页快捷按钮顺序改为：分红管理、C2空投、质押C2C
- [ ] 实现每月自动空投定时任务（calculateRewardsBatch）
- [ ] 添加管理后台手动触发空投计算入口
- [ ] 添加空投任务执行日志记录
- [ ] 编写空投定时任务测试用例
- [ ] 实现每月自动质押奖励定时任务（startMonthlyReward，每月1日00:00）
- [ ] 实现每月自动分红定时任务（distributeRevenue，每月1日00:10）
- [ ] 添加管理后台手动触发质押奖励和分红的入口
- [ ] 编写质押奖励和分红定时任务测试用例

## 2026-04-03 新增任务

- [x] 分红管理页面新增「累计质押奖励（链上）」统计卡片
- [x] 月度定时任务执行后推送 notifyOwner 执行摘要（质押奖励+分红+空投提示，每月 1 日 00:20 UTC+8）

- [x] 管理后台空投页面：添加"立即触发空投计算"按钮和执行历史表格
- [x] 分红管理页面(/admin/revenue)：添加「手动触发质押奖励」和「手动触发分红」按钮及执行历史表格
- [x] 质押奖励金额独立配置：数据库新增 stakingRewardAmount 字段，管理员可单独输入，定时任务优先读取该字段
- [x] GitHub Actions CI：前端测试流水线（每次 push 自动运行 pnpm test）
- [x] GitHub Actions CI：合约 ABI 自动同步（合约代码变更时运行 sync-abi.cjs 并提交到前端仓库）
