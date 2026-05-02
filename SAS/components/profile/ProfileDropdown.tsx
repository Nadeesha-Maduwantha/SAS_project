'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  // Fallback to local storage if API is still loading/failing
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
       return { full_name: 'Loading...', role: localStorage.getItem('user_role') || '', email: '' };
    }
    return { full_name: 'Loading...', role: '', email: '' };
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch the logged-in user's details
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.user) {
          setUser({
             full_name: data.user.fullName || data.user.full_name || 'Dart User', 
             email: data.user.email || '',
             role: data.user.role || localStorage.getItem('user_role') || ''
          });
        } else {
          console.error("Backend /me error:", data.error);
        }
      } catch (error) {
        console.error('Failed to fetch profile. Make sure the Flask backend is running and recently restarted.', error);
      }
    };
    fetchProfile();
  }, []);

  // Handle logout action
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'user_role=; path=/; max-age=0';
    router.push('/'); // Redirect to login
  };

  // Get matching Next.js folder base path based on role
  const getBasePath = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('admin')) return '/admin';
    if (r.includes('operation')) return '/operation_user';
    if (r.includes('sales')) return '/sales_user';
    if (r.includes('super')) return '/Super_user'; 
    return '/admin'; // fallback
  };

  const formatRole = (role: string) => {
    if (!role) return 'Loading...';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const basePath = getBasePath(user.role);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable Header Target */}
      <div 
        className="flex items-center gap-3 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm bg-cover bg-center" 
             style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${user.full_name}&background=ebd5c9&color=333')` }}>
        </div>
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-gray-800">{user.full_name}</span>
          <span className="text-xs text-gray-500">{formatRole(user.role)}</span>
        </div>
      </div>

      {/* The Popup Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[260px] bg-white rounded-xl shadow-lg border border-gray-100 z-50">
          
          <div className="p-4 flex items-center gap-4 bg-slate-50/50 rounded-t-xl">
             <div className="w-12 h-12 rounded-full flex-shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('https://ui-avatars.com/api/?name=${user.full_name}&background=ebd5c9&color=333&size=128')` }}>
             </div>
             <div className="overflow-hidden">
                <h3 className="text-[15px] font-semibold text-slate-800 truncate">{user.full_name}</h3>
                <p className="text-[13px] text-slate-500 truncate mt-0.5">{formatRole(user.role)}</p>
                <p className="text-[12px] text-slate-400 truncate mt-0.5">{user.email}</p>
             </div>
          </div>

          <hr className="border-gray-100 mx-2" />

          <div className="py-2">
            <button 
              onClick={() => { setIsOpen(false); router.push(`${basePath}/profile`); }} 
              className="w-full flex items-center gap-3 px-5 py-2.5 text-[14px] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <User size={18} className="text-slate-400" />
              My Profile
            </button>
            <button 
              onClick={() => { setIsOpen(false); router.push(`${basePath}/settings`); }}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-[14px] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Settings size={18} className="text-slate-400" />
              Account Settings
            </button>
          </div>

          <hr className="border-gray-100 mx-2" />

          <div className="py-2 mb-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors bg-white font-medium"
            >
              <LogOut size={18} className="text-red-500" />
              Logout
            </button>
          </div>

        </div>
      )}
    </div>
  );
}