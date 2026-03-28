'use client';

import { useState, FormEvent, ChangeEvent } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle login logic here
    console.log({ email, password, rememberDevice });
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleRememberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRememberDevice(e.target.checked);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-700 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-sm font-semibold tracking-wider mb-20">SAS SYSTEMS</h1>
          
          <div className="max-w-xl">
            <h2 className="text-5xl font-bold mb-6 leading-tight">Dart Global Logistic</h2>
            <p className="text-lg text-blue-100 leading-relaxed">
              Secure, real-time alert management for global supply chains.
              Monitor critical shipments, resolve anomalies instantly, and maintain
              operational integrity with the SAS Platform.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-12 max-w-2xl">
          <div>
            <div className="text-4xl font-bold mb-2">99.9%</div>
            <div className="text-blue-200 text-sm">Uptime Reliability</div>
            <div className="mt-4 text-xs text-blue-300">SOC2 Compliant</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">&lt; 200ms</div>
            <div className="text-blue-200 text-sm">Alert Latency</div>
            <div className="mt-4 text-xs text-blue-300">End-to-End Encrypted</div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/3 bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-sm">
              Please enter your credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Remember Device Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberDevice}
                onChange={handleRememberChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
