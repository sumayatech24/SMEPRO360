import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useModuleStore, MODULE_NAV, ERP_MODULES } from '../store/moduleStore';

const Sidebar: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeModuleId, setModule } = useModuleStore();
  const [collapsed_sections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const activeModule = ERP_MODULES.find(m => m.id === activeModuleId);
  const navItems = activeModuleId ? (MODULE_NAV[activeModuleId] || []) : [];

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  const goHome = () => { setModule(null); navigate('/modules'); };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-slate-900 text-white z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="h-14 border-b border-slate-700/60 flex items-center flex-shrink-0 px-3 gap-2">
        {collapsed ? (
          <button onClick={goHome} className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg hover:opacity-90 transition-opacity mx-auto" title="Back to Modules">
            S
          </button>
        ) : (
          <>
            <Logo size="sm" />
          </>
        )}
      </div>

      {/* Module badge + back button */}
      {!collapsed && activeModule && (
        <div className="px-3 py-2 border-b border-slate-700/40 flex-shrink-0">
          <button onClick={goHome}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-all group">
            <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>All Modules</span>
          </button>
          <div className="mt-1.5 px-2 py-1.5 rounded-lg flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${activeModule.color} flex items-center justify-center text-xs flex-shrink-0`}>
              {activeModule.icon}
            </div>
            <span className="text-xs font-semibold text-white truncate">{activeModule.name}</span>
          </div>
        </div>
      )}

      {/* Dashboard link always visible */}
      <div className={`px-2 pt-2 flex-shrink-0 ${collapsed ? '' : ''}`}>
        <Link to="/dashboard"
          className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all mb-0.5 ${isActive('/dashboard') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Dashboard' : undefined}>
          <span className="text-base leading-none flex-shrink-0">📊</span>
          {!collapsed && <span>Dashboard</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg z-50">
              Dashboard
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
            </span>
          )}
        </Link>
      </div>

      {/* Module Nav Items */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
        {navItems.length === 0 && !activeModuleId && (
          // No module selected — show minimal nav
          <div className="mt-4 px-3">
            {!collapsed && (
              <div className="text-xs text-slate-600 text-center py-4">
                ← Select a module from<br/>the home screen
              </div>
            )}
          </div>
        )}

        {navItems.map(item => {
          const act = isActive(item.path);
          return (
            <Link key={item.path} to={item.path}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all mb-0.5 ${act ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${collapsed ? 'justify-center px-2' : ''}`}>
              {act && !collapsed && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-white/70 rounded-r-full" />}
              <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate leading-tight">{item.label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg z-50">
                  {item.label}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
                </span>
              )}
            </Link>
          );
        })}

        {/* Quick cross-module links when in a module */}
        {!collapsed && activeModuleId && (
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 mb-2">Quick Access</div>
            {[
              {path:'/approvals',icon:'✅',label:'Approvals'},
              {path:'/reports',icon:'📈',label:'Reports'},
            ].map(item=>(
              <Link key={item.path} to={item.path} onClick={()=>setModule('reports')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all mb-0.5">
                <span>{item.icon}</span><span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-slate-700/60 flex-shrink-0">
          <button onClick={goHome}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-left group">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">S</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-300 truncate">SMEPRO360</div>
              <div className="text-[10px] text-slate-500">← Back to modules</div>
            </div>
            <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M3 12l4-4m-4 4l4 4" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
