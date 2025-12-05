/**
 * 登录页面
 * Requirements: 10.1, 10.3
 */

import LoginForm from '@/components/LoginForm';

export default function LoginPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Perplexity 微信发布器
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            请输入管理员密码登录
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-500">
          自动化内容聚合与发布平台
        </p>
      </div>
    </div>
  );
}
