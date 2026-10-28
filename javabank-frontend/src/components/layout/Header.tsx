import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useBanking } from '../../context/BankingContext';
import { UserRole } from '../../types';
import { client } from '../../api/client';

type Health = 'up' | 'down' | 'unknown';

// Add this helper at the top of Header.tsx
const HOME_ROUTES: Record<string, string> = {
  CUSTOMER: 'dashboard',
  CASHIER: 'deposit',
  MANAGER: 'loan-approvals',
  BANK: 'loan-approvals',
};




const roleBadge = (r: UserRole): string => {
  switch (r) {
    case 'CUSTOMER':
      return 'bg-[#d4e3ff] text-[#004786]';
    case 'MANAGER':
      return 'bg-[#cfe5ff] text-[#002743]';
    case 'CASHIER':
      return 'bg-[#e2e8f8] text-[#005cab]';
    case 'BANK':
      return 'bg-[#7ffc97] text-[#002109]';
    default:
      return 'bg-[#d4e3ff] text-[#004786]';
  }
};

const roleSubtitle = (role: UserRole, user: any): string => {
  switch (role) {
    case 'MANAGER':
      return user?.branch || 'Branch manager';
    case 'BANK':
      return 'Corporate administrator';
    case 'CASHIER':
      return 'Over-the-counter teller';
    default:
      return user?.id ? `ID: ${String(user.id).slice(0, 8)}` : 'Customer';
  }
};

const breadcrumbFor = (route: string): React.ReactNode => {
  switch (route) {
    case 'dashboard':
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#005320]"></span>
          <span className="text-xs text-[#72777f] uppercase tracking-wider font-semibold">Portal</span>
        </div>
      );
    case 'accounts':
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#72777f]">
          <span>Banking</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#151c27] font-medium">Depository Accounts</span>
        </div>
      );
    case 'new-account':
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#62df7d]"></span>
          <span className="text-[#72777f] uppercase tracking-wider font-semibold">Portal</span>
          <span className="text-[#72777f]">/</span>
          <span className="text-[#151c27] font-semibold">New account</span>
        </div>
      );
    case 'transfer':
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#42474e]">
          <span>Banking</span>
          <span className="text-[#72777f]">/</span>
          <span className="text-[#002743] font-semibold">Transfer funds</span>
        </div>
      );
    case 'transactions':
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#62df7d]"></span>
          <span className="text-[#72777f] uppercase tracking-wider font-semibold">Portal</span>
          <span className="text-[#72777f]">/</span>
          <span className="text-[#151c27] font-semibold">Transactions</span>
        </div>
      );
    case 'loans':
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#62df7d]"></span>
          <span className="text-[#72777f] uppercase tracking-wider font-semibold">Portal</span>
          <span className="text-[#72777f]">/</span>
          <span className="text-[#002743] font-semibold uppercase tracking-wider">Loans</span>
        </div>
      );
    case 'loan-approvals':
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#42474e]">
          <span>Corporate Portal</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#002743] font-semibold">Manager Workspace</span>
        </div>
      );
    case 'staff':
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#72777f]">
          <span>Manager Portal</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span>Governance</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#002743] font-semibold">Staff Management</span>
        </div>
      );
    case 'deposit':
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#42474e]">
          <span>Cashier Workspace</span>
          <span className="text-[#72777f]">/</span>
          <span>Over-the-counter</span>
          <span className="text-[#72777f]">/</span>
          <span className="text-[#002743] font-semibold">Deposit</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#005320]"></span>
          <span className="text-xs text-[#72777f] uppercase tracking-wider font-semibold">Portal</span>
        </div>
      );
  }
};

// ---------------------------------------------------------------------------
// Change-password modal (rendered by the header)
// ---------------------------------------------------------------------------
const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { changePassword, showToast } = useBanking();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const ok = await changePassword(current, next);
      if (ok) {
        showToast('Password updated.', 'success');
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-[#c2c7cf] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#002743]">Change password</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#72777f] hover:text-[#151c27]"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 text-xs">
          {error && (
            <div className="p-2 rounded bg-[#ffdad6]/40 text-[#93000a] text-[11px]">{error}</div>
          )}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#151c27]">Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="h-10 px-3 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 text-sm text-[#151c27] outline-none focus:ring-2 focus:ring-[#0a3d62]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#151c27]">New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              className="h-10 px-3 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 text-sm text-[#151c27] outline-none focus:ring-2 focus:ring-[#0a3d62]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#151c27]">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="h-10 px-3 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 text-sm text-[#151c27] outline-none focus:ring-2 focus:ring-[#0a3d62]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-9 px-3 rounded bg-[#f0f3ff] text-[#151c27] font-semibold disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-9 px-4 rounded bg-[#002743] text-white font-bold disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};







// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
export const Header: React.FC<{ collapsedOffset?: number }> = ({ collapsedOffset = 240 }) => {
  const { currentUser, currentRoute, notificationCount, logout, showToast } = useBanking();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [health, setHealth] = useState<Health>('unknown');
  const [expiresInMin, setExpiresInMin] = useState<number | null>(null);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const role = currentUser?.role || 'CUSTOMER';

  // Poll /actuator/health every 30s
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await client.get('/actuator/health', { timeout: 4000 });
        if (cancelled) return;
        setHealth(res.status === 200 && res.data?.status === 'UP' ? 'up' : 'down');
      } catch {
        if (!cancelled) setHealth('down');
      }
    };
    check();
    const id = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Session expiry countdown from JWT
  useEffect(() => {
    const update = () => {
      const token = localStorage.getItem('jwt');
      if (!token) return setExpiresInMin(null);
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload.exp) return setExpiresInMin(null);
        const remainingMs = payload.exp * 1000 - Date.now();
        setExpiresInMin(remainingMs > 0 ? Math.ceil(remainingMs / 60_000) : 0);
      } catch {
        setExpiresInMin(null);
      }
    };
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Click outside to close dropdowns + Escape to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const copyId = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      await navigator.clipboard.writeText(currentUser.id);
      showToast('User ID copied.', 'info');
    } catch {
      showToast('Could not copy ID.', 'error');
    }
  }, [currentUser?.id, showToast]);

  const healthLabel = health === 'up' ? 'Operational' : health === 'down' ? 'Degraded' : 'Checking…';
  const healthColor =
    health === 'up' ? 'bg-[#3bbc5f]' : health === 'down' ? 'bg-[#ba1a1a]' : 'bg-amber-400';
  const healthPulse = health === 'up' || health === 'unknown' ? 'animate-pulse' : '';

  return (
    <>
      <header
        className="fixed top-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#c2c7cf]/40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] h-16 transition-all duration-200"
        style={{ left: `${collapsedOffset}px` }}
      >
        <div className="h-16 px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">{breadcrumbFor(currentRoute)}</div>

          <div className="flex items-center gap-4 lg:gap-6">
            {/* API health chip */}
            <div className="hidden sm:flex items-center gap-2 bg-[#f0f3ff] px-3 py-1 rounded-lg text-xs text-[#42474e]">
              <span className={`w-2 h-2 rounded-full ${healthColor} ${healthPulse}`}></span>
              <span>
                Core API: <strong className="text-[#151c27]">{healthLabel}</strong>
              </span>
            </div>

            {/* Session indicator */}
            {expiresInMin !== null && (
              <div
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                  expiresInMin <= 5
                    ? 'bg-[#ffdad6]/50 text-[#ba1a1a]'
                    : 'bg-[#f0f3ff] text-[#42474e]'
                }`}
                title="Session expiry"
              >
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>{expiresInMin > 0 ? `${expiresInMin}m` : 'expired'}</span>
              </div>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-1.5 rounded-lg text-[#42474e] hover:text-[#151c27] hover:bg-[#e2e8f8] transition-colors"
                title="Notifications"
                type="button"
                aria-expanded={showNotifications}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-[#ba1a1a] text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#c2c7cf]/50 p-4 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f8]">
                    <span className="font-semibold text-sm text-[#002743]">Institutional Alerts</span>
                    {notificationCount > 0 && (
                      <span className="text-[11px] bg-[#d4e3ff] text-[#004786] px-2 py-0.5 rounded font-medium">
                        {notificationCount} New
                      </span>
                    )}
                  </div>
                  <div className="py-3 flex flex-col gap-2.5">
                    {notificationCount === 0 ? (
                      <div className="text-xs text-[#72777f] text-center py-2">
                        No new alerts.
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#f0f3ff]">
                        <span className="material-symbols-outlined text-[#005cab] text-[18px] mt-0.5">
                          info
                        </span>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-[#151c27]">
                            {notificationCount} unread notification
                            {notificationCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-[#42474e] mt-0.5">
                            Open each module to view details.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      showToast('Notifications marked as read.', 'info');
                    }}
                    className="w-full text-center text-xs text-[#005cab] font-medium hover:underline pt-1"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-[#c2c7cf]/40"></div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-3 p-1 rounded-lg hover:bg-[#f0f3ff] transition-colors text-left"
                aria-expanded={showProfileMenu}
              >
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ${roleBadge(
                    role
                  )}`}
                >
                  {role}
                </span>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-semibold text-[#151c27] leading-tight">
                    {currentUser?.name || 'Guest User'}
                  </span>
                  <span className="text-[11px] text-[#72777f] leading-tight mt-0.5">
                    {roleSubtitle(role, currentUser)}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#002743] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#c2c7cf]/50 p-2 z-50">
                  <div className="px-3 py-2 border-b border-[#e2e8f8]">
                    <div className="text-sm font-semibold text-[#151c27]">
                      {currentUser?.name}
                    </div>
                    <div className="text-[11px] text-[#72777f] truncate">
                      {currentUser?.email}
                    </div>
                    <button
                      type="button"
                      onClick={copyId}
                      className="text-[10px] text-[#005cab] hover:underline mt-1 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      Copy user ID
                    </button>
                  </div>
                  <div className="px-3 py-1.5 text-[10px] text-[#72777f] font-mono border-b border-[#f0f3ff]">
                    {role} · {roleSubtitle(role, currentUser)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowChangePwd(true);
                    }}
                    className="w-full mt-1 text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#151c27] hover:bg-[#f0f3ff] transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">password</span>
                    Change password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </>
  );
};