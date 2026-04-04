import React from 'react';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet } from 'react-router-dom';

interface DashboardLayoutProps {
  navItems: NavItem[];
  userRole: 'student' | 'teacher';
  userName: string;
  userEmail?: string;
  userSubtitle: string;
  logoTitle?: string;
  logoSubtitle?: string;
  LogoIcon?: React.ReactNode;
  bottomComponent?: React.ReactNode;
  topbarProps?: React.ComponentProps<typeof Topbar>;
  onLogout?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  navItems,
  userRole,
  userName,
  userEmail,
  userSubtitle,
  logoTitle,
  logoSubtitle,
  LogoIcon,
  bottomComponent,
  topbarProps,
  onLogout
}) => {
  return (
    <div className="flex min-h-screen bg-[#0A0E1A]">
      <Sidebar
        items={navItems}
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        userSubtitle={userSubtitle}
        logoTitle={logoTitle}
        logoSubtitle={logoSubtitle}
        LogoIcon={LogoIcon}
        bottomComponent={bottomComponent}
        onLogout={onLogout}
      />
      
      <main className="flex-1 ml-[272px] flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <Topbar {...topbarProps} />
        
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
