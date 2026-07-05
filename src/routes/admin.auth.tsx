import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AdminAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passkey, setPasskey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Architectural Guardrail: Validate credentials & security token concurrently via backend RPC
      // const response = await loginAdmin({ email, password, passkey });
      // if (response.success) navigate({ to: '/admin/dashboard' });
      
      // Simulating API state transition
      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = '/admin/dashboard';
    } catch (err: any) {
      setError(err?.message || 'Access Denied: Invalid Administrative Credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-slate-950 px-4">
      {/* Claymorphism Ambient Background Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--sky-soft)] rounded-full blur-[128px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-[var(--teal-soft)] rounded-full blur-[160px] opacity-30 pointer-events-none -translate-y-1/2" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[var(--mint-soft)] rounded-full blur-[96px] opacity-40 pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="clay relative w-full max-w-md p-8 sm:p-10 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 p-0.5 shadow-xl shadow-sky-500/10 mb-4">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">The Apron Boy</h1>
          <p className="text-xs font-semibold tracking-widest text-sky-400 uppercase mt-1">Super Admin Core</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center animate-fade-in">
              {error}
            </div>
          )}

          {/* Admin Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 pl-1">Admin Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@theapronboy.com"
                className="clay-inset w-full bg-slate-900/60 pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border border-white/5 focus:outline-none focus:border-sky-500/30 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 pl-1">Master Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="clay-inset w-full bg-slate-900/60 pl-11 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-600 border border-white/5 focus:outline-none focus:border-sky-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Security Passkey Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 pl-1">Security Token / Passkey</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="TAB-SECURE-XXXXXX"
                className="clay-inset w-full bg-slate-900/60 pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border border-white/5 focus:outline-none focus:border-sky-500/30 transition-all font-mono tracking-wider"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="clay-btn w-full mt-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating Environment Access...
              </>
            ) : (
              'Authenticate Command Session'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}