# 自动化测试示例

## 🤖 前端自动化测试

### 使用 Playwright 进行 E2E 测试

#### 安装依赖

```bash
npm install --save-dev @playwright/test
npx playwright install
```

#### 创建测试文件

**文件**：`tests/e2e/wallet-connection.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('钱包连接测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问首页
    await page.goto('http://localhost:3000');
  });

  test('应该能够连接钱包', async ({ page }) => {
    // 查找连接钱包按钮
    const connectButton = page.locator('button:has-text("连接钱包")');
    
    // 验证按钮存在
    await expect(connectButton).toBeVisible();
    
    // 点击按钮
    await connectButton.click();
    
    // 等待 MetaMask 弹窗（实际测试中需要模拟）
    // 这里只是演示，实际需要 MetaMask 集成
  });

  test('应该显示正确的导航菜单', async ({ page }) => {
    // 验证所有菜单项
    const menuItems = ['购买', '资产', '质押', '数据分析'];
    
    for (const item of menuItems) {
      const link = page.locator(`button:has-text("${item}")`);
      await expect(link).toBeVisible();
    }
  });

  test('应该能够导航到不同页面', async ({ page }) => {
    // 点击购买菜单
    await page.locator('button:has-text("购买")').click();
    
    // 验证 URL 变化
    await expect(page).toHaveURL('http://localhost:3000/buy');
    
    // 验证页面内容
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('应该处理网络错误', async ({ page }) => {
    // 模拟离线
    await page.context().setOffline(true);
    
    // 尝试加载页面
    await page.reload().catch(() => {
      // 预期会失败
    });
    
    // 恢复连接
    await page.context().setOffline(false);
  });
});
```

#### 运行测试

```bash
# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test tests/e2e/wallet-connection.spec.ts

# 调试模式
npx playwright test --debug

# 生成报告
npx playwright test --reporter=html
```

---

## 🧪 后端单元测试

### 使用 Jest 进行单元测试

#### 安装依赖

```bash
npm install --save-dev jest ts-jest @types/jest
```

#### 创建测试文件

**文件**：`tests/unit/utils.test.ts`

```typescript
import { formatAddress, calculateGas } from '../../server/utils';

describe('工具函数测试', () => {
  describe('formatAddress', () => {
    test('应该正确格式化地址', () => {
      const address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      const result = formatAddress(address);
      
      expect(result).toBe('0x5FbD...aa3');
    });

    test('应该处理无效地址', () => {
      const invalidAddress = 'invalid';
      
      expect(() => {
        formatAddress(invalidAddress);
      }).toThrow('Invalid address');
    });
  });

  describe('calculateGas', () => {
    test('应该正确计算 Gas 费用', () => {
      const gasPrice = 1000000000; // 1 Gwei
      const gasLimit = 21000;
      
      const result = calculateGas(gasPrice, gasLimit);
      
      expect(result).toBe(21000000000000);
    });

    test('应该处理大数字', () => {
      const gasPrice = 100000000000; // 100 Gwei
      const gasLimit = 1000000;
      
      const result = calculateGas(gasPrice, gasLimit);
      
      expect(result).toBeGreaterThan(0);
    });
  });
});
```

#### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test tests/unit/utils.test.ts

# 监听模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

---

## 🔗 集成测试

### API 集成测试

**文件**：`tests/integration/api.test.ts`

```typescript
import fetch from 'node-fetch';

describe('API 集成测试', () => {
  const baseUrl = 'http://localhost:3000';

  test('应该返回首页', async () => {
    const response = await fetch(`${baseUrl}/`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  test('应该返回 SPA 路由', async () => {
    const routes = ['/buy', '/portfolio', '/stake', '/analytics'];
    
    for (const route of routes) {
      const response = await fetch(`${baseUrl}${route}`);
      
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
    }
  });

  test('应该返回静态文件', async () => {
    const response = await fetch(`${baseUrl}/assets/index-*.css`);
    
    // 注意：实际 URL 会有哈希值，这里只是演示
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/css');
  });

  test('应该处理 404 错误', async () => {
    const response = await fetch(`${baseUrl}/nonexistent`);
    
    // SPA 应该返回 index.html，状态码为 200
    expect(response.status).toBe(200);
  });
});
```

---

## 🧬 智能合约测试

### 使用 Hardhat 进行合约测试

**文件**：`test/PVCoin.test.ts`

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PVCoin 合约测试", () => {
  let pvCoin: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async () => {
    // 获取签署者
    [owner, addr1, addr2] = await ethers.getSigners();

    // 部署合约
    const PVCoin = await ethers.getContractFactory("PVCoin");
    pvCoin = await PVCoin.deploy();
    await pvCoin.waitForDeployment();
  });

  describe("部署", () => {
    it("应该设置正确的初始供应量", async () => {
      const totalSupply = await pvCoin.totalSupply();
      const expectedSupply = ethers.parseUnits("4000000", 18);
      
      expect(totalSupply).to.equal(expectedSupply);
    });

    it("应该将所有代币分配给部署者", async () => {
      const ownerBalance = await pvCoin.balanceOf(owner.address);
      const totalSupply = await pvCoin.totalSupply();
      
      expect(ownerBalance).to.equal(totalSupply);
    });
  });

  describe("转账", () => {
    it("应该能够转账代币", async () => {
      const transferAmount = ethers.parseUnits("100", 18);
      
      await pvCoin.transfer(addr1.address, transferAmount);
      
      const addr1Balance = await pvCoin.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount);
    });

    it("应该拒绝余额不足的转账", async () => {
      const transferAmount = ethers.parseUnits("10000000", 18);
      
      await expect(
        pvCoin.connect(addr1).transfer(addr2.address, transferAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("批准和转账", () => {
    it("应该能够批准和转账", async () => {
      const approveAmount = ethers.parseUnits("1000", 18);
      const transferAmount = ethers.parseUnits("500", 18);
      
      // 批准
      await pvCoin.approve(addr1.address, approveAmount);
      
      // 从 addr1 转账
      await pvCoin
        .connect(addr1)
        .transferFrom(owner.address, addr2.address, transferAmount);
      
      const addr2Balance = await pvCoin.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(transferAmount);
    });
  });
});
```

#### 运行合约测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/PVCoin.test.ts

# 生成覆盖率报告
npx hardhat coverage

# 监听模式
npx hardhat test --watch
```

---

## 📊 性能测试

### 使用 Lighthouse 进行性能审计

```bash
# 安装 Lighthouse CLI
npm install -g @lhci/cli@latest lighthouse

# 运行 Lighthouse 审计
lighthouse https://pect-dapp.vercel.app --view

# 生成 JSON 报告
lighthouse https://pect-dapp.vercel.app --output=json > report.json
```

### 使用 WebPageTest 进行性能测试

```bash
# 访问 https://www.webpagetest.org
# 输入网站 URL
# 选择测试位置和浏览器
# 运行测试
# 查看详细报告
```

---

## 🔒 安全测试

### 使用 OWASP ZAP 进行安全扫描

```bash
# 安装 OWASP ZAP
# 下载：https://www.zaproxy.org/download/

# 启动 ZAP
# 配置代理
# 扫描网站
# 查看报告
```

### 使用 npm audit 检查依赖安全

```bash
# 检查依赖漏洞
npm audit

# 修复已知漏洞
npm audit fix

# 生成详细报告
npm audit --json > audit-report.json
```

---

## 🚀 CI/CD 测试自动化

### GitHub Actions 配置

**文件**：`.github/workflows/test.yml`

```yaml
name: 测试

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: 使用 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: 运行 ESLint
        run: npm run lint

      - name: 运行类型检查
        run: npm run type-check

      - name: 运行单元测试
        run: npm test

      - name: 运行 E2E 测试
        run: npm run test:e2e

      - name: 构建项目
        run: npm run build

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 📈 测试覆盖率目标

| 类型 | 目标 | 说明 |
|------|------|------|
| **语句覆盖率** | > 80% | 代码行数 |
| **分支覆盖率** | > 75% | if/else 分支 |
| **函数覆盖率** | > 80% | 函数调用 |
| **行覆盖率** | > 80% | 代码行 |

---

## 🎯 测试最佳实践

### 1. 测试命名

```typescript
// ✅ 好的命名
test('应该在输入有效数据时成功提交表单', () => {});

// ❌ 不好的命名
test('测试表单', () => {});
```

### 2. 测试结构

```typescript
// ✅ 使用 AAA 模式
test('应该计算正确的总价', () => {
  // Arrange - 准备
  const price = 100;
  const quantity = 5;
  
  // Act - 执行
  const total = price * quantity;
  
  // Assert - 验证
  expect(total).toBe(500);
});
```

### 3. 测试隔离

```typescript
// ✅ 每个测试独立
describe('计算器', () => {
  let calculator: Calculator;

  beforeEach(() => {
    // 每个测试前重新创建
    calculator = new Calculator();
  });

  test('应该能够相加', () => {
    expect(calculator.add(2, 3)).toBe(5);
  });

  test('应该能够相减', () => {
    expect(calculator.subtract(5, 3)).toBe(2);
  });
});
```

### 4. 异步测试

```typescript
// ✅ 正确处理异步
test('应该能够获取用户数据', async () => {
  const user = await fetchUser(1);
  expect(user.id).toBe(1);
});

// ✅ 使用 done 回调
test('应该能够处理回调', (done) => {
  fetchUser(1, (user) => {
    expect(user.id).toBe(1);
    done();
  });
});
```

---

## 📚 参考资源

| 工具 | 用途 | 链接 |
|------|------|------|
| **Playwright** | E2E 测试 | https://playwright.dev |
| **Jest** | 单元测试 | https://jestjs.io |
| **Hardhat** | 合约测试 | https://hardhat.org |
| **Lighthouse** | 性能审计 | https://developers.google.com/web/tools/lighthouse |
| **OWASP ZAP** | 安全扫描 | https://www.zaproxy.org |

---

**祝您测试顺利！** 🚀
