import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DrashtiGyanLogo } from '@/components/branding/DrashtiGyanLogo';
import type { LucideIcon } from 'lucide-react';
import { ChevronUp, LogOut, Mail } from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface SidebarProps {
  logoTitle?: string;
  logoSubtitle?: string;
  LogoIcon?: React.ReactNode;
  items: NavItem[];
  userRole?: 'student' | 'teacher';
  userName?: string;
  userEmail?: string;
  userSubtitle?: string;
  bottomComponent?: React.ReactNode;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  logoTitle: _logoTitle = "DrashtiGyan",
  logoSubtitle: _logoSubtitle = "ज्ञान की नई दृष्टि",
  LogoIcon: _LogoIcon,
  items,
  userName = "User",
  userEmail,
  userSubtitle = "Account",
  bottomComponent,
  onLogout
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="w-[272px] h-screen fixed top-0 left-0 bg-[#0F1629] border-r border-white/5 flex flex-col z-20">
      
      {/* Logo Area */}
      <div className="flex items-center gap-3 p-6 h-20">
        <DrashtiGyanLogo size="default" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/student/dashboard' || item.path === '/teacher/dashboard'}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative overflow-hidden group",
                isActive
                  ? "text-indigo-400 bg-indigo-500/15"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom User Area */}
      <div className="p-4 mt-auto space-y-3">
        {bottomComponent}

        {menuOpen && (
          <div className="rounded-2xl border border-white/10 bg-[#121B33] p-3 shadow-2xl">
            {userEmail && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{userEmail}</span>
              </div>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:border-white/10 hover:bg-white/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
            {initials || 'U'}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-xs text-slate-400">{userSubtitle}</p>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              menuOpen ? "rotate-0" : "rotate-180"
            )}
          />
        </button>
      </div>
    </aside>
  );
};
