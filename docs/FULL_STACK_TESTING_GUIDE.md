# PECT DApp 全栈测试指南

## 📋 目录

1. [环境准备](#环境准备)
2. [前端测试](#前端测试)
3. [后端测试](#后端测试)
4. [集成测试](#集成测试)
5. [智能合约测试](#智能合约测试)
6. [性能测试](#性能测试)
7. [安全测试](#安全测试)
8. [故障排除](#故障排除)

---

## 🔧 环境准备

### 前置要求

- ✅ Node.js 18+
- ✅ npm 或 pnpm
- ✅ MetaMask 浏览器扩展
- ✅ Polygon Amoy 测试网络配置
- ✅ 测试 MATIC 代币（从水龙头获取）
- ✅ Git 和 GitHub 账户

### 环境变量配置

#### 本地开发环境（.env.local）

```bash
# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# RPC 配置
VITE_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
VITE_NETWORK_NAME=Polygon Amoy
VITE_EXPLORER_URL=https://amoy.polygonscan.com

# 智能合约地址（从部署输出获取）
VITE_PV_COIN_ADDRESS=0x...
VITE_C2_COIN_ADDRESS=0x...
VITE_REVENUE_DISTRIBUTOR_ADDRESS=0x...
VITE_STAKING_MANAGER_ADDRESS=0x...
VITE_C2_COIN_BUYBACK_ADDRESS=0x...
VITE_PRIVATE_SALE_ADDRESS=0x...
VITE_PUBLIC_SALE_ADDRESS=0x...
VITE_ORACLE_ADDRESS=0x...

# Chainlink 配置
VITE_CHAINLINK_ORACLE_ADDRESS=0x...
VITE_CHAINLINK_RMB_USDT_FEED=0x...
VITE_CHAINLINK_C2COIN_FEED=0x...
VITE_CHAINLINK_PVCOIN_FEED=0x...

# 代币配置
VITE_USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748Aeb04B58e8F
```

#### 生产环境（Vercel Secrets）

在 Vercel 项目设置中配置相同的环境变量

---

## 🎨 前端测试

### 1. 页面加载测试

#### 测试场景 1.1：首页加载

```
步骤：
1. 打开 https://pect-dapp-YOUR_USERNAME.vercel.app
2. 等待页面完全加载
3. 检查所有元素是否正确显示

预期结果：
✅ 页面在 3 秒内加载完成
✅ 所有图片和样式正确显示
✅ 导航栏可见且可交互
✅ 没有 JavaScript 错误
```

#### 测试场景 1.2：页面响应式设计

```
步骤：
1. 打开浏览器开发者工具（F12）
2. 点击"切换设备工具栏"（Ctrl+Shift+M）
3. 测试不同屏幕尺寸：
   - 手机（375px）
   - 平板（768px）
   - 桌面（1920px）

预期结果：
✅ 所有页面在各个尺寸下都能正确显示
✅ 导航菜单在移动设备上可折叠
✅ 按钮和输入框在所有尺寸下都可点击
```

### 2. 导航测试

#### 测试场景 2.1：导航菜单

```
步骤：
1. 点击导航栏中的每个菜单项：
   - 购买
   - 资产
   - 质押
   - 数据分析
2. 验证页面是否正确切换

预期结果：
✅ 每个菜单项都能正确导航
✅ 当前页面在导航栏中高亮显示
✅ 页面 URL 正确更新
✅ 浏览器返回按钮正常工作
```

#### 测试场景 2.2：移动菜单

```
步骤：
1. 在移动设备或缩小浏览器窗口
2. 点击汉堡菜单（三条线）
3. 点击各个菜单项
4. 点击 X 关闭菜单

预期结果：
✅ 菜单正确打开和关闭
✅ 点击菜单项后自动关闭
✅ 所有菜单项都可访问
```

### 3. 钱包连接测试

#### 测试场景 3.1：连接钱包

```
步骤：
1. 打开网站
2. 点击"连接钱包"按钮
3. 在 MetaMask 弹窗中确认连接
4. 选择要连接的账户
5. 点击"连接"

预期结果：
✅ MetaMask 弹窗正确显示
✅ 连接后按钮显示钱包地址（缩短格式）
✅ 地址格式正确（0x5FbD...aa3）
✅ 浏览器控制台无错误
```

#### 测试场景 3.2：断开钱包

```
步骤：
1. 连接钱包后
2. 点击钱包地址旁的"断开"按钮
3. 确认断开

预期结果：
✅ 按钮恢复为"连接钱包"
✅ 所有需要钱包的功能被禁用
✅ 浏览器控制台无错误
```

#### 测试场景 3.3：账户切换

```
步骤：
1. 连接钱包
2. 打开 MetaMask
3. 切换到不同的账户
4. 返回网站

预期结果：
✅ 网站自动检测到账户变化
✅ 显示新账户的地址
✅ 用户余额和资产更新
```

#### 测试场景 3.4：网络切换

```
步骤：
1. 连接钱包
2. 打开 MetaMask
3. 切换到不同的网络（如 Ethereum 主网）
4. 返回网站

预期结果：
✅ 网站检测到网络变化
✅ 页面刷新以使用新网络
✅ 显示正确的网络名称
```

### 4. 表单交互测试

#### 测试场景 4.1：购买页面表单

```
步骤：
1. 导航到"购买"页面
2. 输入购买数量
3. 查看计算结果
4. 点击"购买"按钮

预期结果：
✅ 输入框接受数字输入
✅ 实时显示计算结果
✅ 购买按钮在连接钱包前被禁用
✅ 购买按钮在连接钱包后可用
```

#### 测试场景 4.2：表单验证

```
步骤：
1. 在购买页面尝试输入无效值：
   - 负数
   - 非数字字符
   - 超过最大限额
2. 查看验证消息

预期结果：
✅ 无效输入被拒绝或显示错误信息
✅ 错误消息清晰易懂
✅ 用户知道如何修正
```

### 5. 错误处理测试

#### 测试场景 5.1：网络错误

```
步骤：
1. 打开浏览器开发者工具
2. 在 Network 标签中模拟离线
3. 尝试执行任何操作

预期结果：
✅ 显示"网络连接失败"错误
✅ 提供重试选项
✅ 不会导致应用崩溃
```

#### 测试场景 5.2：钱包错误

```
步骤：
1. 尝试在 MetaMask 未登录时连接
2. 尝试在网络不匹配时执行交易
3. 尝试余额不足时进行交易

预期结果：
✅ 显示相应的错误消息
✅ 错误消息指导用户如何解决
✅ 应用保持稳定
```

### 6. 性能测试

#### 测试场景 6.1：页面加载时间

```
步骤：
1. 打开浏览器开发者工具
2. 点击 Performance 标签
3. 点击"开始录制"
4. 刷新页面
5. 等待页面完全加载
6. 停止录制

预期结果：
✅ First Contentful Paint (FCP) < 1.5s
✅ Largest Contentful Paint (LCP) < 2.5s
✅ Cumulative Layout Shift (CLS) < 0.1
```

#### 测试场景 6.2：交互响应时间

```
步骤：
1. 打开 Performance 标签
2. 开始录制
3. 点击各个按钮和链接
4. 停止录制

预期结果：
✅ 按钮点击响应 < 100ms
✅ 页面切换 < 500ms
✅ 没有长时间的卡顿
```

---

## 🔌 后端测试

### 1. API 端点测试

#### 测试场景 1.1：Express 服务器启动

```bash
# 本地开发
npm run dev

# 预期输出
✅ Server running on http://localhost:3000/
✅ 没有错误信息
```

#### 测试场景 1.2：SPA 路由

```bash
# 测试 SPA 路由是否正确返回 index.html

# 测试首页
curl http://localhost:3000/

# 测试其他路由
curl http://localhost:3000/buy
curl http://localhost:3000/portfolio
curl http://localhost:3000/stake
curl http://localhost:3000/analytics

# 预期结果
✅ 所有路由都返回 index.html
✅ 状态码为 200
✅ 返回有效的 HTML 内容
```

#### 测试场景 1.3：静态文件服务

```bash
# 测试静态文件是否正确提供

# 测试 CSS
curl http://localhost:3000/assets/index-*.css

# 测试 JavaScript
curl http://localhost:3000/assets/index-*.js

# 预期结果
✅ 文件正确返回
✅ 状态码为 200
✅ Content-Type 正确
```

### 2. 环境变量测试

#### 测试场景 2.1：环境变量加载

```bash
# 检查环境变量是否正确加载

# 在 Node.js 中测试
node -e "console.log(process.env.VITE_RPC_URL)"

# 预期结果
✅ 显示正确的 RPC URL
✅ 所有必需的变量都已设置
```

#### 测试场景 2.2：环境变量优先级

```bash
# 测试环境变量优先级

# 设置本地变量
export VITE_RPC_URL=http://localhost:8545

# 启动应用
npm run dev

# 预期结果
✅ 使用本地变量而不是 .env 文件中的值
```

### 3. 构建测试

#### 测试场景 3.1：生产构建

```bash
# 构建生产版本
npm run build

# 预期结果
✅ 构建成功完成
✅ 生成 dist/ 目录
✅ 没有构建错误
✅ 输出文件大小合理
```

#### 测试场景 3.2：构建输出验证

```bash
# 检查构建输出
ls -la dist/

# 预期结果
✅ dist/public/ 包含前端文件
✅ dist/index.js 包含后端文件
✅ 所有必需的文件都存在
```

---

## 🔗 集成测试

### 1. 前后端通信测试

#### 测试场景 1.1：页面加载流程

```
步骤：
1. 启动后端服务器
2. 打开浏览器访问网站
3. 打开开发者工具 Network 标签
4. 刷新页面
5. 观察所有网络请求

预期结果：
✅ index.html 返回状态 200
✅ CSS 和 JavaScript 文件正确加载
✅ 所有资源都有正确的 Content-Type
✅ 没有 404 错误
```

#### 测试场景 1.2：SPA 路由导航

```
步骤：
1. 打开网站
2. 打开 Network 标签
3. 点击不同的导航菜单项
4. 观察网络请求

预期结果：
✅ 导航时没有页面重新加载
✅ 没有新的 HTML 请求
✅ 只有 JavaScript 处理路由
✅ 浏览器 URL 正确更新
```

### 2. 钱包交互集成测试

#### 测试场景 2.1：钱包连接流程

```
步骤：
1. 打开网站
2. 打开浏览器开发者工具 Console 标签
3. 点击"连接钱包"
4. 在 MetaMask 中确认
5. 观察 Console 输出

预期结果：
✅ 连接成功消息显示
✅ 账户地址正确显示
✅ 余额正确显示
✅ 链 ID 正确显示
✅ 没有错误信息
```

#### 测试场景 2.2：交易流程

```
步骤：
1. 连接钱包
2. 导航到购买页面
3. 输入购买数量
4. 点击"购买"按钮
5. 在 MetaMask 中确认交易
6. 等待交易完成

预期结果：
✅ MetaMask 显示交易详情
✅ 交易费用正确计算
✅ 交易完成后显示成功消息
✅ 用户余额更新
```

### 3. 错误恢复测试

#### 测试场景 3.1：网络中断恢复

```
步骤：
1. 在执行交易时断开网络
2. 等待几秒
3. 恢复网络连接

预期结果：
✅ 应用显示"网络连接失败"
✅ 提供重试选项
✅ 恢复连接后自动重试或允许手动重试
✅ 应用保持稳定
```

#### 测试场景 3.2：钱包断开恢复

```
步骤：
1. 连接钱包
2. 在 MetaMask 中断开连接
3. 返回网站

预期结果：
✅ 网站检测到断开
✅ 显示"连接钱包"按钮
✅ 禁用所有需要钱包的功能
✅ 允许重新连接
```

---

## 📋 智能合约测试

### 1. 合约部署测试

#### 测试场景 1.1：本地部署

```bash
# 启动本地 Hardhat 网络
npx hardhat node

# 在另一个终端部署合约
npx hardhat run scripts/deploy-v4.0.js --network localhost

# 预期结果
✅ 所有合约部署成功
✅ 显示合约地址
✅ 没有部署错误
```

#### 测试场景 1.2：Amoy 测试网部署

```bash
# 部署到 Amoy 测试网
npx hardhat run scripts/deploy-v4.0.js --network amoy

# 预期结果
✅ 所有合约部署成功
✅ 显示合约地址
✅ 可以在 Polygonscan 上查看
```

### 2. 合约功能测试

#### 测试场景 2.1：代币转账

```bash
# 测试代币转账功能
npx hardhat test test/tokens.test.ts

# 预期结果
✅ 所有测试通过
✅ 转账功能正常
✅ 余额正确更新
```

#### 测试场景 2.2：质押功能

```bash
# 测试质押功能
npx hardhat test test/staking.test.ts

# 预期结果
✅ 所有测试通过
✅ 质押成功
✅ 奖励计算正确
```

### 3. 预言机测试

#### 测试场景 3.1：价格数据更新

```bash
# 测试预言机数据更新
npx hardhat run scripts/deploy-oracle.mjs --network localhost

# 预期结果
✅ 部署成功
✅ 价格数据正确显示
✅ 精度正确（6 位小数）
```

#### 测试场景 3.2：数据新鲜度检查

```bash
# 测试数据新鲜度
npx hardhat test test/oracle.test.ts

# 预期结果
✅ 新数据被接受
✅ 过期数据被拒绝
✅ 时间戳正确记录
```

---

## ⚡ 性能测试

### 1. 前端性能测试

#### 测试场景 1.1：Lighthouse 审计

```
步骤：
1. 打开 Chrome DevTools
2. 点击 Lighthouse 标签
3. 选择 Desktop
4. 点击"Analyze page load"
5. 等待审计完成

预期结果：
✅ Performance: > 90
✅ Accessibility: > 90
✅ Best Practices: > 90
✅ SEO: > 90
```

#### 测试场景 1.2：包大小分析

```bash
# 分析打包大小
npm run build

# 检查输出
# 预期结果
✅ 主 JS 文件 < 2MB
✅ CSS 文件 < 500KB
✅ 总大小 < 3MB
```

### 2. 后端性能测试

#### 测试场景 2.1：服务器响应时间

```bash
# 使用 Apache Bench 测试
ab -n 100 -c 10 http://localhost:3000/

# 预期结果
✅ 平均响应时间 < 100ms
✅ 没有失败的请求
✅ 吞吐量 > 100 请求/秒
```

#### 测试场景 2.2：内存使用

```bash
# 监控服务器内存使用
npm run dev

# 在另一个终端运行
top -p $(pgrep -f "node")

# 预期结果
✅ 初始内存使用 < 100MB
✅ 长时间运行内存稳定
✅ 没有内存泄漏
```

---

## 🔒 安全测试

### 1. 输入验证测试

#### 测试场景 1.1：XSS 防护

```
步骤：
1. 在表单中输入 JavaScript 代码：
   <script>alert('XSS')</script>
2. 提交表单
3. 检查是否执行了脚本

预期结果：
✅ 脚本没有执行
✅ 输入被正确转义
✅ 显示为纯文本
```

#### 测试场景 1.2：SQL 注入防护

```
步骤：
1. 在搜索框中输入 SQL 注入代码：
   ' OR '1'='1
2. 提交
3. 检查是否执行了 SQL

预期结果：
✅ 没有执行 SQL 注入
✅ 返回正常结果或错误
✅ 应用保持稳定
```

### 2. 钱包安全测试

#### 测试场景 2.1：私钥保护

```
步骤：
1. 打开浏览器开发者工具
2. 搜索 localStorage 和 sessionStorage
3. 检查是否存储了私钥

预期结果：
✅ 没有私钥存储在本地
✅ 只存储公开信息（地址等）
✅ 敏感信息不在 localStorage 中
```

#### 测试场景 2.2：交易签名验证

```
步骤：
1. 执行交易
2. 在 MetaMask 中查看签名数据
3. 验证签名是否正确

预期结果：
✅ 签名数据正确显示
✅ 用户可以验证交易详情
✅ 没有隐藏的交易数据
```

### 3. 环境变量安全测试

#### 测试场景 3.1：敏感信息保护

```bash
# 检查 .env 文件是否在 Git 中
git status

# 检查 .gitignore
cat .gitignore

# 预期结果
✅ .env 和 .env.local 在 .gitignore 中
✅ 敏感信息不在 Git 仓库中
✅ 只有 .env.example 被提交
```

#### 测试场景 3.2：环境变量访问控制

```bash
# 检查前端是否能访问敏感的后端变量
grep -r "BACKEND_SECRET" client/src/

# 预期结果
✅ 后端密钥不在前端代码中
✅ 只有必要的公开变量在前端
✅ 敏感信息只在后端使用
```

---

## 🐛 故障排除

### 常见问题

#### Q1：页面加载缓慢

```
症状：页面加载需要超过 5 秒

排查步骤：
1. 检查网络连接
2. 打开 DevTools Network 标签
3. 查看哪个资源加载最慢
4. 检查是否有大文件

解决方案：
✅ 优化图片大小
✅ 启用 gzip 压缩
✅ 使用 CDN
✅ 代码分割
```

#### Q2：钱包连接失败

```
症状：点击连接按钮没有反应

排查步骤：
1. 检查 MetaMask 是否安装
2. 检查 MetaMask 是否登录
3. 打开 Console 查看错误
4. 检查网络连接

解决方案：
✅ 安装/启用 MetaMask
✅ 登录 MetaMask
✅ 检查网络设置
✅ 清除浏览器缓存
```

#### Q3：交易失败

```
症状：交易提交后失败

排查步骤：
1. 检查账户余额
2. 检查 Gas 费用
3. 检查合约地址
4. 查看交易哈希

解决方案：
✅ 确保有足够的 MATIC
✅ 增加 Gas 限额
✅ 验证合约地址
✅ 检查合约状态
```

#### Q4：部署失败

```
症状：Vercel 部署失败

排查步骤：
1. 检查构建日志
2. 检查环境变量
3. 检查依赖版本
4. 检查 vercel.json 配置

解决方案：
✅ 修复构建错误
✅ 设置缺失的环境变量
✅ 更新依赖版本
✅ 验证 vercel.json 配置
```

### 调试工具

#### 浏览器开发者工具

```
快捷键：F12 或 Ctrl+Shift+I

主要标签：
- Console：查看错误和日志
- Network：查看网络请求
- Performance：分析性能
- Application：查看存储和缓存
- Sources：调试 JavaScript
```

#### 网络调试

```bash
# 使用 curl 测试 API
curl -v http://localhost:3000/

# 使用 Postman 测试 API
# 下载：https://www.postman.com/downloads/

# 使用 Charles 代理
# 下载：https://www.charlesproxy.com/
```

#### 智能合约调试

```bash
# 使用 Hardhat 调试
npx hardhat run scripts/deploy-v4.0.js --network localhost

# 查看交易详情
npx hardhat verify CONTRACT_ADDRESS --network amoy
```

---

## ✅ 测试检查清单

在发布前，请确保完成以下所有测试：

### 前端测试
- [ ] 页面加载正常
- [ ] 响应式设计正确
- [ ] 导航菜单工作正常
- [ ] 钱包连接成功
- [ ] 表单验证正确
- [ ] 错误处理完善
- [ ] 性能指标达标

### 后端测试
- [ ] Express 服务器启动正常
- [ ] SPA 路由返回 index.html
- [ ] 静态文件正确提供
- [ ] 环境变量正确加载
- [ ] 构建成功完成
- [ ] 没有构建警告

### 集成测试
- [ ] 前后端通信正常
- [ ] 钱包交互流程完整
- [ ] 错误恢复机制工作
- [ ] 网络中断恢复正常

### 智能合约测试
- [ ] 合约部署成功
- [ ] 合约功能正常
- [ ] 预言机数据正确
- [ ] 所有测试通过

### 性能测试
- [ ] Lighthouse 评分 > 90
- [ ] 页面加载时间 < 3s
- [ ] 服务器响应时间 < 100ms
- [ ] 包大小 < 3MB

### 安全测试
- [ ] 没有 XSS 漏洞
- [ ] 没有 SQL 注入漏洞
- [ ] 私钥保护正确
- [ ] 敏感信息不泄露

---

## 📞 获取帮助

如果遇到问题，请：

1. **查看文档**
   - 项目 README
   - API 文档
   - 故障排除指南

2. **检查日志**
   - 浏览器 Console
   - 服务器日志
   - 构建日志

3. **搜索 Issues**
   - GitHub Issues
   - StackOverflow
   - 项目讨论

4. **联系支持**
   - 创建新 Issue
   - 发送邮件
   - 提交反馈

---

## 📚 参考资源

| 资源 | 链接 |
|------|------|
| **React 文档** | https://react.dev |
| **Vite 文档** | https://vitejs.dev |
| **ethers.js 文档** | https://docs.ethers.org |
| **Hardhat 文档** | https://hardhat.org |
| **MetaMask 文档** | https://docs.metamask.io |
| **Polygon 文档** | https://polygon.technology |
| **Vercel 文档** | https://vercel.com/docs |

---

**祝您测试顺利！** 🚀
