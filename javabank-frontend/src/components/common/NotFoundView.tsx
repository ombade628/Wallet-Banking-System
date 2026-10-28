/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useBanking } from '../../context/BankingContext';
import { client } from '../../api/client';

// Deterministic short trace — survives page reload via sessionStorage
const getTraceId = (): string => {
  try {
    const existing = sessionStorage.getItem('errorTraceId');
    if (existing) return existing;
  } catch {
    /* ignore */
  }
  const fresh =
    'JB-' +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    '-' +
    Date.now().toString(36).slice(-4).toUpperCase();
  try {
    sessionStorage.setItem('errorTraceId', fresh);
  } catch {
    /* ignore */
  }
  return fresh;
};

const useApiHealth = (): { ok: boolean | null } => {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get('/actuator/health', { timeout: 4000 });
        if (!cancelled) setOk(res.status === 200 && res.data?.status === 'UP');
      } catch {
        if (!cancelled) setOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ok };
};

export const NotFoundView: React.FC = () => {
  const { navigate, showToast, currentUser, online } = useBanking();
  const { ok: apiHealthy } = useApiHealth();
  const traceId = useMemo(getTraceId, []);
  const timestamp = useMemo(() => new Date().toISOString(), []);
  const currentYear = new Date().getFullYear();

  const lastRoute = useMemo(() => {
    try {
      return sessionStorage.getItem('lastRoute') || '';
    } catch {
      return '';
    }
  }, []);

  const role = currentUser?.role || 'CUSTOMER';
  const homeRoute =
    role === 'CASHIER' ? 'deposit' : role === 'MANAGER' || role === 'BANK' ? 'loan-approvals' : 'dashboard';
  const homeLabel =
    role === 'CASHIER' ? 'Go to cashier deposit' : role === 'MANAGER' || role === 'BANK' ? 'Go to approvals' : 'Go to dashboard';

  const roleQuickLink =
    role === 'CUSTOMER'
      ? { label: 'View transactions', route: 'transactions' }
      : role === 'MANAGER' || role === 'BANK'
      ? { label: 'Open approvals', route: 'loan-approvals' }
      : { label: 'Cashier history', route: 'transactions' };

  const copyTrace = async () => {
    try {
      await navigator.clipboard.writeText(traceId);
      showToast(`Trace ${traceId} copied. Share this with support.`, 'info');
    } catch {
      showToast('Could not copy. Manual: ' + traceId, 'error');
    }
  };

  // Keyboard escape hatch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        navigate(homeRoute);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [homeRoute, navigate]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex flex-col justify-between antialiased selection:bg-[#0A3D62] selection:text-white">
      {/* Header */}
      <header className="w-full px-6 py-6 sm:px-12 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(homeRoute)}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0"
          aria-label="JavaBank home"
        >
          <div className="w-10 h-10 rounded-lg bg-[#0A3D62] text-white flex items-center justify-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18" />
              <path d="M3 10h18" />
              <path d="M5 10v11" />
              <path d="M19 10v11" />
              <path d="M9 10v11" />
              <path d="M15 10v11" />
              <path d="M12 2L2 7h20L12 2z" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">JavaBank</span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500 mt-0.5">
              Corporate Banking
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span
            className={`w-2 h-2 rounded-full ${
              !online
                ? 'bg-slate-400'
                : apiHealthy === null
                ? 'bg-amber-400 animate-pulse'
                : apiHealthy
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-red-500'
            }`}
          ></span>
          <span>
            {!online
              ? 'Offline'
              : apiHealthy === null
              ? 'Checking API…'
              : apiHealthy
              ? 'Core Banking Node: Operational'
              : 'Core Banking Node: Degraded'}
          </span>
        </div>
      </header>

      {/* Main */}
      <main role="main" className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 sm:p-12 text-center">
          {/* 404 Mark */}
          <div className="relative inline-block mb-3">
            <span className="font-mono text-7xl sm:text-8xl font-extrabold tracking-tighter text-slate-200 select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[#0A3D62] shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2.5">
            Page not found
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-sm mx-auto mb-8">
            The requested institutional ledger record or banking route does not exist or has been relocated.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate(homeRoute)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0A3D62] hover:bg-[#082f4d] active:bg-[#06243b] text-white text-sm font-semibold tracking-wide transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A3D62] focus:ring-offset-2 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>{homeLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(roleQuickLink.route)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300/80 text-slate-700 text-sm font-medium transition focus:outline-none cursor-pointer"
            >
              <span>{roleQuickLink.label}</span>
            </button>
          </div>

          {/* Return to last route if we know it */}
          {lastRoute && lastRoute !== '404' && lastRoute !== 'login' && (
            <button
              type="button"
              onClick={() => navigate(lastRoute)}
              className="text-xs text-[#0A3D62] hover:underline mb-6 inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">undo</span>
              <span>
                Return to <span className="font-mono">#{lastRoute}</span>
              </span>
            </button>
          )}

          {/* Support */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() =>
                showToast(
                  'Contact your relationship manager or use the institutional helpdesk portal.',
                  'info'
                )
              }
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-[#0A3D62] transition-colors group cursor-pointer"
            >
              <span>Need institutional assistance?</span>
              <span className="text-[#0A3D62] underline underline-offset-4 group-hover:text-[#082f4d] font-semibold">
                Contact support
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 text-[#0A3D62] transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Diagnostics — REAL trace + timestamp, copyable */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-left bg-slate-50/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
              <span>STATUS: HTTP_404_NOT_FOUND</span>
              <button
                type="button"
                onClick={copyTrace}
                className="flex items-center gap-1 text-slate-600 hover:text-[#0A3D62]"
                title="Copy trace ID for support"
              >
                <span>TRACE: {traceId}</span>
                <span className="material-symbols-outlined text-[12px]">content_copy</span>
              </button>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono">
              {timestamp}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono">
              Press <kbd className="px-1 rounded bg-white border border-slate-200">Ctrl</kbd>+
              <kbd className="px-1 rounded bg-white border border-slate-200">Shift</kbd>+
              <kbd className="px-1 rounded bg-white border border-slate-200">D</kbd> to jump home.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 sm:px-12 text-center text-xs text-slate-400">
        <p>© {currentYear} JavaBank Financial Services Ltd. Regulated by Reserve Bank of India (RBI).</p>
      </footer>
    </div>
  );
};