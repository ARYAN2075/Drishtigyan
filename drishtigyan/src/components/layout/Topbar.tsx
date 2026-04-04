import React from 'react';
import { Bell, Settings, Search } from 'lucide-react';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  rightComponent?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  showSearch = true,
  searchPlaceholder = "Search...",
  rightComponent
}) => {
  return (
    <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-10 bg-[#0A0E1A]/80 backdrop-blur-md border-b border-white/5">
      <div className="flex-1 min-w-0">
        {title && <h1 className="text-2xl font-clash font-semibold text-white truncate">{title}</h1>}
        {subtitle && <p className="text-sm text-slate-400 truncate mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        {showSearch && (
          <div className="relative max-w-md w-full ml-8 mr-4 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full bg-[#0F1629] border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        )}

        {rightComponent}

        <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
          <button className="relative p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[#0A0E1A]" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
