'use client';

import { useState, useEffect } from 'react';
import ProfilePage from "@/components/profile/ProfilePage";

export default function SuperUserProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (response.ok && data.user) {
          // Send backend data exactly as ProfilePage expects it
          setUser({
            id: data.user.id || "1",
            fullName: data.user.fullName || data.user.full_name || "Profile User",
            email: data.user.email,
            phoneNumber: data.user.phoneNumber || "+94 77 000-0000",
            department: data.user.department || "Administration",
            role: data.user.role,
            status: "Active",
            isVerified: true,
            lastLogin: "Today",
            memberSince: data.user.memberSince || data.user.created_at?.slice(0,10) || "Recently",
            avatarUrl: null
          });
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading profile data...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-red-500">Failed to load profile data check backend.</div>;
  }

  return (
    <div style={{ marginLeft: '10px' }}>
      <ProfilePage user={user} />
    </div>
  );
}
