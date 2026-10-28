import React, { useMemo, useRef, useState } from 'react';
import { useBanking } from '../../context/BankingContext';

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const scorePassword = (pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const buckets = [
    { label: 'Too short', color: '#ba1a1a' },
    { label: 'Weak', color: '#D97706' },
    { label: 'Fair', color: '#B45309' },
    { label: 'Good', color: '#3bbc5f' },
    { label: 'Strong', color: '#00451a' },
  ];
  const b = buckets[capped];
  return { score: capped, label: b.label, color: b.color };
};

export const RegisterView: React.FC = () => {
  const { register, navigate, showToast, online } = useBanking();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const pwdStrength = useMemo(() => (password ? scorePassword(password) : null), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validateField = (field: keyof FieldErrors, value: string): string | undefined => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required.';
        if (value.trim().length < 2) return 'Name is too short.';
        return undefined;
      case 'email': {
        const e = value.trim().toLowerCase();
        if (!e) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email.';
        return undefined;
      }
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters.';
        return undefined;
      case 'confirmPassword':
        if (value !== password) return 'Passwords do not match.';
        return undefined;
    }
  };

  const handleBlur = (field: keyof FieldErrors, value: string) => {
    const msg = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const validateAll = (): boolean => {
    const next: FieldErrors = {
      fullName: validateField('fullName', fullName),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setEmailTaken(false);

    if (!online) {
      setServerError('You are offline. Reconnect to create an account.');
      return;
    }
    if (!validateAll()) {
      // focus the first invalid field
      if (errors.fullName || !fullName.trim()) nameRef.current?.focus();
      else if (errors.email || !email.trim()) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      else if (errors.confirmPassword) confirmRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const ok = await register(fullName.trim(), email.trim().toLowerCase(), password);
      if (!ok) {
        // register() already toasted; add specific banner + inline hint
        setServerError('Could not create the account.');
        setEmailTaken(true);
        emailRef.current?.focus();
      }
    } catch (err: any) {
      const status = err?.status as number | undefined;
      if (status === 409) {
        setEmailTaken(true);
        setErrors((p) => ({ ...p, email: 'This email is already registered.' }));
        emailRef.current?.focus();
      } else if (status === 400) {
        setServerError(err.message || 'Some fields were invalid.');
      } else {
        setServerError(err?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    online &&
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 8 &&
    password === confirmPassword;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center px-4 py-12">
      <div className="flex flex-col w-full items-center justify-center max-w-[480px]">
        <div className="w-full bg-white rounded-xl shadow-md p-6 sm:p-8 flex flex-col border border-[#c2c7cf]/30">
          {/* Branding */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#0a3d62] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-2xl leading-none">account_balance</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl text-[#002743] tracking-tight font-semibold">JavaBank</span>
                <span className="text-[10px] tracking-widest text-[#72777f] uppercase font-semibold">
                  Digital Banking
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-xl text-[#151c27] font-semibold mb-1">Create your JavaBank account</h1>
            <p className="text-xs text-[#42474e] leading-relaxed">
              New accounts are created with the Customer role. Staff accounts are provisioned by the bank.
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-4 p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-lg flex items-start gap-2 text-xs">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <div className="flex-1">{serverError}</div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="opacity-70 hover:opacity-100 flex items-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {!online && (
            <div className="mb-4 p-3 bg-[#FEF3C7] text-[#B45309] rounded-lg flex items-start gap-2 text-xs">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">cloud_off</span>
              <div className="flex-1">You are offline. Registration is disabled.</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Full name */}
            <div className="flex flex-col">
              <label className="text-xs text-[#151c27] mb-1.5 font-medium" htmlFor="fullname">
                Full name <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                ref={nameRef}
                id="fullname"
                name="fullname"
                type="text"
                maxLength={255}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => handleBlur('fullName', fullName)}
                placeholder="e.g. John Doe"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'err-fullname' : undefined}
                required
                className={`w-full h-12 px-3.5 rounded-lg bg-white text-[#151c27] text-sm border transition-colors ${
                  errors.fullName ? 'border-[#ba1a1a]' : 'border-[#c2c7cf] focus:border-[#005cab]'
                } outline-none`}
              />
              {errors.fullName && (
                <div id="err-fullname" className="mt-1 flex items-center gap-1 text-[#ba1a1a] text-xs">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.fullName}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <label className="text-xs text-[#151c27] mb-1.5 font-medium" htmlFor="email">
                Email address <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailTaken) setEmailTaken(false);
                }}
                onBlur={() => handleBlur('email', email)}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'err-email' : undefined}
                required
                className={`w-full h-12 px-3.5 rounded-lg bg-white text-[#151c27] text-sm border transition-colors ${
                  errors.email || emailTaken ? 'border-[#ba1a1a]' : 'border-[#c2c7cf] focus:border-[#005cab]'
                } outline-none`}
              />
              {errors.email && (
                <div id="err-email" className="mt-1 flex items-center gap-1 text-[#ba1a1a] text-xs">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col">
              <label className="text-xs text-[#151c27] mb-1.5 font-medium" htmlFor="password">
                Password <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password', password)}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'err-password' : undefined}
                  required
                  className={`w-full h-12 pl-3.5 pr-11 rounded-lg bg-white text-[#151c27] text-sm border transition-colors ${
                    errors.password ? 'border-[#ba1a1a]' : 'border-[#c2c7cf] focus:border-[#005cab]'
                  } outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 p-1 text-[#72777f] hover:text-[#151c27] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-[#42474e]">At least 8 characters.</span>
                {pwdStrength && pwdStrength.score > 0 && (
                  <span className="text-[11px] font-semibold" style={{ color: pwdStrength.color }}>
                    {pwdStrength.label}
                  </span>
                )}
              </div>
              {pwdStrength && pwdStrength.score > 0 && (
                <div className="mt-1 h-1 bg-[#f0f3ff] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(pwdStrength.score / 4) * 100}%`,
                      backgroundColor: pwdStrength.color,
                    }}
                  ></div>
                </div>
              )}

              {capsLock && (
                <div className="flex items-center gap-1 mt-1 text-[11px] text-[#B45309]">
                  <span className="material-symbols-outlined text-[14px]">keyboard_capslock</span>
                  <span>Caps Lock is on</span>
                </div>
              )}

              {errors.password && (
                <div id="err-password" className="mt-1 flex items-center gap-1 text-[#ba1a1a] text-xs">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col">
              <label className="text-xs text-[#151c27] mb-1.5 font-medium" htmlFor="confirm-password">
                Confirm password <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  ref={confirmRef}
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'err-confirm' : undefined}
                  required
                  className={`w-full h-12 pl-3.5 pr-11 rounded-lg bg-white text-[#151c27] text-sm border transition-colors ${
                    errors.confirmPassword ? 'border-[#ba1a1a]' : 'border-[#c2c7cf] focus:border-[#005cab]'
                  } outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                  className="absolute right-3 p-1 text-[#72777f] hover:text-[#151c27] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordsMatch && (
                <div className="mt-1 flex items-center gap-1 text-[#3bbc5f] text-xs">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>Passwords match</span>
                </div>
              )}
              {errors.confirmPassword && (
                <div id="err-confirm" className="mt-1 flex items-center gap-1 text-[#ba1a1a] text-xs">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            <button
              id="submit-btn"
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 mt-2 bg-[#0a3d62] hover:bg-[#002743] active:scale-[0.99] text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
              <span>{loading ? 'Creating account…' : 'Create account'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-2 text-[#42474e] text-xs">
              <span className="material-symbols-outlined text-sm text-[#72777f]">lock</span>
              <span>256-bit encrypted secure registration</span>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-[#42474e]">
          Already have an account?
          <button
            type="button"
            onClick={() => navigate('login')}
            className="text-[#005cab] font-medium hover:underline ml-1"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};