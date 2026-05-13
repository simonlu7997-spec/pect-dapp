import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Github, Twitter, MessageCircle, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    },
    onError: (err) => {
      toast.error(`发送失败：${err.message || "请稍后重试，或直接发送邮件至 contact@pect-dapp.io"}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "邮件",
      description: "发送邮件给我们",
      content: "contact@pect-dapp.io",
      link: "mailto:contact@pect-dapp.io"
    },
    {
      icon: Twitter,
      title: "Twitter / X",
      description: "关注我们的最新动态",
      content: "@PECT_OFCL",
      link: "https://x.com/PECT_OFCL"
    },
    {
      icon: Send,
      title: "Telegram",
      description: "加入 Telegram 群组",
      content: "t.me/PECT_OFCL",
      link: "https://t.me/PECT_OFCL"
    },
    {
      icon: MessageCircle,
      title: "Discord",
      description: "加入我们的社区",
      content: "PECT Community",
      link: "https://discord.gg/6DGzsQpw4"
    },
    {
      icon: Github,
      title: "GitHub",
      description: "查看开源代码",
      content: "PECT-Project",
      link: "https://github.com/simonlu7997-spec/pect-contracts"
    },
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">联系方式</h2>
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <a
                  key={index}
                  href={method.link}
                  target={method.link.startsWith("http") ? "_blank" : undefined}
                  rel={method.link.startsWith("http") ? "noopener noreferrer" : undefined}
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
                {submitted ? (
                  /* 成功状态 */
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                    <h3 className="text-xl font-semibold text-gray-900">消息已发送！</h3>
                    <p className="text-gray-600 max-w-sm">
                      感谢您的留言，我们通常在 24 小时内回复。
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => setSubmitted(false)}
                    >
                      再次发送
                    </Button>
                  </div>
                ) : (
                  /* 表单 */
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
                          disabled={submitMutation.isPending}
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
                          disabled={submitMutation.isPending}
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
                        disabled={submitMutation.isPending}
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
                        disabled={submitMutation.isPending}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          发送中...
                        </>
                      ) : (
                        "发送消息"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
