export const walletConnectionGuide = {
  title: "钱包连接指南",
  description: "详细的多平台钱包连接说明",
  sections: [
    {
      id: "overview",
      title: "概述",
      content: `PECT DApp 支持多种钱包连接方式，以适应不同设备和用户偏好。无论您使用的是 iOS、Android 还是桌面设备，我们都为您提供了最佳的连接方案。

我们支持两种主要的连接方式：
- MetaMask：最流行的以太坊钱包，支持浏览器扩展和移动应用
- WalletConnect：通用的钱包连接协议，支持扫描二维码连接，兼容数百个钱包应用`,
    },
    {
      id: "ios",
      title: "iOS 用户指南",
      content: `iOS 用户由于系统限制，无法在 Safari 浏览器中直接使用钱包扩展。我们为您提供了两种最佳方案：

方案 1：使用 MetaMask 移动应用（推荐）
1. 在 App Store 中搜索并下载 MetaMask 应用
2. 打开 MetaMask，创建新钱包或导入现有钱包
3. 在 MetaMask 中打开浏览器功能
4. 访问 PECT DApp 网站
5. 点击连接钱包按钮，选择 MetaMask
6. 在 MetaMask 应用中确认连接请求

方案 2：使用 WalletConnect（扫描二维码）
1. 在 App Store 中下载支持 WalletConnect 的钱包应用，如 Trust Wallet、Coinbase Wallet 等
2. 在钱包应用中创建或导入您的钱包
3. 在 Safari 或其他浏览器中访问 PECT DApp 网站
4. 点击连接钱包按钮，选择 WalletConnect
5. 点击显示二维码
6. 在您的钱包应用中选择扫描二维码
7. 扫描网页上显示的二维码
8. 在钱包应用中确认连接

为什么 Safari 浏览器无法直接连接钱包？
由于 Apple 的 App Store 政策，iOS 上的所有浏览器都必须使用 Safari 的渲染引擎，无法访问浏览器扩展。这是系统级别的限制，不是 PECT DApp 的问题。`,
    },
    {
      id: "android",
      title: "Android 用户指南",
      content: `Android 用户可以使用多种方式连接钱包，具有最大的灵活性。

方案 1：使用 Chrome 浏览器 + MetaMask 扩展（推荐）
1. 在 Google Play 中下载 MetaMask 应用
2. 打开 MetaMask，创建新钱包或导入现有钱包
3. 在 Chrome 浏览器中访问 PECT DApp 网站
4. 点击连接钱包按钮，选择 MetaMask
5. 在 MetaMask 应用中确认连接请求

方案 2：使用 MetaMask 移动应用
1. 在 Google Play 中下载 MetaMask 应用
2. 打开 MetaMask，创建新钱包或导入现有钱包
3. 在 MetaMask 中打开浏览器功能
4. 访问 PECT DApp 网站
5. 点击连接钱包按钮，选择 MetaMask
6. 在 MetaMask 应用中确认连接请求

方案 3：使用 WalletConnect（扫描二维码）
1. 在 Google Play 中下载支持 WalletConnect 的钱包应用
2. 在钱包应用中创建或导入您的钱包
3. 在浏览器中访问 PECT DApp 网站
4. 点击连接钱包按钮，选择 WalletConnect
5. 在您的钱包应用中选择扫描二维码
6. 扫描网页上显示的二维码
7. 在钱包应用中确认连接

Android 上哪个浏览器最好用？
我们推荐使用 Chrome 浏览器，它对 MetaMask 扩展的支持最好。Firefox 和 Brave 也都支持钱包扩展。`,
    },
    {
      id: "desktop",
      title: "桌面用户指南",
      content: `桌面用户可以使用浏览器扩展获得最完整的功能。

方案 1：使用 MetaMask 浏览器扩展（推荐）
1. 访问 MetaMask 官网（metamask.io）
2. 点击下载按钮
3. 选择您的浏览器（Chrome、Firefox、Edge 等）
4. 在浏览器扩展商店中点击添加到浏览器
5. 创建新钱包或导入现有钱包
6. 在浏览器中访问 PECT DApp 网站
7. 点击连接钱包按钮，选择 MetaMask
8. 在 MetaMask 弹窗中确认连接

方案 2：使用其他钱包扩展
除了 MetaMask，您还可以使用其他支持浏览器扩展的钱包：
- Brave 浏览器：内置钱包支持，无需安装扩展
- Ledger Live：支持硬件钱包连接
- Trezor：支持硬件钱包连接
- Frame：开源钱包扩展

方案 3：使用 WalletConnect（扫描二维码）
1. 在您的手机上安装支持 WalletConnect 的钱包应用
2. 在钱包应用中创建或导入您的钱包
3. 在桌面浏览器中访问 PECT DApp 网站
4. 点击连接钱包按钮，选择 WalletConnect
5. 点击显示二维码
6. 在手机上打开钱包应用，选择扫描二维码
7. 扫描桌面上显示的二维码
8. 在手机上确认连接

这种方式特别适合使用硬件钱包的用户。`,
    },
    {
      id: "troubleshooting",
      title: "故障排除",
      content: `连接失败怎么办？

1. 检查网络连接
   - 确保您的设备已连接到互联网
   - 尝试访问其他网站以确认网络正常

2. 检查钱包应用
   - 确保钱包应用已更新到最新版本
   - 尝试关闭并重新打开钱包应用
   - 清除浏览器缓存和 Cookie

3. 检查浏览器
   - 尝试使用不同的浏览器
   - 禁用浏览器扩展（除了钱包扩展）
   - 在隐私浏览模式下尝试

4. 重启设备
   - 有时简单的重启可以解决问题

5. 联系支持
   - 如果问题仍未解决，请联系我们的支持团队

安全建议

为了保护您的资产，请遵循以下安全建议：

1. 私钥管理
   - 永远不要与任何人分享您的私钥或恢复短语
   - 将恢复短语写下来并存储在安全的地方
   - 不要在互联网上存储您的私钥

2. 钱包安全
   - 只从官方渠道下载钱包应用
   - 定期更新钱包应用到最新版本
   - 使用强密码保护您的钱包

3. 网站安全
   - 确保您访问的是正确的网站（检查 URL）
   - 不要点击来自不信任来源的链接
   - 谨慎处理要求您签署的交易

4. 交易确认
   - 在确认任何交易前，仔细检查交易详情
   - 确认接收方地址是正确的
   - 检查 Gas 费用是否合理`,
    },
    {
      id: "supported-wallets",
      title: "支持的钱包列表",
      content: `我们支持以下钱包应用和扩展：

MetaMask
- 浏览器扩展：Chrome、Firefox、Edge、Brave
- 移动应用：iOS、Android
- 网址：https://metamask.io

Trust Wallet
- 移动应用：iOS、Android
- 网址：https://trustwallet.com

Coinbase Wallet
- 浏览器扩展：Chrome、Firefox、Edge
- 移动应用：iOS、Android
- 网址：https://www.coinbase.com/wallet

Ledger Live
- 桌面应用：Windows、Mac、Linux
- 移动应用：iOS、Android
- 网址：https://www.ledger.com

Trezor
- 硬件钱包配套应用
- 网址：https://trezor.io

WalletConnect 兼容钱包
- 支持 WalletConnect 协议的所有钱包
- 包括上述所有钱包和数百个其他钱包`,
    },
    {
      id: "faq",
      title: "常见问题",
      faqs: [
        {
          question: "什么是 MetaMask？",
          answer: "MetaMask 是一个浏览器扩展和移动应用，允许您在网络上管理以太坊账户。它充当您与区块链之间的网关。",
        },
        {
          question: "什么是 WalletConnect？",
          answer: "WalletConnect 是一个开放协议，允许钱包应用和 DApp 之间的安全通信。它通过扫描二维码建立连接，无需在浏览器中安装扩展。",
        },
        {
          question: "哪个钱包最安全？",
          answer: "所有主流钱包（MetaMask、Trust Wallet、Ledger 等）都很安全。安全性更多取决于您如何管理您的私钥和恢复短语。",
        },
        {
          question: "我可以在多个设备上使用同一个钱包吗？",
          answer: "是的。您可以使用相同的私钥或恢复短语在多个设备上恢复您的钱包。但请注意，这会增加私钥泄露的风险。",
        },
        {
          question: "连接钱包会暴露我的私钥吗？",
          answer: "不会。连接钱包只是授权 DApp 查看您的地址和余额，以及请求交易签名。您的私钥始终由钱包应用保管。",
        },
        {
          question: "我忘记了钱包密码怎么办？",
          answer: "如果您有恢复短语，可以在任何钱包应用中导入它来恢复账户。如果您没有恢复短语，您将无法访问您的资产。",
        },
        {
          question: "交易需要多长时间确认？",
          answer: "这取决于区块链网络的拥堵情况。通常需要几秒到几分钟。您可以在区块链浏览器中查看交易状态。",
        },
        {
          question: "Gas 费用是什么？",
          answer: "Gas 费用是在区块链上执行交易所需的费用。费用取决于网络拥堵情况和交易复杂性。",
        },
      ],
    },
  ],
};

export default walletConnectionGuide;
