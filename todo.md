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

## 2026-04-03 新增任务（二）

- [x] 月度执行摘要 notifyOwner：将空投执行结果（地址数、批次数、状态）从数据库读取后一并汇总到通知内容，替换原有「请到管理后台确认」提示

## 2026-04-03 Bug 修复

- [ ] IE 浏览器（Windows）SIWE 登录失败：Failed to fetch 错误，排查并修复兼容性问题
- [x] Edge 浏览器 OAuth 登录失败：将 OAuth Cookie sameSite 从 "none" 改为 "lax"，兼容 Edge 增强隐私保护
- [x] 在连接钱包提示区域添加「推荐使用 Chrome 浏览器，暂不支持 IE」提示
- [x] Edge 浏览器登录失败：将 Cookie sameSite 从 "none" 改为 "strict"，解决 Edge 增强隐私保护阻止 Cookie 的问题
- [x] 连接钱包提示区域：补充 Edge 浏览器同样支持的说明，避免用户误解

## 2026-04-04 新增任务

- [x] C2Coin 空投第一阶段（issue）自动化：carbonAmount = 上月发电量 × 0.785 / 1000，在 airdropScheduler 中自动调用
- [x] 管理后台分红管理页面：添加 deployer 账户 USDT 余额 & allowance 检测卡片
- [x] 调整合约最小奖励阈值：C2Coin 改为 0.1 C2Coin（10^5），分红改为 0.01 USDT（10^4）

## 2026-04-04 新增任务（二）

- [x] 分红定时任务执行前检测 deployer USDT 余额和 allowance，不足时提前终止并推送告警通知
- [x] 质押奖励定时任务执行前检测 deployer USDT 余额和 allowance，不足时提前终止并推送告警通知
- [x] 扩展 getDeployerBalance 路由，同时返回质押奖励合约（StakingManager）的 USDT 余额和 allowance
- [x] 管理后台分红管理页面：deployer 余额检测卡片新增「一键 Approve 分红合约」和「一键 Approve 质押奖励合约」按钮
- [x] 修复 ABI 函数名错误：minThreshold → minRewardThreshold，定时任务初始化阶段不再报错

## 2026-04-04 新增任务（三）

- [x] 将前端 USDT 合约地址更新为 Amoy tUSDT（0xf889dfa134E8fa22562fC40119e1B3CD2376aD94），正式上线主网时再改回
- [x] 购买页面所有 UI 文字标签改为动态读取 TOKEN_CONFIG.USDT.symbol（当前显示 tUSDT，主网改回后自动变为 USDT）

## 2026-04-04 Bug 修复（二）

- [x] 购买页面 tUSDT 余额显示不足——根本原因：后端 SaleABI 全部函数名错误（tokenPrice/totalRaised/hardCap/minPurchase/maxPurchase/isActive/buy 均不存在），导致 Promise.all revert 返回余额 0；已全量重写为合约实际函数名，并修正 exchangeRate 精度计算（除以 10^6），链上验证通过

## 2026-04-04 新增任务（四）

- [x] 升级 PublicSale.sol，添加白名单功能（addToWhitelist/removeFromWhitelist/isWhitelisted）
- [x] 部署升级后的 PublicSale v2 到 Amoy 测试网，地址: 0x44F8E4C74caC9196DF8038041A64716081Ba04e1
- [x] 同步 PublicSale ABI 到 DApp，更新环境变量 VITE_PUBLIC_SALE_ADDRESS 和 PUBLIC_SALE_ADDRESS
- [x] KYC 审核通过时同时调用 PrivateSale 和 PublicSale 的 addToWhitelist
- [x] 修复 rewardScheduler.ts 中调用不存在的 setMinRewardThreshold 函数导致的启动告警
- [x] 公募购买页面添加 KYC 状态检测，未通过 KYC 时显示提示并引导到白名单申请页，购买按鈕加入 KYC 校验
- [x] KYC 拒绝时同时调用 PrivateSale 和 PublicSale 的 removeFromWhitelist（已在 whitelist.ts reject 路由中完成）

## 2026-04-04 新增任务（五）

- [x] 管理后台分红管理页面：添加 PVC 充値卡片，显示 deployer/私募/公募合约 PVC 余额，支持一键充値对话框

## 2026-04-04 新增任务（六）

- [x] 为公募购买流程补充 vitest 测试用例：白名单校验 + 合约调用失败降级逻辑（共 35 个新增测试，118/118 全部通过）

## 2026-04-04 移除 Manus OAuth

- [x] 移除后端 OAuth 相关代码（oauth.ts、sdk.ts 中的 OAuthService、index.ts 中的 registerOAuthRoutes）
- [x] 简化 context.ts：只保留 SIWE JWT 验证，删除 sdk.authenticateRequest
- [x] 合并 auth.me 与 siweAuth.me：auth.me 改为读取 siwe_token，统一鉴权入口
- [x] 更新 auth.logout：清除 siwe_token 而非 app_session_id
- [x] 更新前端 useAuth hook：auth.me 返回 SIWE 用户
- [x] 更新 DashboardLayout：移除 OAuth 登录跳转，改为引导连接钱包
- [x] 更新 main.tsx：移除 redirectToLoginIfUnauthorized 的 OAuth 跳转
- [x] 清理 client/src/const.ts 中的 getLoginUrl
- [x] 更新测试用例中的断言（logout 改清 siwe_token，119/119 测试通过）

## 2026-04-04 Bug 修复（三）

- [x] 购买 PVC 第二步失败：根本原因是 VITE_USDT_ADDRESS/USDT_ADDRESS 配置的是主网 USDT，但合约内部使用 Amoy tUSDT（地址不一致导致 allowance=0）；已将两个环境变量更新为 0xf889dfa134E8fa22562fC40119e1B3CD2376aD94

## 2026-04-04 后续优化（四）

- [x] 验证 PrivateSale 合约内部 USDT 地址与 VITE_USDT_ADDRESS 一致（链上查询确认）
- [x] 将 WalletContext 中的 siweAuth.me 改为 auth.me，删除冗余路由
- [x] 为 siweAuth.verify 补充单元测试（19 个新增测试，138/138 全部通过）

## 2026-04-04 Bug 修复（四）

- [ ] 公募购买第二步仍然失败：授权成功但 buy() 调用失败，排查真实原因

## 2026-04-04 Bug 修复（五）

- [x] 公募 depositPVC 充值失败：PVCoin 合约要求接收方在 KYC 白名单中，已在 depositPvcToSale 路由中自动检查并调用 addKyc/addSenderWhitelist（138/138 测试通过）

## 2026-04-04 功能增强（六）

- [x] whitelist.ts approve 路由同步调用 pvCoin.addKyc(walletAddress)，确保 KYC 通过用户可购买 PVC（已实现，仅 todo.md 未同步）

## 2026-04-06 Bug 修复（十五）

- [x] 私募购买仍然报错“您的钉包地址未通过 KYC 白名单验证”：私募购买按鈕 disabled 条件用的是 !kycStatus?.isKycVerified（漏修复），已改为 === false；同时修复私募和公募 KYC 状态显示，加载中显示 spinner，null 时显示查询失败提示而非误报未通过 KYC

## 2026-04-06 功能增强（十四）

- [x] 私募和公募购买成功后自动跳转到购买历史页面（延迟 2 秒，让用户看到成功提示）

## 2026-04-06 功能增强（十三）

- [x] 删除资产总览页面的"购买记录"TAB，改为快捷操作区的"购买历史"跳转按钮，保留"近期操作"和"全部交易"TAB

## 2026-04-06 功能增强（十二）

- [x] 授权步骤旁增加无限额说明：本次授权为无限额，后续购买无需重复操作
- [x] 添加购买历史记录页面，展示用户所有历史购买记录、交易哈希和状态；已加入导航菜单“我的资产” → 购买历史

## 2026-04-06 Bug 修复（十一）

- [x] 授权后购买失败，下次进入页面仍需重新授权：将 currentAllowance 改为 BigInt 存储和比较，避免 MaxUint256 的浮点精度溢出；已授权时显示“无限额”，页面加载前不强制显示授权按钮

## 2026-04-06 Bug 修复（十）

- [x] 授权成功后过一段时间需要重新授权：根本原因是授权金额等于输入金额，购买后 allowance 被消耗为 0。已改为授权 MaxUint256，一次授权永久有效

## 2026-04-06 Bug 修复（九）

- [x] 私募购买授权成功后报错“您的钉包地址未通过 KYC 白名单验证”：根本原因是 RPC 偶发超时导致 checkStatus 返回 isKycVerified:false，已修复为返回 null 并增加重试；同时修复按鈕 disabled 条件和 ERC20InsufficientAllowance 自定义错误识别

## 2026-04-06 Bug 修复（八）

- [x] 公募购买授权成功后报错“您的钉包地址未通过 KYC 白名单验证”：根本原因是 PublicSale v2 合约地址未加入 PVCoin senderWhitelist，导致合约向用户转账 PVC 时 revert "Sender not whitelisted"，已手动添加并修复 depositPvcToSale 路由自动同步

## 2026-04-05 Bug 修复（七）

- [x] 登录后需要刷新页面才能显示登录成功状态：verify 成功后立即调用 setSiweUser，无需等待 invalidate 异步完成
- [x] 购买 PVC 授权成功但购买失败：根本原因是用户钉包地址未加入合约白名单（Not whitelisted），已手动添加白名单并完善错误提示文案

## 2026-04-08 全面修复"我的资产"数量字段显示

- [ ] 资产总览：PV-Coin 持仓（pvBalance）
- [ ] 资产总览：C2-Coin 持仓（c2Balance）
- [ ] 资产总览：累计分红（totalDividend）
- [ ] 资产总览：累计质押奖励（totalStakingReward）
- [ ] 资产总览：近期操作统计
- [ ] 质押页面：C2Coin 余额、已质押数量、待领取奖励
- [ ] 分红页面：可领取分红金额、历史分红记录
- [ ] 空投页面：可领取空投数量、空投历史
- [ ] 购买历史：累计获得 PVC（已修复 pvcAmount 字段）

## 2026-04-14 新增功能

- [x] 管理后台增加"批量同步白名单"按钮：一键将所有已审批 KYC 用户重新同步到 Sale 合约
- [x] KYC 列表中显示 Sale 白名单状态：管理员可直观看到每个用户是否已在私募/公募白名单中

## 2026-04-14 多月份分红领取

- [x] 后端新增 getAllMonthlyRevenue 接口：遇历所有历史分红月份，返回每月可领取金额和是否已领取
- [x] 前端 Revenue.tsx 改造：展示多月份分红列表，支持逐月领取

## 2026-04-14 资产总览分红卡片修复

- [x] 资产总览"待领取分红"卡片改用多月份合计金额，与分红领取页保持一致

## 2026-04-14 C2 空投领取后数据不更新修复

- [x] 领取 C2C 后"可领取空投"数量不归零（前端未刷新 getAirdropInfo）
- [x] "空投概况"中"已领取总量"不更新（合约查询逻辑或刷新缺失）

## 2026-04-14 质押管理页面修复

- [ ] 质押管理页面显示 C2C 余额数量
- [ ] 质押管理页面添加领取质押奖励按钮
