import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';
import { useModuleStore, ERP_MODULES } from '../store/moduleStore';
import { useThemeStore } from '../store/themeStore';

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { activeModuleId, setModule } = useModuleStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const activeModule = ERP_MODULES.find(m => m.id === activeModuleId);

  const handleLogout = () => { logout(); setModule(null); navigate('/login'); };
  const goModules = () => { navigate('/modules'); };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar collapsed={collapsed} />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between shadow-sm flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Collapse Toggle */}
            <button onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {collapsed
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                }
              </svg>
            </button>

            {/* Breadcrumb: Home > Module */}
            <div className="flex items-center gap-2 text-sm hidden sm:flex">
              <button onClick={goModules} className="text-slate-400 hover:text-indigo-600 transition-colors font-medium flex items-center gap-1">
                <span className="text-base">⊞</span>
                <span>Modules</span>
              </button>
              {activeModule && (
                <>
                  <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${activeModule.color} text-white text-xs font-semibold`}>
                    <span>{activeModule.icon}</span>
                    <span>{activeModule.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-300 transition-colors">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input placeholder="Search..." className="bg-transparent text-sm outline-none text-slate-600 w-32" />
            </div>

            {/* Dark Mode Toggle */}
            <button onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 relative transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>

            {/* User avatar + logout */}
            <button onClick={handleLogout}
              className="flex items-center gap-2.5 hover:bg-slate-100 rounded-xl px-3 py-2 transition-colors"
              title="Logout">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-slate-700 leading-tight">{user?.full_name || 'Admin'}</div>
                <div className="text-xs text-slate-400">Logout</div>
              </div>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
