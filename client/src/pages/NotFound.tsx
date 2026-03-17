import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-2xl font-semibold text-gray-700 mb-2">
          页面未找到
        </p>
        <p className="text-gray-600 mb-8">
          抱歉，您访问的页面不存在或已被移除
        </p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </Button>
      </div>
    </div>
  );
}
