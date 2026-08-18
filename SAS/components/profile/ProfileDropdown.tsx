
'use client';

// =============================================================
//  File: components/profile/ProfileDropdown.tsx
//  Adds dark/light mode toggle switch to the dropdown.
// =============================================================

import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser]     = useState<{ full_name: string; role: string; email: string; avatarUrl: string | null }>(
    { full_name: '', role: '', email: '', avatarUrl: null }
  );
  const dropdownRef         = useRef<HTMLDivElement>(null);
  const router              = useRouter();
  const { isDark, toggleTheme } = useTheme();

  // Load cached user from localStorage immediately
  useEffect(() => {
    const cachedRole = localStorage.getItem('user_role') || '';
    const cachedName = localStorage.getItem('user_name') || '';
    setUser(prev => ({
      ...prev,
      role:      cachedRole,
      full_name: cachedName || 'Loading...',
    }));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live user from API
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res  = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok && data.user) {
          setUser({
            full_name: data.user.fullName || data.user.full_name || 'Dart User',
            email:     data.user.email    || '',
            role:      data.user.role     || localStorage.getItem('user_role') || '',
            avatarUrl: data.user.avatarUrl || null,
          });
        }
      } catch (err) {
        console.error('ProfileDropdown: failed to fetch user', err);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'user_role=; path=/; max-age=0';
    router.push('/');
  };

  const getBasePath = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('admin'))     return '/admin';
    if (r.includes('operation')) return '/operation_user';
    if (r.includes('sales'))     return '/sales_user';
    if (r.includes('super'))     return '/Super_user';
    return '/admin';
  };

  const formatRole = (role: string) => {
    if (!role) return '';
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const basePath   = getBasePath(user.role);
  const avatarUrl  = user.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=ebd5c9&color=333&size=128`;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Trigger ─────────────────────────────────────────── */}
      <div
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-3 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div
          className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center flex-shrink-0"
          style={{ backgroundImage: `url('${avatarUrl}')` }}
        />
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
            {user.full_name}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {formatRole(user.role)}
          </span>
        </div>
      </div>

      {/* ── Dropdown ────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[270px] rounded-xl shadow-xl border z-50
                        bg-white border-gray-100
                        dark:bg-slate-800 dark:border-slate-700">

          {/* User info header */}
          <div className="p-4 flex items-center gap-3 rounded-t-xl
                          bg-slate-50/60 dark:bg-slate-700/60">
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${avatarUrl}')` }}
            />
            <div className="overflow-hidden">
              <h3 className="text-[14px] font-semibold truncate
                             text-slate-800 dark:text-slate-100">
                {user.full_name}
              </h3>
              <p className="text-[12px] truncate mt-0.5
                            text-slate-500 dark:text-slate-400">
                {formatRole(user.role)}
              </p>
              <p className="text-[11px] truncate mt-0.5
                            text-slate-400 dark:text-slate-500">
                {user.email}
              </p>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-slate-700 mx-2" />

          {/* Actions */}
          <div className="py-1.5">

            {/* My Profile */}
            <button
              onClick={() => { setIsOpen(false); router.push(`${basePath}/profile`); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors
                         text-slate-600 hover:bg-slate-50
                         dark:text-slate-300 dark:hover:bg-slate-700/60"
            >
              <User size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              My Profile
            </button>

            {/* ── Dark / Light mode toggle ───────────────────── */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                {isDark
                  ? <Moon size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  : <Sun  size={16} className="text-slate-400 flex-shrink-0" />
                }
                <span className="text-[13px] text-slate-600 dark:text-slate-300">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>

              {/* Toggle switch */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className={`relative inline-flex h-5 w-9 items-center rounded-full
                            transition-colors duration-300 focus:outline-none
                            ${isDark ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow
                              transition-transform duration-300
                              ${isDark ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
            </div>

          </div>

          <hr className="border-gray-100 dark:border-slate-700 mx-2" />

          {/* Logout */}
          <div className="py-1.5 mb-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors
                         text-red-600 hover:bg-red-50
                         dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut size={16} className="text-red-500 dark:text-red-400 flex-shrink-0" />
              Logout
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
