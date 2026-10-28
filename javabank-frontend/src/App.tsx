/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BankingProvider, useBanking } from './context/BankingContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Toast } from './components/common/Toast';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { DashboardView } from './components/customer/DashboardView';
import { AccountsView } from './components/customer/AccountsView';
import { AccountDetailView } from './components/customer/AccountDetailView';
import { NewAccountView } from './components/customer/NewAccountView';
import { TransferView } from './components/customer/TransferView';
import { TransactionsView } from './components/customer/TransactionsView';
import { LoansView } from './components/customer/LoansView';
import { LoanApprovalsView } from './components/manager/LoanApprovalsView';
import { StaffManagementView } from './components/manager/StaffManagementView';
import { CashierDepositView } from './components/cashier/CashierDepositView';
import { NotFoundView } from './components/common/NotFoundView';
import { ManageAccountsView } from './components/manager/ManageAccountsView';

// ---------------------------------------------------------------------------
// Which routes each role is allowed to open
// ---------------------------------------------------------------------------
const ROUTE_ROLE_MAP: Record<string, string[]> = {
    dashboard: ['CUSTOMER', 'MANAGER', 'CASHIER', 'BANK'],
    accounts: ['CUSTOMER'],
    'accounts/new': ['CUSTOMER'],
    'new-account': ['CUSTOMER'],
    'account-detail': ['CUSTOMER'],
    transfer: ['CUSTOMER'],
    transactions: ['CUSTOMER', 'CASHIER'],
    loans: ['CUSTOMER'],
    'loan-approvals': ['MANAGER', 'BANK'],
    staff: ['MANAGER', 'BANK'],
    deposit: ['CASHIER'],
    404: ['CUSTOMER', 'MANAGER', 'CASHIER', 'BANK'],
	'manage-accounts': ['MANAGER', 'BANK'], // Add this
};


const isRouteAllowed = (route: string, role: string) => {
    const normalized = route.replace(/^\//, '');
    const allowed =
        ROUTE_ROLE_MAP[normalized] ??
        (normalized.startsWith('accounts/') || normalized.startsWith('account-detail')
            ? ROUTE_ROLE_MAP['account-detail']
            : null);
    if (!allowed) return true; // unknown → let it fall through to 404
    return allowed.includes(role);
};

// ---------------------------------------------------------------------------
// Error boundary — stops a single broken screen from killing the whole app
// ---------------------------------------------------------------------------
class AppErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; message?: string }
> {
    state = { hasError: false, message: undefined as string | undefined };

    static getDerivedStateFromError(err: Error) {
        return { hasError: true, message: err.message };
    }

    componentDidCatch(err: Error) {
        // eslint-disable-next-line no-console
        console.error('[JavaBank] UI crash:', err);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#f0f3ff] p-6">
                    <div className="max-w-lg w-full bg-white border border-[#c2c7cf] rounded-xl p-8 text-center">
                        <div className="text-4xl mb-3">⚠️</div>
                        <h1 className="text-xl font-bold text-[#002743] mb-2">Something went wrong</h1>
                        <p className="text-sm text-[#42474e] mb-4">
                            The current screen hit an unexpected error. Your data is safe.
                        </p>
                        {this.state.message && (
                            <pre className="text-left text-[11px] bg-[#f0f3ff] text-[#72777f] p-3 rounded-lg overflow-auto max-h-32 mb-4">
                                {this.state.message}
                            </pre>
                        )}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => this.setState({ hasError: false, message: undefined })}
                                className="px-4 py-2 rounded-lg bg-[#e2e8f8] text-[#151c27] text-xs font-semibold hover:bg-[#dce2f3]"
                            >
                                Try again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 rounded-lg bg-[#002743] text-white text-xs font-semibold hover:bg-[#0a3d62]"
                            >
                                Reload app
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ---------------------------------------------------------------------------
// Route renderer
// ---------------------------------------------------------------------------
const renderRoute = (route: string) => {
    switch (route) {
        case 'dashboard':
            return <DashboardView />;
        case 'accounts/new':
        case 'new-account':
            return <NewAccountView />;
        case 'accounts':
            return <AccountsView />;
        case 'transfer':
            return <TransferView />;
        case 'transactions':
            return <TransactionsView />;
        case 'loans':
            return <LoansView />;
        case 'loan-approvals':
            return <LoanApprovalsView />;
        case 'staff':
            return <StaffManagementView />;
        case 'deposit':
            return <CashierDepositView />;
		case 'manage-accounts':
			return <ManageAccountsView />;
        default:
            if (route.startsWith('accounts/') || route.startsWith('account-detail')) {
                return <AccountDetailView />;
            }
            return <NotFoundView />;
    }
};

// ---------------------------------------------------------------------------
// Small "Command palette" modal (Ctrl/Cmd+K)
// ---------------------------------------------------------------------------
const CommandPalette: React.FC<{
    open: boolean;
    role: string;
    onClose: () => void;
    onNavigate: (route: string) => void;
}> = ({ open, role, onClose, onNavigate }) => {
    const [query, setQuery] = React.useState('');
    const [index, setIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const commands = React.useMemo(
        () =>
            [
                { label: 'Go to Dashboard', route: 'dashboard', roles: ['CUSTOMER', 'MANAGER', 'CASHIER', 'BANK'] },
                { label: 'Go to Accounts', route: 'accounts', roles: ['CUSTOMER'] },
                { label: 'Open new account', route: 'new-account', roles: ['CUSTOMER'] },
                { label: 'Transfer money', route: 'transfer', roles: ['CUSTOMER'] },
                { label: 'View transactions', route: 'transactions', roles: ['CUSTOMER', 'CASHIER'] },
                { label: 'My loans', route: 'loans', roles: ['CUSTOMER'] },
                { label: 'Loan approvals', route: 'loan-approvals', roles: ['MANAGER', 'BANK'] },
                { label: 'Staff management', route: 'staff', roles: ['MANAGER', 'BANK'] },
                { label: 'Cashier deposit', route: 'deposit', roles: ['CASHIER'] },
            ].filter((c) => c.roles.includes(role)),
        [role]
    );

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter((c) => c.label.toLowerCase().includes(q));
    }, [commands, query]);

    React.useEffect(() => {
        if (open) {
            setQuery('');
            setIndex(0);
            setTimeout(() => inputRef.current?.focus(), 30);
        }
    }, [open]);

    if (!open) return null;

    const pick = (route: string) => {
        onNavigate(route);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#c2c7cf] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 border-b border-[#e2e8f8] px-4 py-3">
                    <span className="material-symbols-outlined text-[#72777f]">search</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIndex(0);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setIndex((i) => Math.min(i + 1, filtered.length - 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Enter' && filtered[index]) {
                                e.preventDefault();
                                pick(filtered[index].route);
                            } else if (e.key === 'Escape') {
                                onClose();
                            }
                        }}
                        placeholder="Jump to a screen…"
                        className="flex-1 text-sm text-[#151c27] outline-none placeholder:text-[#72777f]"
                    />
                    <span className="text-[10px] font-mono text-[#72777f] bg-[#f0f3ff] px-1.5 py-0.5 rounded">
                        ESC
                    </span>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-[#72777f]">No matches</div>
                    ) : (
                        filtered.map((c, i) => (
                            <button
                                key={c.route}
                                onMouseEnter={() => setIndex(i)}
                                onClick={() => pick(c.route)}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === index
                                        ? 'bg-[#e2e8f8] text-[#002743] font-semibold'
                                        : 'text-[#151c27] hover:bg-[#f0f3ff]'
                                    }`}
                            >
                                {c.label}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------
const BankingAppContent: React.FC = () => {
    const { currentUser, currentRoute, navigate } = useBanking();
    const [showScreenPicker, setShowScreenPicker] = React.useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
        try {
            return localStorage.getItem('sidebarCollapsed') === '1';
        } catch {
            return false;
        }
    });
    const [cmdOpen, setCmdOpen] = React.useState(false);
    const sidebarWidth = sidebarCollapsed ? 72 : 240;
    const userRole = currentUser?.role || 'CUSTOMER';
    const isDev = import.meta.env.DEV;

    // Persist sidebar state
    React.useEffect(() => {
        try {
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
        } catch {
            /* ignore quota errors */
        }
    }, [sidebarCollapsed]);

    // Global keyboard shortcuts
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            if (isTyping && e.key !== 'Escape') return;

            // Ctrl/Cmd+K → command palette
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCmdOpen((v) => !v);
                return;
            }
            if (e.key === 'Escape') setCmdOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Role gate — ✅ MOVED UP: Must be above the early returns!
    React.useEffect(() => {
        if (currentUser && !isRouteAllowed(currentRoute, userRole)) {
            const home =
                userRole === 'CASHIER'
                    ? 'deposit'
                    : userRole === 'MANAGER' || userRole === 'BANK'
                        ? 'loan-approvals'
                        : 'dashboard';
            navigate(home);
        }
    }, [currentRoute, userRole, currentUser, navigate]);

    // If the user is not authenticated
    if (!currentUser) {
        if (currentRoute === 'register' || currentRoute === '/register') {
            return (
                <>
                    <RegisterView />
                    <Toast />
                </>
            );
        }
        return (
            <>
                <LoginView />
                <Toast />
            </>
        );
    }

    if (currentUser && !isRouteAllowed(currentRoute, userRole)) {
        return null; // render nothing while redirect effect fires
    }

    // Standalone 404
    if (currentRoute === '404' || currentRoute === '/404') {
        return (
            <>
                <NotFoundView />
                <Toast />
            </>
        );
    }

    return (
        <div className="flex h-screen bg-[#F5F7FA] overflow-hidden font-sans text-slate-800 antialiased selection:bg-[#0A3D62] selection:text-white">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />

            <div
                className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <Header collapsedOffset={sidebarWidth} />
                <main className="flex-1 overflow-y-auto">{renderRoute(currentRoute)}</main>
            </div>

            {/* Command palette */}
            <CommandPalette
                open={cmdOpen}
                role={userRole}
                onClose={() => setCmdOpen(false)}
                onNavigate={navigate}
            />

            {/* Dev-only floating switcher */}
            {isDev && (
                <div className="fixed bottom-5 right-5 z-40">
                    {showScreenPicker && (
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-72 mb-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[#0A3D62] text-sm">visibility</span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Dev: Jump to Screen
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowScreenPicker(false)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                    type="button"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                Current Role: {userRole}
                            </div>
                            <div className="max-h-72 overflow-y-auto space-y-0.5 text-xs">
                                {[
                                    ['dashboard', 'Dashboard'],
                                    ['accounts', 'Accounts List'],
                                    ['account-detail', 'Account Detail'],
                                    ['new-account', 'New Account'],
                                    ['transfer', 'Transfer'],
                                    ['transactions', 'Transactions'],
                                    ['loans', 'Loans'],
                                    ['loan-approvals', 'Loan Approvals'],
                                    ['staff', 'Staff'],
                                    ['deposit', 'Cashier Deposit'],
                                    ['404', '404 Not Found'],
                                ]
                                    .filter(([route]) => isRouteAllowed(route, userRole) || route === '404')
                                    .map(([route, label]) => (
                                        <button
                                            key={route}
                                            type="button"
                                            onClick={() => {
                                                navigate(route);
                                                setShowScreenPicker(false);
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${currentRoute === route
                                                    ? 'bg-[#e2e8f8] text-[#002743] font-semibold'
                                                    : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <span>{label}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">#{route}</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowScreenPicker(!showScreenPicker)}
                        className="flex items-center gap-2 bg-[#0A3D62] text-white px-3.5 py-2 rounded-full shadow-lg hover:bg-[#082f4d] active:scale-95 transition-all text-xs font-semibold"
                        title="Dev: quick screen jumper (Ctrl/Cmd+K for command palette)"
                    >
                        <span className="material-symbols-outlined text-sm">dashboard_customize</span>
                        <span>Dev Jump · {userRole}</span>
                    </button>
                </div>
            )}

            <Toast />
        </div>
    );
};

// ---------------------------------------------------------------------------
// App wrapper
// ---------------------------------------------------------------------------
export default function App() {
    return (
        <AppErrorBoundary>
            <BankingProvider>
                <BankingAppContent />
            </BankingProvider>
        </AppErrorBoundary>
    );
}