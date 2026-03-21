# PECT DApp 白名单功能完整指南

## 📋 目录

1. [功能概述](#功能概述)
2. [系统架构](#系统架构)
3. [快速开始](#快速开始)
4. [功能详解](#功能详解)
5. [部署指南](#部署指南)
6. [测试指南](#测试指南)
7. [常见问题](#常见问题)
8. [故障排除](#故障排除)

---

## 功能概述

### 什么是白名单功能？

白名单功能允许用户填写一份表单，提交个人信息和投资意向。提交完成后，系统会自动将用户的钱包地址添加到 PVCoin 智能合约的以下两个白名单中：

- **KYC 白名单**：用于身份验证和合规性检查
- **发送方白名单**：用于允许用户转账 PVCoin 代币

### 主要特性

✅ **自动化流程**
- 用户填写表单后自动添加到智能合约白名单
- 无需手动审批流程
- 实时更新状态

✅ **完整的表单验证**
- 客户端验证：实时反馈用户输入错误
- 服务端验证：确保数据完整性
- 钱包地址格式检查

✅ **安全的合约交互**
- 使用 ethers.js 与智能合约交互
- 完整的错误处理和重试机制
- Gas 费用估算和优化

✅ **用户友好的界面**
- 清晰的表单布局
- 实时错误提示
- 成功/失败状态显示
- 自动填充钱包地址

---

## 系统架构

### 前端组件结构

```
client/src/
├── pages/
│   └── Whitelist.tsx              # 白名单表单页面
├── contexts/
│   └── WhitelistContext.tsx        # 白名单数据管理
├── hooks/
│   └── useWhitelistForm.ts         # 白名单表单逻辑
└── components/
    └── Navbar.tsx                  # 导航栏（包含白名单链接）
```

### 数据流

```
用户填写表单
    ↓
验证表单数据
    ↓
连接钱包（MetaMask）
    ↓
调用 PVCoin 合约
    ├── addKyc(address)
    └── addSenderWhitelist(address)
    ↓
保存到 WhitelistContext
    ↓
显示成功/失败状态
```

### 关键文件说明

#### 1. Whitelist.tsx（表单页面）

**职责**：
- 渲染白名单表单 UI
- 管理表单状态
- 处理用户交互

**主要功能**：
- 表单字段验证
- 自动填充钱包地址
- 显示错误和成功消息
- 提交表单

#### 2. WhitelistContext.tsx（数据管理）

**职责**：
- 管理白名单条目的全局状态
- 提供数据持久化（本地存储）
- 处理数据的增删改查操作

**主要方法**：
- `addWhitelistEntry()`：添加新条目
- `updateWhitelistEntry()`：更新条目
- `removeWhitelistEntry()`：删除条目
- `getWhitelistEntry()`：查询条目
- `fetchWhitelistEntries()`：获取所有条目

#### 3. useWhitelistForm.ts（表单逻辑）

**职责**：
- 处理表单提交逻辑
- 与 PVCoin 合约交互
- 管理加载和错误状态

**主要方法**：
- `submitWhitelist()`：提交表单并调用合约

---

## 快速开始

### 前置要求

1. **安装 MetaMask 钱包**
   - 访问 [MetaMask 官网](https://metamask.io/)
   - 安装浏览器扩展
   - 创建或导入钱包

2. **配置 Polygon Amoy 网络**
   - 打开 MetaMask
   - 添加网络：Polygon Amoy (Chain ID: 80002)
   - RPC URL: `https://rpc-amoy.polygon.technology`

3. **获取测试代币**
   - 访问 [Polygon Faucet](https://faucet.polygon.technology/)
   - 领取测试 MATIC（用于支付 Gas 费用）

### 访问白名单页面

1. **打开 DApp 网站**
   ```
   https://pect-dapp-YOUR_USERNAME.vercel.app
   ```

2. **连接钱包**
   - 点击导航栏的"连接钱包"按钮
   - 在 MetaMask 弹窗中确认连接

3. **访问白名单页面**
   - 点击导航栏的"白名单"链接
   - 或直接访问：`https://pect-dapp-YOUR_USERNAME.vercel.app/whitelist`

### 填写表单

1. **个人信息**
   - 填写完整姓名
   - 输入有效的电子邮件地址
   - 输入联系电话

2. **投资信息**
   - 选择国家/地区
   - 输入投资金额
   - 选择投资货币（USDT/USDC）

3. **钱包地址**
   - 手动输入钱包地址，或
   - 点击"自动填充"按钮自动填充已连接的钱包地址

4. **同意条款**
   - 勾选"我同意条款和条件"复选框

5. **提交表单**
   - 点击"提交"按钮
   - 在 MetaMask 中确认交易

---

## 功能详解

### 表单验证

#### 客户端验证

表单提交前，系统会检查以下内容：

| 字段 | 验证规则 | 错误消息 |
|------|--------|--------|
| **姓名** | 不能为空，至少 2 个字符 | "请输入有效的姓名" |
| **邮箱** | 必须是有效的邮箱格式 | "请输入有效的邮箱地址" |
| **电话** | 不能为空 | "请输入电话号码" |
| **国家** | 必须选择一个国家 | "请选择国家" |
| **投资金额** | 必须是正数 | "请输入有效的投资金额" |
| **钱包地址** | 必须是有效的以太坊地址格式 | "请输入有效的钱包地址" |
| **条款** | 必须勾选 | "请同意条款和条件" |

#### 服务端验证

提交时，系统会进行以下检查：

- ✅ 钱包地址格式验证（使用 ethers.js）
- ✅ 地址是否已在白名单中
- ✅ 钱包是否已连接
- ✅ 合约地址是否已配置

### 合约交互

#### 调用的合约方法

```solidity
// 添加到 KYC 白名单
function addKyc(address _account) external

// 添加到发送方白名单
function addSenderWhitelist(address _account) external
```

#### 交互流程

1. **检查连接**
   - 验证 MetaMask 钱包已连接
   - 获取签名者对象

2. **检查状态**
   - 查询地址是否已在 KYC 白名单中
   - 查询地址是否已在发送方白名单中

3. **添加到白名单**
   - 如果未在 KYC 白名单中，调用 `addKyc()`
   - 如果未在发送方白名单中，调用 `addSenderWhitelist()`

4. **等待确认**
   - 等待交易被矿工打包
   - 等待交易被区块链确认

5. **保存数据**
   - 将用户信息保存到 WhitelistContext
   - 数据持久化到本地存储

### 错误处理

系统会捕获并显示以下错误：

| 错误类型 | 原因 | 解决方案 |
|--------|------|--------|
| **user rejected** | 用户在 MetaMask 中拒绝交易 | 重新提交并在 MetaMask 中确认 |
| **insufficient funds** | 账户余额不足以支付 Gas 费用 | 从 Faucet 获取更多测试代币 |
| **execution reverted** | 合约执行失败 | 检查钱包地址和权限 |
| **already in whitelist** | 该地址已在白名单中 | 使用不同的钱包地址 |
| **invalid address** | 钱包地址格式不正确 | 输入有效的以太坊地址 |

---

## 部署指南

### 环境变量配置

在 `.env.local` 中配置以下变量：

```bash
# PVCoin 合约地址
VITE_PV_COIN_ADDRESS=0x...

# RPC 配置
VITE_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
```

### 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add: Whitelist feature"
   git push origin main
   ```

2. **Vercel 自动部署**
   - Vercel 会自动检测到代码更新
   - 自动构建和部署
   - 部署完成后访问网站

3. **验证部署**
   - 访问白名单页面
   - 检查是否能正常加载
   - 测试表单提交功能

---

## 测试指南

### 本地测试

#### 1. 启动开发服务器

```bash
cd /home/ubuntu/pect-dapp
npm run dev
```

#### 2. 访问本地网站

```
http://localhost:3001/whitelist
```

#### 3. 测试表单提交

```javascript
// 在浏览器控制台中测试
const formData = {
  fullName: "Test User",
  email: "test@example.com",
  phone: "1234567890",
  country: "China",
  investmentAmount: "1000",
  investmentCurrency: "USDT",
  walletAddress: "0x...",
  agreeTerms: true
};
```

### 生产环境测试

#### 1. 测试钱包连接

- [ ] 点击"连接钱包"按钮
- [ ] 在 MetaMask 中确认连接
- [ ] 验证钱包地址显示正确

#### 2. 测试表单验证

- [ ] 提交空表单，验证错误提示
- [ ] 输入无效的邮箱，验证错误提示
- [ ] 输入无效的钱包地址，验证错误提示

#### 3. 测试表单提交

- [ ] 填写完整的表单
- [ ] 点击"提交"按钮
- [ ] 在 MetaMask 中确认交易
- [ ] 验证成功消息显示

#### 4. 测试自动填充

- [ ] 连接钱包后，点击"自动填充"按钮
- [ ] 验证钱包地址自动填充到表单中

#### 5. 测试错误处理

- [ ] 在 MetaMask 中拒绝交易，验证错误消息
- [ ] 使用余额不足的账户，验证错误消息

---

## 常见问题

### Q1：为什么点击"连接钱包"没有反应？

**A：** 可能的原因：

1. MetaMask 未安装
   - 解决：从 [MetaMask 官网](https://metamask.io/) 安装

2. MetaMask 未登录
   - 解决：打开 MetaMask 扩展并登录

3. 浏览器不兼容
   - 解决：使用 Chrome、Firefox 或 Edge 浏览器

### Q2：为什么提交表单时显示"交易执行失败"？

**A：** 可能的原因：

1. PVCoin 合约地址配置错误
   - 解决：检查 `.env.local` 中的 `VITE_PV_COIN_ADDRESS` 是否正确

2. 账户没有权限
   - 解决：确保使用的账户是合约所有者或有相应权限

3. 网络配置错误
   - 解决：确保 MetaMask 连接到 Polygon Amoy 网络

### Q3：为什么自动填充按钮不工作？

**A：** 可能的原因：

1. 钱包未连接
   - 解决：先连接钱包，然后点击自动填充

2. 账户信息未加载
   - 解决：等待几秒钟，让钱包信息加载完成

### Q4：提交后数据保存在哪里？

**A：** 数据保存在以下位置：

1. **本地存储**：浏览器的 localStorage 中
   - 位置：`pect_whitelist_entries`
   - 用途：本地缓存和离线访问

2. **智能合约**：PVCoin 合约的白名单中
   - 用途：链上存储和验证

3. **后端数据库**（可选）：
   - 可以配置后端 API 来保存用户信息

---

## 故障排除

### 问题 1：表单无法提交

**症状**：点击提交按钮后没有反应

**诊断步骤**：

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 查看是否有错误信息

**常见错误和解决方案**：

| 错误信息 | 原因 | 解决方案 |
|--------|------|--------|
| `Cannot read property 'request' of undefined` | MetaMask 未安装 | 安装 MetaMask 扩展 |
| `User rejected the request` | 用户拒绝交易 | 重新提交并确认 |
| `Invalid address` | 钱包地址格式错误 | 输入正确的以太坊地址 |
| `Contract address not configured` | 合约地址未设置 | 配置 `VITE_PV_COIN_ADDRESS` |

### 问题 2：Gas 费用过高

**症状**：交易显示 Gas 费用很高

**解决方案**：

1. 检查网络拥堵情况
2. 等待网络不拥堵时再提交
3. 考虑使用 Layer 2 网络（如 Polygon）

### 问题 3：交易一直等待确认

**症状**：提交表单后，交易一直处于待确认状态

**解决方案**：

1. 检查网络连接
2. 在 MetaMask 中查看交易状态
3. 如果交易卡住，可以加速或取消
4. 重新提交表单

---

## 总结

白名单功能提供了一个完整的、用户友好的解决方案，用于管理 PVCoin 代币的白名单。通过自动化的流程和完善的错误处理，确保用户能够顺利地提交信息并被添加到白名单中。

如有任何问题或建议，请联系开发团队。
