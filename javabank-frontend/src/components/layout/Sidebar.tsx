import React, { useEffect } from 'react';
import { useBanking } from '../../context/BankingContext';
import { UserRole } from '../../types';

// ---------------------------------------------------------------------------
// Nav config — one array per role
// ---------------------------------------------------------------------------
type NavItem = {
  path: string;
  label: string;
  icon: string;
  badge?: number | string;
  // Extra routes that should also light this item up
  alsoActiveFor?: string[];
};

const useNavForRole = (role: UserRole): { primary: NavItem[]; governance?: NavItem[] } => {
  const { loans, notificationCount } = useBanking();

  const pendingLoans = loans.filter((l) => l.status === 'PENDING').length;

  if (role === 'CASHIER') {
    return {
      primary: [
        { path: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
        { path: 'deposit', label: 'Deposit', icon: 'payments' },
        { path: 'transactions', label: 'Transactions', icon: 'receipt_long' },
      ],
    };
  }

  if (role === 'MANAGER' || role === 'BANK') {
    return {
      primary: [
        {path: 'loan-approvals',label: 'Loan Approvals',icon: 'verified',badge: pendingLoans > 0 ? pendingLoans : undefined,},
		{ path: 'manage-accounts', label: 'Manage Accounts', icon: 'account_balance' }, 
        { path: 'staff', label: 'Staff', icon: 'badge' },
      ],
      governance: [],
    };
  }

  // CUSTOMER
  return {
    primary: [
      { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      {
        path: 'accounts',
        label: 'Accounts',
        icon: 'account_balance_wallet',
        alsoActiveFor: ['account-detail', 'new-account'],
      },
      { path: 'transfer', label: 'Transfer', icon: 'swap_horiz' },
      {
        path: 'transactions',
        label: 'Transactions',
        icon: 'receipt_long',
        badge: notificationCount > 0 ? undefined : undefined,
      },
      { path: 'loans', label: 'Loans', icon: 'real_estate_agent' },
    ],
  };
};

// ---------------------------------------------------------------------------
// Single nav button
// ---------------------------------------------------------------------------
const NavButton: React.FC<{
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}> = ({ item, active, collapsed, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active
          ? 'bg-[#0a3d62] text-white font-medium shadow-sm'
          : 'text-[#42474e] hover:bg-[#e2e8f8] hover:text-[#151c27]'
      }`}
    >
      <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
      {!collapsed && <span className="text-sm">{item.label}</span>}

      {/* Badge */}
      {item.badge !== undefined && item.badge !== 0 && (
        <span
          className={`${
            collapsed
              ? 'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full'
              : 'ml-auto min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5'
          } ${
            active ? 'bg-white text-[#0a3d62]' : 'bg-[#0a3d62] text-white'
          }`}
        >
          {collapsed ? '' : item.badge}
        </span>
      )}

      {/* Hover tooltip when collapsed */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded bg-[#002743] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {item.label}
        </span>
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({
  collapsed,
  onToggle,
}) => {
  const { currentUser, currentRoute, navigate, logout, showToast } = useBanking();
  const role: UserRole = currentUser?.role || 'CUSTOMER';

  const { primary } = useNavForRole(role);

  const isActive = (item: NavItem): boolean => {
    if (currentRoute === item.path) return true;
    if (item.alsoActiveFor?.includes(currentRoute)) return true;
    if (item.path === 'accounts' && currentRoute.startsWith('accounts/')) return true;
    return false;
  };

  const homeForRole = (): string =>
    role === 'CASHIER' ? 'deposit' : role === 'MANAGER' || role === 'BANK' ? 'loan-approvals' : 'dashboard';

  // Keyboard navigation: g+d, g+t, g+a, g+x (transfer), g+l, g+s, g+c
  useEffect(() => {
    let lastKey: string | null = null;
    let timer: number | null = null;

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === '[') {
        e.preventDefault();
        onToggle();
        return;
      }

      if (lastKey === 'g') {
        const map: Record<string, string> = {
          d: 'dashboard',
          a: 'accounts',
          t: 'transfer',
          x: 'transfer',
          l: 'loans',
          s: 'staff',
          c: 'deposit',
          r: 'transactions',
        };
        if (map[k]) {
          e.preventDefault();
          // Only navigate if role can access it
          const allowed =
            (map[k] === 'deposit' && role === 'CASHIER') ||
            (map[k] === 'loans' && role === 'CUSTOMER') ||
            (map[k] === 'staff' && (role === 'MANAGER' || role === 'BANK')) ||
            ['dashboard', 'transfer', 'transactions', 'accounts'].includes(map[k]);
          if (allowed) navigate(map[k]);
        }
        lastKey = null;
        if (timer) window.clearTimeout(timer);
        return;
      }

      if (k === 'g') {
        lastKey = 'g';
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          lastKey = null;
        }, 1200);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer) window.clearTimeout(timer);
    };
  }, [navigate, onToggle, role]);

  const handleLogout = () => {
    const confirmed = window.confirm('Sign out of JavaBank?');
    if (confirmed) {
      logout();
    } else {
      showToast('Sign out cancelled.', 'info');
    }
  };

  const portalLabel =
    role === 'CASHIER'
      ? 'Cashier Portal'
      : role === 'MANAGER'
      ? 'Manager Portal'
      : role === 'BANK'
      ? 'Bank Admin'
      : 'Corporate';

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-[#c2c7cf]/40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between py-4 select-none transition-all duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      <div className="flex flex-col">
        {/* Brand */}
        <div className="h-16 px-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(homeForRole())}
            className="flex items-center gap-3 overflow-hidden bg-transparent border-0 p-0 text-left cursor-pointer group"
            aria-label="JavaBank home"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0a3d62] group-hover:bg-[#002743] flex items-center justify-center transition-colors shadow-sm text-white shrink-0">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg text-[#002743] font-bold tracking-tight leading-none">
                  JavaBank
                </span>
                <span className="text-[11px] text-[#72777f] font-semibold tracking-wider uppercase mt-1">
                  {portalLabel}
                </span>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={`${collapsed ? 'Expand' : 'Collapse'} (press [)`}
            className="p-1 rounded text-[#72777f] hover:text-[#002743] hover:bg-[#e2e8f8] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Nav */}
        <div className="px-3 mt-3">
          <nav className="flex flex-col gap-1" aria-label="Main navigation">
            {primary.map((item) => (
              <NavButton
                key={item.path}
                item={item}
                active={isActive(item)}
                collapsed={collapsed}
                onClick={() => navigate(item.path)}
              />
            ))}
          </nav>
        </div>

        {/* Keyboard hint */}
        {!collapsed && (
          <div className="px-4 mt-6 text-[10px] text-[#72777f] leading-relaxed">
            <div className="flex items-center gap-1 flex-wrap">
              <kbd className="px-1 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 font-mono">g</kbd>
              <span>then</span>
              <kbd className="px-1 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 font-mono">d</kbd>
              <span className="mx-0.5">·</span>
              <kbd className="px-1 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 font-mono">a</kbd>
              <span className="mx-0.5">·</span>
              <kbd className="px-1 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 font-mono">t</kbd>
              <span className="mx-0.5">·</span>
              <kbd className="px-1 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 font-mono">x</kbd>
            </div>
            <div className="mt-1">
              <kbd className="px-1 rounded bg-[#f0f3ff] border border-[#c2c7cf]/40 font-mono">[</kbd>
              <span className="ml-1">toggle sidebar</span>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="px-3 border-t border-[#c2c7cf]/30 pt-3">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center' : 'justify-start'
          } gap-2.5 px-4 py-2.5 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] hover:text-[#93000a] transition-colors font-medium text-sm`}
          type="button"
          title={collapsed ? 'Logout' : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};