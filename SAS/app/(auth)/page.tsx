'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok && data.user) {
        const role = data.user.role?.toLowerCase().trim() || 'super_user';
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_email', data.user.email || '');
        localStorage.setItem('user_department', data.user.department || '');
        document.cookie = `access_token=${data.access_token}; path=/; max-age=86400`;
        document.cookie = `user_role=${role}; path=/; max-age=86400`;

        if      (role.includes('admin'))     router.push('/admin/dashboard');
        else if (role.includes('operation')) router.push('/operation_user/dashboard');
        else if (role.includes('sales'))     router.push('/sales_user/dashboard');
        else if (role.includes('super'))     router.push('/Super_user/dashboard');
      } else {
        setError(data.error || 'Login failed. Please verify credentials.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setError('Connection failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEmail(v);
    if (v === '' || isValidEmail(v)) setError('');
    else if (v.length > 5 && !v.includes('@'))
      setError('Please include an "@" in the email address.');
  };

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT — brand panel ─────────────────────────────── */}
      {/*
        FIX: The original had justify-between which pushed the top content
        to the very top of the panel. We now use justify-between with
        explicit padding so the top section is properly padded and the
        middle content sits naturally in the flow, not at pixel 0.
        The relative + overflow-hidden is kept for the decorative blurs.
      */}
      <div className="hidden lg:flex lg:w-2/3 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>

        {/* Decorative blurred circles — purely visual */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400 rounded-full opacity-15 blur-3xl pointer-events-none" />
        <div className="absolute top-3/4 left-1/3 w-48 h-48 bg-indigo-400 rounded-full opacity-10 blur-2xl pointer-events-none" />

        {/*
          FIX: Inner wrapper uses flex-col + justify-between + h-full + p-12
          Previously the content div was NOT a flex child with h-full,
          so justify-between had nothing to work against and collapsed to top.
        */}
        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 text-white">

          {/* Top — logo / system name */}
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-blue-200 mb-1">
              SAS SYSTEMS
            </p>
          </div>

          {/* Middle — main brand copy */}
          <div className="max-w-xl">
            <h1 className="text-5xl font-extrabold leading-tight mb-6 tracking-tight">
              Dart Global<br />Logistic
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed">
              Secure, real-time alert management for global supply chains.
              Monitor critical shipments, resolve anomalies instantly, and maintain
              operational integrity with the SAS Platform.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mt-8">
              {['Real-time Alerts', 'SOC2 Compliant', 'End-to-End Encrypted'].map(f => (
                <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom — stats */}
          <div className="grid grid-cols-2 gap-10 max-w-sm">
            <div>
              <div className="text-4xl font-extrabold mb-1 tracking-tight">99.9%</div>
              <div className="text-blue-200 text-sm font-medium">Uptime Reliability</div>
              <div className="mt-1 text-xs text-blue-300">SOC2 Compliant</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold mb-1 tracking-tight">&lt; 200ms</div>
              <div className="text-blue-200 text-sm font-medium">Alert Latency</div>
              <div className="mt-1 text-xs text-blue-300">End-to-End Encrypted</div>
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT — login form ─────────────────────────────── */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8"
           style={{ background: '#F8FAFC' }}>
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-sm text-gray-500">
              Please enter your credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password" id="password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-4 py-3 border rounded-lg text-sm outline-none transition-all
                           border-gray-200 bg-white text-gray-900
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder:text-gray-400"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-md" data-testid="login-error">
                {error}
              </div>
            )}

            {/* Remember */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="remember"
                checked={rememberDevice}
                onChange={e => setRememberDevice(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isValidEmail(email)}
              data-testid="login-submit-btn"
              className={`w-full text-white py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing In…
                </span>
              ) : 'Sign In to Dashboard'}
            </button>

          </form>
        </div>
      </div>

    </div>
  );
}