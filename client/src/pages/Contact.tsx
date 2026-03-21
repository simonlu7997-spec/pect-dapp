import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Github, Twitter, Linkedin, MapPin, Phone } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("感谢您的留言，我们会尽快回复您！");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "邮件",
      description: "发送邮件给我们",
      content: "support@pect.io",
      link: "mailto:support@pect.io"
    },
    {
      icon: MessageCircle,
      title: "Discord",
      description: "加入我们的社区",
      content: "PECT Community",
      link: "#"
    },
    {
      icon: Twitter,
      title: "Twitter",
      description: "关注我们的最新动态",
      content: "@PECT_Official",
      link: "#"
    },
    {
      icon: Github,
      title: "GitHub",
      description: "查看开源代码",
      content: "PECT-Project",
      link: "#"
    },
    {
      icon: MapPin,
      title: "地址",
      description: "访问我们的办公室",
      content: "中国，北京",
      link: "#"
    },
    {
      icon: Phone,
      title: "电话",
      description: "拨打我们的热线",
      content: "+86 (10) 1234-5678",
      link: "tel:+861012345678"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-20">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            联系我们
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            有任何问题或建议？我们很乐意听到您的意见。请通过以下方式与我们联系。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">联系方式</h2>
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <a
                  key={index}
                  href={method.link}
                  className="block p-4 rounded-lg bg-white border-2 border-gray-200 hover:border-green-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">{method.title}</p>
                      <p className="text-sm text-gray-600">{method.description}</p>
                      <p className="text-sm text-green-600 font-medium mt-1">{method.content}</p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-green-200 bg-white">
              <CardHeader>
                <CardTitle>发送消息</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="您的姓名"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        邮箱
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="您的邮箱"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主题
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="消息主题"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      消息内容
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={5}
                      placeholder="请输入您的消息..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
                  >
                    发送消息
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle>常见问题</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">响应时间</h3>
                <p className="text-gray-600 text-sm">
                  我们通常在 24 小时内回复所有邮件。对于紧急问题，请通过 Discord 或电话联系我们。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">支持语言</h3>
                <p className="text-gray-600 text-sm">
                  我们支持中文、英文和日文。请在邮件中注明您的首选语言。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">技术支持</h3>
                <p className="text-gray-600 text-sm">
                  如需技术支持，请提供您的钱包地址和详细的问题描述，以便我们快速定位问题。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">商务合作</h3>
                <p className="text-gray-600 text-sm">
                  如有商务合作意向，请发送邮件至 business@pect.io，我们会尽快与您联系。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
