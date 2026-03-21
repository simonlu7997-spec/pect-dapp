# GitHub 连接与 Vercel 部署完整指南

## 📋 快速概览

本指南将指导您完成以下步骤：

1. ✅ 创建 GitHub 仓库
2. ✅ 本地 Git 配置
3. ✅ 推送代码到 GitHub
4. ✅ 连接 Vercel 到 GitHub
5. ✅ 自动部署配置

---

## 🚀 第一步：创建 GitHub 仓库

### 方式 A：手动创建（推荐新手）

#### 1. 访问 GitHub

打开浏览器，访问：https://github.com/new

#### 2. 填写仓库信息

| 字段 | 值 | 说明 |
|------|-----|------|
| **Repository name** | `pect-dapp` | 仓库名称 |
| **Description** | `PECT DApp - 光伏电站收益与碳信用管理平台` | 仓库描述 |
| **Visibility** | Public | 公开仓库（便于协作） |
| **Initialize this repository with** | ❌ 不勾选 | 我们已有代码 |

#### 3. 创建仓库

点击 **"Create repository"** 按钮

#### 4. 复制仓库 URL

创建后，您会看到一个页面，显示：

```
https://github.com/YOUR_USERNAME/pect-dapp.git
```

**复制此 URL**（后续会用到）

---

### 方式 B：通过 Manus UI 创建（推荐）

#### 1. 打开 Manus 管理界面

在项目管理面板中，找到 **"Settings"** → **"GitHub"**

#### 2. 点击 "Export to GitHub"

#### 3. 选择或创建仓库

- 选择 GitHub 账户
- 输入仓库名称：`pect-dapp`
- 选择公开/私密

#### 4. 点击 "Export"

Manus 会自动推送代码到 GitHub

---

## 🔧 第二步：本地 Git 配置

### 前置条件

确保已安装 Git：

```bash
git --version
# 输出示例：git version 2.34.1
```

如果未安装，访问 https://git-scm.com/download

### 配置 Git 用户信息

```bash
# 设置全局用户名
git config --global user.name "Your Name"

# 设置全局邮箱
git config --global user.email "your.email@example.com"

# 验证配置
git config --global --list
```

**示例**：

```bash
git config --global user.name "Simon Liu"
git config --global user.email "simon@example.com"
```

---

## 📤 第三步：推送代码到 GitHub

### 3.1 进入项目目录

```bash
cd /home/ubuntu/pect-dapp
```

### 3.2 初始化 Git 仓库（如果未初始化）

```bash
# 检查是否已初始化
ls -la | grep .git

# 如果没有 .git 目录，执行初始化
git init
```

### 3.3 添加 GitHub 远程源

```bash
# 使用 HTTPS（推荐，无需 SSH 密钥）
git remote add origin https://github.com/YOUR_USERNAME/pect-dapp.git

# 验证
git remote -v
# 输出应该显示：
# origin  https://github.com/YOUR_USERNAME/pect-dapp.git (fetch)
# origin  https://github.com/YOUR_USERNAME/pect-dapp.git (push)
```

**⚠️ 重要**：将 `YOUR_USERNAME` 替换为您的 GitHub 用户名

### 3.4 添加所有文件到暂存区

```bash
git add .
```

### 3.5 创建初始提交

```bash
git commit -m "Initial commit: PECT dAPP with smart contracts and frontend"
```

### 3.6 推送到 GitHub

```bash
# 设置主分支为 main
git branch -M main

# 推送代码
git push -u origin main
```

**首次推送时**：

- **如果使用 HTTPS**：输入 GitHub 用户名和个人访问令牌（PAT）
- **如果使用 SSH**：需要配置 SSH 密钥（见下方）

### 3.7 验证推送成功

访问 GitHub 仓库：

```
https://github.com/YOUR_USERNAME/pect-dapp
```

应该能看到所有推送的文件

---

## 🔐 HTTPS 认证：创建个人访问令牌（PAT）

### 为什么需要 PAT？

GitHub 已停止使用密码进行 HTTPS 认证，需要使用个人访问令牌（Personal Access Token）

### 创建 PAT

#### 1. 访问 GitHub 设置

打开：https://github.com/settings/tokens

#### 2. 点击 "Generate new token"

选择 **"Personal access tokens (classic)"**

#### 3. 填写令牌信息

| 字段 | 值 |
|------|-----|
| **Note** | `Vercel Deployment` |
| **Expiration** | 90 days（或您偏好的时间） |

#### 4. 选择权限范围

勾选以下选项：

- ✅ `repo` - 完整的仓库访问
- ✅ `workflow` - 工作流权限

#### 5. 生成令牌

点击 **"Generate token"**

#### 6. 复制令牌

⚠️ **重要**：令牌只显示一次，请立即复制并保存

```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 7. 使用 PAT 进行 Git 操作

```bash
# 首次 push 时输入凭证
git push -u origin main

# 提示输入用户名：输入 GitHub 用户名
# 提示输入密码：输入上面复制的 PAT（不是 GitHub 密码）
```

### 保存凭证（可选）

为了避免每次都输入凭证，可以使用 Git 凭证管理器：

```bash
# 启用凭证缓存（缓存 15 分钟）
git config --global credential.helper cache

# 或使用系统凭证管理器（Windows/Mac/Linux）
git config --global credential.helper store
```

---

## 🔗 第四步：连接 Vercel 到 GitHub

### 4.1 访问 Vercel 项目设置

1. 登录 Vercel：https://vercel.com
2. 进入 **"pect-dapp"** 项目
3. 点击 **"Settings"** 标签
4. 进入 **"Git"** 部分

### 4.2 连接 GitHub 仓库

#### 选项 A：如果未连接任何 Git 仓库

1. 点击 **"Connect Git Repository"**
2. 选择 **"GitHub"**
3. 授权 Vercel 访问您的 GitHub 账户
4. 搜索 **"pect-dapp"** 仓库
5. 点击 **"Connect"**

#### 选项 B：如果已连接其他仓库

1. 点击 **"Disconnect"** 断开当前连接
2. 按照选项 A 的步骤重新连接

### 4.3 配置部署设置

连接后，Vercel 会自动检测项目配置。确认以下设置：

| 设置项 | 值 | 说明 |
|--------|-----|------|
| **Framework** | Vite | 自动检测 |
| **Build Command** | `npm run build` | 构建命令 |
| **Output Directory** | `dist/public` | 输出目录 |
| **Install Command** | `npm install` | 安装命令 |
| **Environment Variables** | 见下方 | 环境变量 |

### 4.4 配置环境变量

在 Vercel 中添加环境变量：

```
VITE_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=pect-dapp-prod
```

点击 **"Save"**

### 4.5 触发部署

1. 点击 **"Deploy"** 按钮
2. 或者推送代码到 GitHub，Vercel 会自动部署

---

## 🔄 第五步：自动部署配置

### 工作流程

```
推送代码到 GitHub
    ↓
Vercel 检测到更新
    ↓
自动运行构建命令
    ↓
部署到生产环境
    ↓
生成部署 URL
```

### 查看部署状态

1. 访问 Vercel 项目页面
2. 在 **"Deployments"** 标签查看部署历史
3. 每个部署显示：
   - ✅ 成功/❌ 失败
   - 部署时间
   - 提交信息
   - 部署 URL

### 部署 URL

部署成功后，您的应用将在以下 URL 可访问：

```
https://pect-dapp-YOUR_USERNAME.vercel.app
```

或自定义域名（如已配置）

---

## 📝 日常开发流程

### 开发新功能

```bash
# 1. 创建新分支
git checkout -b feature/add-wallet-connection

# 2. 进行开发
# ... 修改文件 ...

# 3. 提交更改
git add .
git commit -m "Add: wallet connection feature"

# 4. 推送到 GitHub
git push origin feature/add-wallet-connection

# 5. 在 GitHub 上创建 Pull Request
# 6. 代码审查后合并到 main 分支
```

### 同步远程更改

```bash
# 拉取最新代码
git pull origin main

# 或者
git fetch origin
git merge origin/main
```

---

## 🛠️ 常见问题

### Q1: 如何修改已推送的代码？

```bash
# 修改文件后
git add .
git commit -m "Fix: description of fix"
git push origin main

# Vercel 会自动重新部署
```

### Q2: 如何查看部署日志？

1. 访问 Vercel 项目
2. 点击 **"Deployments"** 标签
3. 选择一个部署
4. 点击 **"View Logs"**

### Q3: 部署失败怎么办？

1. 查看 Vercel 部署日志
2. 常见原因：
   - 构建命令失败
   - 环境变量缺失
   - 依赖安装失败
3. 修复后重新推送代码

### Q4: 如何回滚到之前的版本？

1. 在 Vercel **"Deployments"** 中找到之前的版本
2. 点击该部署旁的 **"..."** 菜单
3. 选择 **"Redeploy"**

### Q5: 如何自定义域名？

1. 在 Vercel 项目设置中
2. 进入 **"Domains"** 部分
3. 添加自定义域名
4. 按照说明配置 DNS 记录

---

## ✅ 完成检查清单

- [ ] 创建了 GitHub 仓库
- [ ] 配置了 Git 用户信息
- [ ] 推送代码到 GitHub
- [ ] 在 Vercel 中连接了 GitHub 仓库
- [ ] 配置了环境变量
- [ ] 首次部署成功
- [ ] 访问部署 URL 正常工作
- [ ] 配置了自动部署

---

## 📚 参考资源

| 资源 | 链接 |
|------|------|
| **GitHub 官方文档** | https://docs.github.com |
| **Git 官方文档** | https://git-scm.com/doc |
| **Vercel 部署指南** | https://vercel.com/docs |
| **个人访问令牌** | https://github.com/settings/tokens |
| **SSH 密钥配置** | https://docs.github.com/en/authentication/connecting-to-github-with-ssh |

---

## 🎉 下一步

部署成功后，您可以：

1. 配置自定义域名
2. 设置 CI/CD 工作流
3. 配置自动测试
4. 添加 GitHub Actions 工作流
5. 设置分支保护规则

祝您部署顺利！🚀
