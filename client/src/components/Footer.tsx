import { Mail, Github, Twitter, MessageCircle, Send } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-lg text-white">PECT</span>
            </div>
            <p className="text-sm text-gray-400">
              光伏电站收益与碳信用管理平台
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">产品</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/buy" className="hover:text-emerald-400 transition-colors">代币购买</a></li>
              <li><a href="/portfolio" className="hover:text-emerald-400 transition-colors">收益分红</a></li>
              <li><a href="/stake" className="hover:text-emerald-400 transition-colors">质押奖励</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">资源</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/docs" className="hover:text-emerald-400 transition-colors">项目文档</a></li>
              <li><a href="/faq" className="hover:text-emerald-400 transition-colors">常见问题</a></li>
              <li><a href="/contact" className="hover:text-emerald-400 transition-colors">联系我们</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-white mb-4">关注我们</h4>
            <div className="flex gap-4">
              <a
                href="https://x.com/PECT_OFCL"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                title="Twitter / X"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://t.me/PECT_OFCL"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                title="Telegram"
              >
                <Send className="w-5 h-5" />
              </a>
              <a
                href="https://discord.gg/6DGzsQpw4"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                title="Discord"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/simonlu7997-spec/pect-contracts"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                title="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@pect-dapp.io"
                className="hover:text-emerald-400 transition-colors"
                title="邮件"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; {currentYear} PECT. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="/privacy" className="hover:text-emerald-400 transition-colors">隐私政策</a>
              <a href="/terms" className="hover:text-emerald-400 transition-colors">服务条款</a>
              <a href="/disclaimer" className="hover:text-emerald-400 transition-colors">免责声明</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
