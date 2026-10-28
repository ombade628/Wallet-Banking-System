import React, { useEffect, useRef, useState } from 'react';
import { useBanking } from '../../context/BankingContext';
import { UserRole } from '../../types';

// Real seeded user from V2__seed_admin.sql
const SEEDED_BANK_EMAIL = 'badeom628@javabank.com';

export const LoginView: React.FC = () => {
  const { login, navigate, showToast } = useBanking();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Caps lock detection on password field
  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const ok = await login(trimmedEmail, password, role);
      if (!ok) {
        // login() already showed a toast; add field-level message
        setError('Invalid credentials, or this account is not assigned the selected role.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your email first, then click "Forgot password?"');
      emailRef.current?.focus();
      return;
    }
    setForgotLoading(true);
    try {
      // Backend always returns 204 to avoid leaking user existence
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        }
      );
      showToast(
        `If ${trimmed} is registered, a reset link was dispatched.`,
        'info'
      );
    } catch {
      showToast('Could not reach the server. Please try again.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const useDevAccount = (devRole: UserRole) => {
    setRole(devRole);
    setEmail(SEEDED_BANK_EMAIL);
    setPassword('');
    setError(null);
    passwordRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center px-4 py-12">
      <div className="flex flex-col w-full items-center justify-center max-w-[420px]">
        {/* Branding */}
        <header className="flex flex-col items-center mb-6 text-center select-none">
          <div className="flex items-center gap-2 justify-center mb-1">
            <div className="w-10 h-10 rounded-lg bg-[#0a3d62] flex items-center justify-center shadow-sm text-white">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <line x1="4" x2="16" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="14" y1="18" y2="18" />
                <circle className="fill-[#0075d6] stroke-[#0075d6]" cx="19" cy="18" r="2" />
              </svg>
            </div>
            <span className="text-[#002743] tracking-tight font-semibold text-2xl">JavaBank</span>
          </div>
          <span className="text-[#72777f] uppercase tracking-wider text-xs font-semibold">
            Digital Banking
          </span>
        </header>

        {/* Card */}
        <div className="w-full bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-[#c2c7cf]/30">
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-[#151c27]">Sign in to your account</h1>
            <p className="text-xs text-[#42474e] mt-0.5">
              Enter your institutional credentials to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-[#ffdad6]/40 text-[#93000a] p-2.5 rounded-lg mb-4 text-xs">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 pr-1">
                <span className="font-medium block leading-snug">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[#42474e] hover:text-[#151c27] p-0.5"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#151c27] mb-1.5" htmlFor="email-input">
                Email address
              </label>
              <div className="relative rounded-lg bg-white">
                <input
                  ref={emailRef}
                  id="email-input"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-12 px-3.5 bg-[#f0f3ff] text-[#151c27] rounded-lg text-sm outline-none transition-all placeholder:text-[#72777f]/70 focus:bg-white focus:ring-2 focus:ring-[#0a3d62]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#151c27]" htmlFor="password-input">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="text-xs text-[#005cab] hover:underline disabled:opacity-60"
                >
                  {forgotLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative flex items-center bg-white rounded-lg">
                <input
                  ref={passwordRef}
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 pl-3.5 pr-11 bg-[#f0f3ff] text-[#151c27] rounded-lg text-sm outline-none transition-all placeholder:text-[#72777f]/70 focus:bg-white focus:ring-2 focus:ring-[#0a3d62]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#72777f] hover:text-[#151c27] rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {capsLock && (
                <div className="flex items-center gap-1 mt-1 text-[11px] text-[#B45309]">
                  <span className="material-symbols-outlined text-[14px]">keyboard_capslock</span>
                  <span>Caps Lock is on</span>
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-[#151c27] mb-1.5" htmlFor="role-select">
                Login as
              </label>
              <div className="relative bg-white rounded-lg">
                <select
                  id="role-select"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-12 pl-3.5 pr-10 bg-[#f0f3ff] text-[#151c27] rounded-lg text-sm font-semibold outline-none appearance-none cursor-pointer transition-all focus:bg-white focus:ring-2 focus:ring-[#0a3d62]"
                >
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="CASHIER">CASHIER</option>
                  <option value="BANK">BANK</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#72777f] flex items-center">
                  <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </div>
              </div>
              <p className="text-xs text-[#42474e] mt-1.5">
                Select the role associated with your account.
              </p>
            </div>

            {/* Trust indicator */}
            <div className="flex items-center gap-1.5 py-1.5 px-2.5 rounded bg-[#f0f3ff]/80 text-[#42474e]">
              <span className="material-symbols-outlined text-[16px] text-[#00451a]">
                verified_user
              </span>
              <span className="text-[11px] text-[#42474e]">256-bit encrypted secure session</span>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                id="submit-btn"
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-12 bg-[#0a3d62] hover:bg-[#002743] active:scale-[0.99] text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    ></path>
                  </svg>
                )}
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            </div>
          </form>

          {/* Dev helper — only shown in dev */}
          {import.meta.env.DEV && (
            <div className="mt-5 pt-4 border-t border-[#e2e8f8]">
              <span className="text-[11px] text-[#72777f] uppercase font-semibold tracking-wider block mb-2 text-center">
                Seeded Dev Account
              </span>
              <button
                type="button"
                onClick={() => useDevAccount('BANK')}
                className="w-full py-1.5 px-2 rounded text-[11px] font-medium border text-center bg-[#f0f3ff] text-[#151c27] border-[#c2c7cf]/40 hover:bg-[#e2e8f8]"
              >
                Fill seeded BANK email ({SEEDED_BANK_EMAIL})
              </button>
              <p className="text-[10px] text-[#72777f] mt-1.5 text-center">
                Password = whatever was set when the row was seeded (see README).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[#42474e]">
            New to JavaBank?
            <button
              type="button"
              onClick={() => navigate('register')}
              className="font-medium text-[#005cab] hover:text-[#002743] hover:underline ml-1"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};