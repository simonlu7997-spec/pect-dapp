import { Mail, Github, Twitter } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleProductClick = (path: string) => {
    // 显示钱包连接提示
    alert('请先连接钱包');
    // 可选：跳转到页面
    // navigate(path);
  };

  const handleResourceClick = (path: string) => {
    // 显示钱包连接提示
    alert('请先连接钱包');
    // 可选：跳转到页面
    // navigate(path);
  };

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
              <li><button onClick={() => handleProductClick('/buy')} className="hover:text-emerald-400 transition-colors bg-none border-none p-0 cursor-pointer text-left">代币购买</button></li>
              <li><button onClick={() => handleProductClick('/portfolio')} className="hover:text-emerald-400 transition-colors bg-none border-none p-0 cursor-pointer text-left">收益分红</button></li>
              <li><button onClick={() => handleProductClick('/stake')} className="hover:text-emerald-400 transition-colors bg-none border-none p-0 cursor-pointer text-left">质押奖励</button></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">资源</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => handleResourceClick('/docs')} className="hover:text-emerald-400 transition-colors bg-none border-none p-0 cursor-pointer text-left">文档</button></li>
              <li><button onClick={() => handleResourceClick('/faq')} className="hover:text-emerald-400 transition-colors bg-none border-none p-0 cursor-pointer text-left">常见问题</button></li>
              <li><button onClick={() => handleResourceClick('/contact')} className="hover:text-emerald-400 transition-colors bg-none border-none p-0 cursor-pointer text-left">联系我们</button></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-white mb-4">关注我们</h4>
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; {currentYear} PECT. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-emerald-400 transition-colors">隐私政策</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">服务条款</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
