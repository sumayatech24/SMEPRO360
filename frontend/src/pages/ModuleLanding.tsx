import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERP_MODULES, ErpModule, useModuleStore } from '../store/moduleStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../api/client';

export default function ModuleLanding() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { setModule } = useModuleStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');
  }, []);

  useEffect(() => {
    // Load user's roles from RBAC
    api.get('/admin/rbac/my-permissions').then(r => {
      setUserRoles(r.data.roles || []);
      if (r.data.is_superuser) setUserRoles(['super_admin']);
    }).catch(() => {
      // Fallback: if superuser from localStorage
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.is_superuser) setUserRoles(['super_admin']);
    }).finally(() => setLoadingRoles(false));
  }, []);

  const canAccessModule = (mod: ErpModule): boolean => {
    if (!mod.roles.length) return true;
    if (userRoles.includes('super_admin') || userRoles.includes('admin')) return true;
    return mod.roles.some(r => userRoles.includes(r));
  };

  const accessibleModules = ERP_MODULES.filter(canAccessModule);

  const enterModule = (mod: ErpModule) => {
    setModule(mod.id);
    navigate(mod.defaultPath);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const colorMap: Record<string, { card: string; badge: string; dot: string }> = {
    'from-violet-600 to-purple-700':   { card:'hover:border-violet-400 hover:shadow-violet-100',  badge:'bg-violet-600', dot:'bg-violet-500' },
    'from-cyan-600 to-sky-700':        { card:'hover:border-cyan-400 hover:shadow-cyan-100',      badge:'bg-cyan-600',   dot:'bg-cyan-500' },
    'from-sky-500 to-blue-600':        { card:'hover:border-sky-400 hover:shadow-sky-100',        badge:'bg-sky-500',    dot:'bg-sky-400' },
    'from-orange-500 to-amber-600':    { card:'hover:border-orange-400 hover:shadow-orange-100',  badge:'bg-orange-500', dot:'bg-orange-400' },
    'from-green-600 to-emerald-700':   { card:'hover:border-green-400 hover:shadow-green-100',    badge:'bg-green-600',  dot:'bg-green-500' },
    'from-pink-600 to-rose-700':       { card:'hover:border-pink-400 hover:shadow-pink-100',      badge:'bg-pink-600',   dot:'bg-pink-500' },
    'from-purple-600 to-indigo-700':   { card:'hover:border-purple-400 hover:shadow-purple-100',  badge:'bg-purple-600', dot:'bg-purple-500' },
    'from-yellow-500 to-orange-600':   { card:'hover:border-yellow-400 hover:shadow-yellow-100',  badge:'bg-yellow-500', dot:'bg-yellow-400' },
    'from-teal-600 to-emerald-700':    { card:'hover:border-teal-400 hover:shadow-teal-100',      badge:'bg-teal-600',   dot:'bg-teal-500' },
    'from-indigo-600 to-blue-700':     { card:'hover:border-indigo-400 hover:shadow-indigo-100',  badge:'bg-indigo-600', dot:'bg-indigo-500' },
    'from-lime-600 to-green-700':      { card:'hover:border-lime-400 hover:shadow-lime-100',      badge:'bg-lime-600',   dot:'bg-lime-500' },
    'from-slate-600 to-gray-700':      { card:'hover:border-slate-400 hover:shadow-slate-100',    badge:'bg-slate-600',  dot:'bg-slate-500' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg">S</div>
          <div>
            <div className="font-bold text-white text-lg tracking-wide">SMEPRO<span className="text-indigo-400">360</span></div>
            <div className="text-xs text-slate-400">Enterprise Resource Planning</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-300 hidden sm:block">
            {greeting}, <span className="text-white font-semibold">{user?.full_name?.split(' ')[0] || 'Admin'}</span> 👋
          </div>
          {userRoles.length > 0 && (
            <div className="flex gap-1 hidden sm:flex">
              {userRoles.slice(0,2).map(r=>(
                <span key={r} className="text-xs bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full capitalize">{r.replace('_',' ')}</span>
              ))}
              {userRoles.length > 2 && <span className="text-xs text-slate-400">+{userRoles.length-2}</span>}
            </div>
          )}
          <button onClick={toggleTheme}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            title={isDark ? 'Light Mode' : 'Dark Mode'}>
            <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 text-sm transition-all">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm">{user?.full_name?.[0]||'A'}</div>
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center px-8 pt-12 pb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Module</span>
        </h1>
        <p className="text-slate-400 text-base max-w-xl mx-auto">
          {accessibleModules.length} module{accessibleModules.length !== 1?'s':''} available based on your role.
          Click any module to enter its workspace.
        </p>
      </div>

      {/* Module Grid */}
      <div className="px-6 sm:px-10 pb-16 max-w-7xl mx-auto">
        {loadingRoles ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({length:8}).map((_,i)=>(
              <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {accessibleModules.map(mod => {
              const style = colorMap[mod.color] || { card:'hover:border-indigo-400', badge:'bg-indigo-600', dot:'bg-indigo-500' };
              return (
                <button
                  key={mod.id}
                  onClick={() => enterModule(mod)}
                  className={`relative group bg-white/5 border border-white/10 rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${style.card} cursor-pointer backdrop-blur-sm`}
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-2xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    {mod.icon}
                  </div>

                  {/* Content */}
                  <div className="font-bold text-white text-base leading-tight mb-1.5">{mod.name}</div>
                  <div className="text-slate-400 text-xs leading-relaxed line-clamp-2">{mod.description}</div>

                  {/* Arrow indicator */}
                  <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <span>Enter</span>
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Active dot */}
                  <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${style.dot} opacity-60 group-hover:opacity-100`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-xs text-slate-600">
        SMEPRO360 Enterprise ERP v1.0.0 · All modules · {new Date().getFullYear()}
      </div>
    </div>
  );
}
