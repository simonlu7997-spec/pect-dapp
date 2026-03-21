# GitHub 连接快速参考卡片

## ⚡ 5 分钟快速设置

### 1️⃣ 创建 GitHub 仓库（1 分钟）

```
访问：https://github.com/new
填写：
  - Repository name: pect-dapp
  - Visibility: Public
点击：Create repository
复制：仓库 URL（https://github.com/YOUR_USERNAME/pect-dapp.git）
```

### 2️⃣ 本地 Git 配置（1 分钟）

```bash
# 进入项目目录
cd /home/ubuntu/pect-dapp

# 配置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 添加远程源
git remote add origin https://github.com/YOUR_USERNAME/pect-dapp.git
```

### 3️⃣ 推送代码（2 分钟）

```bash
# 添加所有文件
git add .

# 创建提交
git commit -m "Initial commit: PECT dAPP"

# 设置主分支并推送
git branch -M main
git push -u origin main

# 首次推送时输入：
# 用户名：YOUR_USERNAME
# 密码：YOUR_PERSONAL_ACCESS_TOKEN（见下方获取）
```

### 4️⃣ 连接 Vercel（1 分钟）

```
1. 访问：https://vercel.com
2. 进入项目 → Settings → Git
3. 点击：Connect Git Repository
4. 选择：GitHub 和 pect-dapp 仓库
5. 点击：Connect
6. 点击：Deploy
```

---

## 🔐 获取个人访问令牌（PAT）

### 快速步骤

```
1. 访问：https://github.com/settings/tokens
2. 点击：Generate new token → Personal access tokens (classic)
3. 填写：
   - Note: Vercel Deployment
   - Expiration: 90 days
4. 勾选：repo 和 workflow
5. 点击：Generate token
6. 复制令牌（只显示一次！）
```

### 使用 PAT

```bash
# 首次 push 时输入凭证
git push -u origin main

# 提示输入用户名：输入 GitHub 用户名
# 提示输入密码：粘贴上面复制的 PAT
```

---

## 📋 命令速查表

| 操作 | 命令 |
|------|------|
| **进入项目** | `cd /home/ubuntu/pect-dapp` |
| **初始化 Git** | `git init` |
| **添加远程源** | `git remote add origin https://github.com/YOUR_USERNAME/pect-dapp.git` |
| **查看远程源** | `git remote -v` |
| **添加文件** | `git add .` |
| **创建提交** | `git commit -m "message"` |
| **推送代码** | `git push -u origin main` |
| **查看状态** | `git status` |
| **查看日志** | `git log --oneline` |
| **创建分支** | `git checkout -b feature/name` |
| **切换分支** | `git checkout main` |
| **拉取更新** | `git pull origin main` |

---

## ✅ 验证清单

- [ ] GitHub 仓库已创建
- [ ] 本地 Git 已配置
- [ ] 代码已推送到 GitHub
- [ ] Vercel 已连接 GitHub
- [ ] 首次部署成功
- [ ] 访问 URL 正常工作

---

## 🚀 部署 URL

部署成功后访问：

```
https://pect-dapp-YOUR_USERNAME.vercel.app
```

---

## 🆘 常见错误

| 错误 | 解决方案 |
|------|---------|
| **fatal: not a git repository** | 运行 `git init` |
| **fatal: remote origin already exists** | 运行 `git remote remove origin` 后重新添加 |
| **Authentication failed** | 检查 PAT 是否正确，或重新生成 |
| **Everything up-to-date** | 确保有新的提交后再 push |
| **Vercel build failed** | 查看 Vercel 部署日志，检查构建命令 |

---

## 📞 需要帮助？

1. 查看完整指南：`docs/GITHUB_DEPLOYMENT_GUIDE.md`
2. 查看优化方案：`docs/EXECUTION_RESULT_OPTIMIZATION.md`
3. GitHub 帮助：https://docs.github.com
4. Vercel 帮助：https://vercel.com/docs
