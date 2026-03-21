# 白名单功能快速参考

## 🚀 5 分钟快速开始

### 步骤 1：准备环境

```bash
# 1. 安装 MetaMask 钱包
# 访问 https://metamask.io/

# 2. 配置 Polygon Amoy 网络
# Chain ID: 80002
# RPC: https://rpc-amoy.polygon.technology

# 3. 获取测试代币
# 访问 https://faucet.polygon.technology/
```

### 步骤 2：访问白名单页面

```
https://pect-dapp-YOUR_USERNAME.vercel.app/whitelist
```

### 步骤 3：连接钱包

- 点击"连接钱包"按钮
- 在 MetaMask 中确认

### 步骤 4：填写表单

| 字段 | 示例 |
|------|------|
| 姓名 | John Doe |
| 邮箱 | john@example.com |
| 电话 | +1234567890 |
| 国家 | United States |
| 投资金额 | 1000 |
| 货币 | USDT |
| 钱包地址 | 0x... (自动填充) |

### 步骤 5：提交

- 勾选"我同意条款"
- 点击"提交"按钮
- 在 MetaMask 中确认交易

---

## 📁 文件结构

```
client/src/
├── pages/
│   └── Whitelist.tsx                    # 表单页面
├── contexts/
│   └── WhitelistContext.tsx             # 数据管理
├── hooks/
│   └── useWhitelistForm.ts              # 表单逻辑
└── components/
    └── Navbar.tsx                       # 导航（包含白名单链接）
```

---

## 🔧 环境变量

```bash
# .env.local
VITE_PV_COIN_ADDRESS=0x...              # PVCoin 合约地址
VITE_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
```

---

## 📊 数据流

```
表单输入
  ↓
客户端验证
  ↓
连接钱包
  ↓
调用合约 (addKyc + addSenderWhitelist)
  ↓
等待确认
  ↓
保存到 Context
  ↓
显示成功
```

---

## ⚡ 关键命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 推送到 GitHub
git add .
git commit -m "Add: Whitelist feature"
git push origin main
```

---

## 🆘 常见问题速查

| 问题 | 解决方案 |
|------|--------|
| **连接钱包无反应** | 检查 MetaMask 是否安装并登录 |
| **提交失败** | 检查 Gas 费用是否足够 |
| **地址无效** | 确保输入的是有效的以太坊地址 |
| **合约错误** | 检查 `VITE_PV_COIN_ADDRESS` 是否正确 |
| **网络错误** | 确保连接到 Polygon Amoy 网络 |

---

## 📝 检查清单

部署前验证：

- [ ] MetaMask 已安装
- [ ] Polygon Amoy 网络已配置
- [ ] 环境变量已设置
- [ ] 表单能正常加载
- [ ] 钱包连接功能正常
- [ ] 表单验证正常
- [ ] 合约交互成功
- [ ] 数据保存成功

---

## 🔗 相关资源

- [完整使用指南](./WHITELIST_FEATURE_GUIDE.md)
- [全栈测试指南](./FULL_STACK_TESTING_GUIDE.md)
- [MetaMask 文档](https://docs.metamask.io/)
- [Polygon Amoy 文档](https://polygon.technology/)
- [ethers.js 文档](https://docs.ethers.org/)

---

## 💡 提示

✅ **自动填充钱包地址**
- 连接钱包后，点击"自动填充"按钮可自动填充钱包地址

✅ **本地存储**
- 表单数据会自动保存到浏览器本地存储
- 刷新页面后数据仍然存在

✅ **错误处理**
- 所有错误都会显示在表单下方
- 根据错误信息进行相应的调整

✅ **交易确认**
- 提交后需要在 MetaMask 中确认交易
- 确认后需要等待区块链确认（通常 1-2 分钟）
