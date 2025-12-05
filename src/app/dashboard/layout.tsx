/**
 * 仪表盘布局组件
 * Requirements: 11.1
 */

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
