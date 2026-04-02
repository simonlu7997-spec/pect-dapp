# PECT DApp TODO

## 已完成

- [x] 项目初始化（React + tRPC + MySQL + Manus Auth）
- [x] SIWE 钱包签名登录（MetaMask / WalletConnect）
- [x] 导航栏登录状态显示（钱包地址、登出按钮、下拉菜单）
- [x] 首页（Hero、代币分布、Oracle 数据、电站列表、FAQ）
- [x] KYC 白名单申请表单（用户端）
  - [x] 字段验证（姓名、邮箱、电话、国家、投资金额、钱包地址）
  - [x] 提交后显示审核状态（pending/approved/rejected）
  - [x] 重复申请检测（已 pending 提示等待，已 rejected 允许重新申请）
  - [x] 申请状态实时查询（含链上交易哈希链接）
- [x] KYC 管理后台（/admin/kyc）
  - [x] 申请列表（支持状态筛选、搜索）
  - [x] 统计卡片（总数、待审核、已通过、已拒绝）
  - [x] 展开查看申请详情
  - [x] 审核通过（调用合约上链，addKyc + addSenderWhitelist）
  - [x] 审核拒绝（填写拒绝原因）
  - [x] 权限保护（仅 admin 角色可访问）
- [x] 后端 API 重构
  - [x] whitelist.submit：只写数据库（pending），不直接上链
  - [x] whitelist.approve：管理员审核通过并调用合约
  - [x] whitelist.reject：管理员拒绝并记录原因
  - [x] whitelist.listApplications：管理员查看申请列表
  - [x] whitelist.checkStatus：查询申请状态（含链上状态）
- [x] Manus 部署修复（dist/index.js 输出）

## 待完成

- [x] 导航栏为管理员角色添加后台入口下拉菜单- [x] 接入 Resend 邮件服务，审核通过/拒绝名后自动发送邮件通知申请人

- [ ] PV-Coin 分红查询页面
- [ ] C2-Coin 质押功能
- [ ] 代币购买流程（私募轮）
- [ ] 绑定自定义域名 pect-dapp.io
- [ ] 管理后台：分红数据管理
- [ ] 管理后台：质押数据管理
