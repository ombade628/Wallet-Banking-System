import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  UserProfile,
  UserRole,
  BankAccount,
  Transaction,
  LoanApplication,
  StaffMember,
  EmiInstallment,
  EmiPreview,
  TransferPreview,
  FeePreview,
  CashierDrawerTotals,
  AccountStatement,
  LoanStatus,
} from '../types';
import { client } from '../api/client';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
interface BankingContextType {
  currentUser: UserProfile | null;
  accounts: BankAccount[];
  allAccounts: BankAccount[];
  transactions: Transaction[];
  loans: LoanApplication[];
  staffList: StaffMember[];
  counterparties: { accountNumber: string; ownerName: string; lastDate: string }[];
  currentRoute: string;
  selectedAccountId: string;
  notificationCount: number;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  toastQueue: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  dismissToast: (id: string) => void;
  loading: {
    accounts: boolean;
    transactions: boolean;
    loans: boolean;
    staff: boolean;
  };
  online: boolean;

  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  navigate: (route: string) => void;
  setSelectedAccountId: (id: string) => void;

  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  switchRole: (role: UserRole) => Promise<void>;

  transferFunds: (params: {
    fromAccountId: string;
    toAccountNumber: string;
    toName: string;
    amount: number;
    note?: string;
  }) => Promise<{ success: boolean; reference: string; newBalance: number }>;
  previewTransfer: (amount: number) => Promise<FeePreview>;
  previewTransferFull: (req: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
  }) => Promise<TransferPreview | null>;
  cancelTransfer: (rawId: string) => Promise<void>;
  reverseTransfer: (rawId: string) => Promise<void>;
  loadCounterparties: () => Promise<void>;
  monthlyStatement: (year: number, month: number) => Promise<any>;

  depositCash: (params: { accountNumber: string; amount: number; note?: string }) => Promise<{ success: boolean; reference: string; newBalance: number; holderName: string }>;
  withdrawCash: (params: { accountNumber: string; amount: number }) => Promise<{ success: boolean; reference: string; newBalance: number }>;
  cashierDrawer: () => Promise<CashierDrawerTotals | null>;
  cashierReverse: (rawId: string) => Promise<void>;
  cashierCheque: (accountNumber: string, amount: number) => Promise<{ reference: string; newBalance: number }>;

  openNewAccount: (type: BankAccount['accountType'], currency: string) => Promise<BankAccount>;
  activateAccount: (id: string) => Promise<BankAccount>;
  freezeAccount: (id: string) => Promise<BankAccount>;
  unfreezeAccount: (id: string) => Promise<BankAccount>;
  lookupAccount: (number: string) => Promise<{ accountId: string; ownerName: string } | null>;
  accountStatement: (id: string, year: number, month: number) => Promise<AccountStatement>;

  applyForLoan: (params: { principalAmount: number; tenureMonths: number; interestRate: number }) => Promise<LoanApplication>;
  previewEmi: (amount: number, rate: number, months: number) => Promise<EmiPreview>;
  loanSchedule: (id: string) => Promise<EmiInstallment[]>;
  approveLoan: (loanId: string) => Promise<void>;
  rejectLoan: (loanId: string) => Promise<void>;
  disburseLoan: (loanId: string) => Promise<void>;
  cancelLoan: (loanId: string) => Promise<void>;
  payEmi: (loanId: string, installment: number) => Promise<any>;

  createStaffMember: (params: { name: string; email: string; password?: string; role: 'MANAGER' | 'CASHIER' }) => Promise<StaffMember>;
  changeStaffRole: (id: string, newRole: 'MANAGER' | 'CASHIER') => Promise<void>;
  toggleStaffStatus: (id: string) => Promise<void>;

  bulkUpdateAccountStatus: (ids: string[], action: 'activate' | 'freeze') => Promise<void>;
  	
  loadAccounts: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadLoans: (overrideRole?: UserRole) => Promise<void>;
  loadStaff: () => Promise<void>;
  
  loadAllAccounts: () => Promise<void>;
  managerUpdateAccountStatus: (id: string, action: 'activate' | 'freeze' | 'unfreeze') => Promise<void>;
}

const BankingContext = createContext<BankingContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(claims: any): boolean {
  if (!claims?.exp) return false;
  return Date.now() >= claims.exp * 1000;
}

const ALLOWED_LOAN_STATUS: LoanStatus[] = [
  'PENDING',
  'APPROVED',
  'DISBURSED',
  'ACTIVE',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

const normalizeLoanStatus = (s: unknown): LoanStatus => {
  const raw = String(s ?? '').toUpperCase();
  return (ALLOWED_LOAN_STATUS as string[]).includes(raw) ? (raw as LoanStatus) : 'PENDING';
};

const maskAccount = (n?: string | null) =>
  n ? `1000••••${String(n).slice(-4)}` : '—';

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
const mapAccount = (a: any): BankAccount => ({
  id: a.id,
  accountNumber: a.accountNumber,
  maskedNumber: maskAccount(a.accountNumber),
  accountType: a.type,
  title: `${a.type} Account`,
  subtitle: `${a.currency} · ${a.status}`,
  balance: Number(a.balance),
  currency: a.currency,
  status: a.status === 'ACTIVE' ? 'active' : a.status === 'PENDING' ? 'pending' : 'frozen',
  openedDate: a.createdAt
    ? new Date(a.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—',
  ifscCode: 'JAVB0001042',
  branch: 'BKC Fin District, Mumbai',
  interestRate: a.type === 'SAVINGS' ? '4.5% p.a.' : undefined,
  overdraftLimit: a.type === 'CHECKING' ? 50000 : undefined,
  directDepositActive: a.type === 'CHECKING',
  maturityDate: a.type === 'FIXED_DEPOSIT' ? '28 Oct 2027 (7.2% Yield)' : undefined,
  version: a.version,
});

const mapTx = (t: any, myAccountNumbers: string[]): Transaction => {
  const fromIsMine = t.fromAccountNumber ? myAccountNumbers.includes(t.fromAccountNumber) : false;
  const toIsMine = t.toAccountNumber ? myAccountNumbers.includes(t.toAccountNumber) : false;
  return {
    rawId: t.id,
    id: t.id,
    reference: t.requestId,
    date: new Date(t.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time:
      new Date(t.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST',
    fromAccount: maskAccount(t.fromAccountNumber),
    toAccount: maskAccount(t.toAccountNumber),
    fromAccountType: t.fromAccountNumber ? 'SAVINGS' : 'BANK',
    toAccountType: t.toAccountNumber ? 'CHECKING' : 'BANK',
    toEntityName:
      fromIsMine && !toIsMine
        ? 'External Recipient'
        : toIsMine && !fromIsMine
        ? 'External Sender'
        : 'Own Account',
    direction: fromIsMine ? 'SENT' : 'RECEIVED',
    amount: Number(t.amount),
    currency: t.currency,
    status: 'SETTLED',
  };
};

const mapLoan = (l: any): LoanApplication => ({
  id: String(l.id),
  customerId: String(l.customer?.id || ''),
  customerName: l.customer?.fullName || 'Customer',
  customerEmail: l.customer?.email || '—',
  employer: l.employer || 'N/A',
  cibilScore: 782,
  principalAmount: Number(l.amount),
  interestRate: Number(l.interestRate),
  tenureMonths: Number(l.tenureMonths),
  monthlyEmi: Number(l.emiAmount || 0),
  status: normalizeLoanStatus(l.status),
  appliedDate: l.appliedDate || '',
  appliedTimestamp: l.appliedDate || '',
  approvalNote: l.approvalNote || undefined,
  outstandingAmount: l.outstandingAmount != null ? Number(l.outstandingAmount) : undefined,
  approvedDate: l.approvedDate || undefined,
  disbursedDate: l.disbursedDate || undefined,
});

const mapStaff = (u: any, roleOverride?: 'MANAGER' | 'CASHIER'): StaffMember => {
  const name = u.fullName || 'Staff';
  const rawRole = roleOverride || (Array.isArray(u.roles) ? u.roles[0] : u.role);
  
  // This is now valid because StaffMember allows 'CUSTOMER'
  let role: 'MANAGER' | 'CASHIER' | 'CUSTOMER' = 'CUSTOMER';
  if (rawRole === 'MANAGER') role = 'MANAGER';
  if (rawRole === 'CASHIER') role = 'CASHIER';
  if (rawRole === 'BANK') role = 'MANAGER';

  return {
    id: String(u.id),
    code: `STF-${String(u.id).slice(0, 6).toUpperCase()}`,
    name,
    email: u.email,
    role,
    status: u.enabled === false ? 'Disabled' : 'Enabled',
    provisionedDate: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—',
    avatarInitials: name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    createdAt: u.createdAt,
  };
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const BankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<BankAccount[]>([]); // NEW
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [counterparties, setCounterparties] = useState<
    { accountNumber: string; ownerName: string; lastDate: string }[]
  >([]);
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [notificationCount] = useState<number>(1);

  // ---- Toasts ----
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [toastQueue, setToastQueue] = useState<
    { id: string; message: string; type: 'success' | 'error' | 'info' }[]
  >([]);
  const inFlightRequests = useRef<Set<string>>(new Set());

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToast({ message, type });
      setToastQueue((q) => [...q, { id, message, type }]);
    },
    []
  );
  
  const bulkUpdateAccountStatus = async (ids: string[], action: 'activate' | 'freeze') => {
      try {
        await Promise.all(
          ids.map(id => client.post(`/api/manager/accounts/${id}/${action}`))
        );
        await loadAllAccounts();
        showToast(`Bulk ${action} completed for ${ids.length} accounts.`, 'success');
      } catch (e: any) {
        showToast(`Some accounts failed to ${action}. Please refresh.`, 'error');
      }
    };

  const dismissToast = useCallback((id: string) => {
    setToastQueue((q) => q.filter((t) => t.id !== id));
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
    setToastQueue([]);
  }, []);

  const [loading, setLoading] = useState({
    accounts: false,
    transactions: false,
    loans: false,
    staff: false,
  });
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  // ---- online ----
  useEffect(() => {
    const up = () => {
      setOnline(true);
      showToast('Connection restored.', 'success');
    };
    const down = () => {
      setOnline(false);
      showToast('You are offline — actions may fail.', 'error');
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [showToast]);

  // ---- navigate ----
  const navigate = (route: string) => {
    const clean = route.replace(/^\//, '');
    setCurrentRoute(clean);
    window.location.hash = `#/${clean}`;
    try {
      sessionStorage.setItem('lastRoute', clean);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---- loaders ----
  const loadAccounts = useCallback(async () => {
    setLoading((l) => ({ ...l, accounts: true }));
    try {
      const res = await client.get('/api/accounts');
      setAccounts(res.data.map(mapAccount));
    } catch {
      /* not logged in */
    } finally {
      setLoading((l) => ({ ...l, accounts: false }));
    }
  }, []);

  const loadAllAccounts = useCallback(async () => {
    try {
      const res = await client.get('/api/manager/accounts?status=ALL');
      setAllAccounts(res.data.map(mapAccount));
    } catch (e) {
      console.error("Failed to load all accounts", e);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading((l) => ({ ...l, transactions: true }));
    try {
      const res = await client.get('/api/transfers/history', {
        params: { page: 0, size: 200 },
      });
      const content = res.data.content ?? res.data ?? [];
      const accRes = await client.get('/api/accounts');
      const mine: string[] = accRes.data.map((a: any) => a.accountNumber);
      setTransactions((content as any[]).map((t: any) => mapTx(t, mine)));
    } catch {
      /* ignore */
    } finally {
      setLoading((l) => ({ ...l, transactions: false }));
    }
  }, []);

  const loadLoans = useCallback(
    async (overrideRole?: UserRole) => {
      setLoading((l) => ({ ...l, loans: true }));
      try {
        const role = overrideRole || currentUser?.role;
        const endpoint =
          role === 'MANAGER' || role === 'BANK'
            ? '/api/loans/pending'
            : '/api/loans/mine';
        const res = await client.get(endpoint);
        const data = res.data.content ?? res.data;
        setLoans((data as any[]).map(mapLoan));
      } catch (err: any) {
        console.error("Failed to load loans:", err.response?.data || err.message);
      } finally {
        setLoading((l) => ({ ...l, loans: false }));
      }
    },
    [currentUser?.role]
  );

  const loadStaff = useCallback(async () => {
    setLoading((l) => ({ ...l, staff: true }));
    try {
      const res = await client.get('/api/manager/staff');
      const data = res.data.content ?? res.data;
      setStaffList((data as any[]).map((u: any) => mapStaff(u)));
    } catch {
      /* manager-only */
    } finally {
      setLoading((l) => ({ ...l, staff: false }));
    }
  }, []);

  const loadCounterparties = useCallback(async () => {
    try {
      const res = await client.get('/api/transfers/counterparties');
      const data = res.data ?? [];
      setCounterparties(
        (data as any[]).map((c: any) => ({
          accountNumber: c.accountNumber,
          ownerName: c.ownerName,
          lastDate: String(c.lastDate || ''),
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  const managerUpdateAccountStatus = async (id: string, action: 'activate' | 'freeze' | 'unfreeze') => {
    try {
      await client.post(`/api/manager/accounts/${id}/${action}`);
      await loadAllAccounts();
      showToast(`Account ${action}d successfully`, 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || `Failed to ${action} account`, 'error');
    }
  };

  // Helper: refresh all necessary data based on the active role
  const refreshAllData = useCallback(async (role: UserRole) => {
    await Promise.all([loadAccounts(), loadTransactions(), loadLoans(role)]);
    if (role === 'MANAGER' || role === 'BANK') {
      await Promise.all([loadStaff(), loadAllAccounts()]);
    } else {
      setStaffList([]);
      setAllAccounts([]);
    }
  }, [loadAccounts, loadTransactions, loadLoans, loadStaff, loadAllAccounts]);

  // ---- bootstrap ----
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      const claims = decodeJwt(token);
      if (!claims || !claims.sub) {
        localStorage.removeItem('jwt');
        return;
      }
      if (isExpired(claims)) {
        localStorage.removeItem('jwt');
        showToast('Session expired. Please sign in again.', 'info');
        return;
      }
      
      try {
        const meRes = await client.get('/api/auth/me');
        const restored: UserProfile = {
          id: meRes.data.id,
          name: meRes.data.name,
          email: meRes.data.email,
          role: meRes.data.activeRole as UserRole,
          allRoles: meRes.data.roles,
          branch: 'BKC Fin District, Mumbai',
        };
        
        setCurrentUser(restored);
        await refreshAllData(restored.role);
        
        try {
          const last = sessionStorage.getItem('lastRoute');
          if (last) setCurrentRoute(last);
        } catch {
          /* ignore */
        }
      } catch (e) {
        localStorage.removeItem('jwt');
        setCurrentUser(null);
      }
    };
    bootstrap();

    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (hash) setCurrentRoute(hash);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [showToast, refreshAllData]);

  // ---- auth ----
  const login = async (email: string, password: string, role: UserRole) => {
    try {
      const res = await client.post('/api/auth/login', { email, password, role });
      localStorage.setItem('jwt', res.data.token);
      
      const meRes = await client.get('/api/auth/me');
      
      const u: UserProfile = {
        id: meRes.data.id,
        name: meRes.data.name,
        email: meRes.data.email,
        role: meRes.data.activeRole as UserRole,
        allRoles: meRes.data.roles,
        branch: 'BKC Fin District, Mumbai',
      };
      
      setCurrentUser(u);
      await refreshAllData(u.role);
      
      navigate(
        u.role === 'CASHIER' ? 'deposit' : u.role === 'MANAGER' || u.role === 'BANK' ? 'loan-approvals' : 'dashboard'
      );
      showToast(`Welcome, ${u.name}`, 'success');
      return true;
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Invalid credentials', 'error');
      return false;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await client.post('/api/auth/register', {
        email,
        password,
        fullName: name,
        role: 'CUSTOMER',
      });
      showToast('Registration successful. Please sign in.', 'success');
      navigate('login');
      return true;
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Registration failed', 'error');
      return false;
    }
  };

  const changePassword = async (current: string, next: string) => {
    try {
      await client.post('/api/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      showToast('Password updated.', 'success');
      return true;
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Password change failed', 'error');
      return false;
    }
  };

  const logout = async () => {
    try {
      await client.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('jwt');
    try {
      sessionStorage.removeItem('lastRoute');
    } catch {
      /* ignore */
    }
    setCurrentUser(null);
    setAccounts([]);
    setAllAccounts([]);
    setTransactions([]);
    setLoans([]);
    setStaffList([]);
    setCounterparties([]);
    navigate('login');
  };

  const switchRole = async (newRole: UserRole) => {
    try {
      const res = await client.post(`/api/auth/switch-role?role=${newRole}`);
      localStorage.setItem('jwt', res.data.token);
      
      const meRes = await client.get('/api/auth/me');
      const updatedUser: UserProfile = {
        id: meRes.data.id,
        name: meRes.data.name,
        email: meRes.data.email,
        role: meRes.data.activeRole as UserRole,
        allRoles: meRes.data.roles,
        branch: 'BKC Fin District, Mumbai',
      };
      
      setCurrentUser(updatedUser);
      
      await refreshAllData(updatedUser.role);
      
      const home = updatedUser.role === 'CASHIER' ? 'deposit' 
                 : updatedUser.role === 'MANAGER' || updatedUser.role === 'BANK' ? 'loan-approvals' 
                 : 'dashboard';
      navigate(home);
      showToast(`Switched to ${updatedUser.role} view`, 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Role switch failed', 'error');
    }
  };

  // ---- accounts ----
  const lookupAccount = async (number: string) => {
    try {
      const res = await client.get(`/api/accounts/lookup/${encodeURIComponent(number)}`);
      return { accountId: res.data.accountId, ownerName: res.data.ownerName };
    } catch {
      try {
        const res = await client.get(`/api/cashier/lookup/${encodeURIComponent(number)}`);
        return { accountId: res.data.accountId, ownerName: res.data.ownerName };
      } catch {
        return null;
      }
    }
  };

  const openNewAccount = async (type: BankAccount['accountType'], currency: string) => {
    const res = await client.post('/api/accounts', { type, currency });
    await loadAccounts();
    return mapAccount(res.data);
  };

  const activateAccount = async (id: string) => {
    const res = await client.post(`/api/accounts/${id}/activate`);
    await loadAccounts();
    return mapAccount(res.data);
  };

  const freezeAccount = async (id: string) => {
    const res = await client.put(`/api/accounts/${id}/freeze`);
    await loadAccounts();
    return mapAccount(res.data);
  };

  const unfreezeAccount = async (id: string) => {
    const res = await client.put(`/api/accounts/${id}/unfreeze`);
    await loadAccounts();
    return mapAccount(res.data);
  };

  const accountStatement = async (id: string, year: number, month: number) => {
    const res = await client.get(`/api/accounts/${id}/statement`, {
      params: { year, month },
    });
    return res.data as AccountStatement;
  };

  // ---- transfers ----
  const previewTransfer = async (amount: number): Promise<FeePreview> => {
    try {
      const res = await client.get('/api/transfers/fee', { params: { amount } });
      return {
        amount: Number(res.data.amount),
        fee: Number(res.data.fee),
        totalDebit: Number(res.data.totalDebit),
      };
    } catch {
      return { amount, fee: 0, totalDebit: amount };
    }
  };

  const previewTransferFull = async (req: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
  }): Promise<TransferPreview | null> => {
    try {
      const res = await client.post('/api/transfers/preview', {
        requestId: crypto.randomUUID(),
        fromAccountId: req.fromAccountId,
        toAccountId: req.toAccountId,
        amount: req.amount,
      });
      return res.data as TransferPreview;
    } catch {
      return null;
    }
  };

  const transferFunds = async ({
    fromAccountId,
    toAccountNumber,
    amount,
  }: {
    fromAccountId: string;
    toAccountNumber: string;
    toName: string;
    amount: number;
    note?: string;
  }) => {
    const lookup = await client.get(
      `/api/accounts/lookup/${encodeURIComponent(toAccountNumber)}`
    );
    const toAccountId = lookup.data.accountId;

    const reqId = crypto.randomUUID();
    if (inFlightRequests.current.has(reqId)) {
      throw new Error('Duplicate request ignored');
    }
    inFlightRequests.current.add(reqId);

    try {
      const res = await client.post('/api/transfers', {
        requestId: reqId,
        fromAccountId,
        toAccountId,
        amount,
      });
      await Promise.all([loadAccounts(), loadTransactions()]);
      return {
        success: true,
        reference: res.data.requestId,
        newBalance: Number(res.data.newFromBalance ?? res.data.amount ?? 0),
      };
    } finally {
      inFlightRequests.current.delete(reqId);
    }
  };

  const cancelTransfer = async (rawId: string) => {
    await client.post(`/api/transfers/${rawId}/cancel`);
    await Promise.all([loadAccounts(), loadTransactions()]);
    showToast('Transfer cancelled.', 'success');
  };

  const reverseTransfer = async (rawId: string) => {
    await client.post(`/api/transfers/${rawId}/reverse`);
    await Promise.all([loadAccounts(), loadTransactions()]);
    showToast('Transfer reversed.', 'success');
  };

  const monthlyStatement = async (year: number, month: number) => {
    const res = await client.get('/api/transfers/statement', { params: { year, month } });
    return res.data;
  };

  const depositCash = async ({
    accountNumber,
    amount,
    note,
  }: {
    accountNumber: string;
    amount: number;
    note?: string;
  }) => {
    const res = await client.post('/api/cashier/deposit', { accountNumber, amount, note });
    await Promise.all([loadAccounts(), loadTransactions()]);
    return {
      success: true,
      reference: res.data.reference,
      newBalance: Number(res.data.newBalance),
      holderName: res.data.holderName || '',
    };
  };

  const withdrawCash = async ({
    accountNumber,
    amount,
  }: {
    accountNumber: string;
    amount: number;
  }) => {
    const res = await client.post('/api/cashier/withdraw', { accountNumber, amount });
    await Promise.all([loadAccounts(), loadTransactions()]);
    return {
      success: true,
      reference: res.data.reference,
      newBalance: Number(res.data.newBalance),
    };
  };

  const cashierDrawer = async (): Promise<CashierDrawerTotals | null> => {
    try {
      const res = await client.get('/api/cashier/drawer');
      return res.data as CashierDrawerTotals;
    } catch {
      return null;
    }
  };

  const cashierReverse = async (rawId: string) => {
    await client.post(`/api/cashier/reverse/${rawId}`);
    await Promise.all([loadAccounts(), loadTransactions()]);
    showToast('Cashier transaction reversed.', 'success');
  };

  const cashierCheque = async (accountNumber: string, amount: number) => {
    const res = await client.post('/api/cashier/cheque/clear', { accountNumber, amount });
    await Promise.all([loadAccounts(), loadTransactions()]);
    return {
      reference: res.data.reference,
      newBalance: Number(res.data.newBalance),
    };
  };

  // ---- loans ----
  const applyForLoan = async ({
    principalAmount,
    tenureMonths,
    interestRate,
  }: {
    principalAmount: number;
    tenureMonths: number;
    interestRate: number;
  }) => {
    const res = await client.post('/api/loans', {
      amount: principalAmount,
      interestRate,
      tenureMonths,
    });
    await loadLoans();
    return mapLoan(res.data);
  };

  const previewEmi = async (amount: number, rate: number, months: number): Promise<EmiPreview> => {
    const res = await client.get('/api/loans/emi-preview', {
      params: { amount, interestRate: rate, tenureMonths: months },
    });
    return res.data as EmiPreview;
  };

  const loanSchedule = async (id: string): Promise<EmiInstallment[]> => {
    const res = await client.get(`/api/loans/${id}/schedule`);
    return res.data as EmiInstallment[];
  };

  const approveLoan = async (loanId: string) => {
    await client.post(`/api/loans/${loanId}/approve`);
    await loadLoans();
    showToast(`Loan ${loanId} approved`, 'success');
  };

  const rejectLoan = async (loanId: string) => {
    await client.post(`/api/loans/${loanId}/reject`);
    await loadLoans();
    showToast(`Loan ${loanId} rejected`, 'info');
  };

  const disburseLoan = async (loanId: string) => {
    await client.post(`/api/loans/${loanId}/disburse`);
    await Promise.all([loadLoans(), loadAccounts()]);
    showToast(`Loan ${loanId} disbursed`, 'success');
  };

  const cancelLoan = async (loanId: string) => {
    await client.post(`/api/loans/${loanId}/cancel`);
    await loadLoans();
    showToast(`Loan ${loanId} cancelled`, 'info');
  };

  const payEmi = async (loanId: string, installment: number) => {
    const res = await client.post(`/api/loans/${loanId}/emi/${installment}/pay`);
    await Promise.all([loadAccounts(), loadLoans()]);
    showToast(`EMI ${installment} paid.`, 'success');
    return res.data;
  };

  // ---- staff ----
  const createStaffMember = async ({
    name,
    email,
    password,
    role,
  }: {
    name: string;
    email: string;
    password?: string;
    role: 'MANAGER' | 'CASHIER';
  }) => {
    const res = await client.post('/api/manager/staff', {
      email,
      fullName: name,
      password: password || 'Temp@12345',
      role,
    });
    await loadStaff();
    const s = mapStaff({ ...res.data, enabled: true }, role);
    showToast(`Staff ${name} created`, 'success');
    return s;
  };

  const changeStaffRole = async (id: string, newRole: 'MANAGER' | 'CASHIER') => {
    await client.put(`/api/manager/staff/${id}/role`, null, { params: { role: newRole } });
    await loadStaff();
    showToast(`Role updated to ${newRole}`, 'success');
  };

  const toggleStaffStatus = async (id: string) => {
    const current = staffList.find((s) => s.id === id);
    const nextEnabled = current?.status !== 'Enabled';
    await client.put(`/api/manager/staff/${id}/enabled`, null, {
      params: { enabled: nextEnabled },
    });
    await loadStaff();
    showToast(nextEnabled ? 'Enabled' : 'Disabled', 'info');
  };

  return (
    <BankingContext.Provider
      value={{
        currentUser,
        accounts,
        allAccounts, // EXPORTED
        transactions,
        loans,
        staffList,
        counterparties,
        currentRoute,
        selectedAccountId,
        notificationCount,
        toast,
        toastQueue,
        dismissToast,
        loading,
        online,
        showToast,
        hideToast,
        navigate,
        setSelectedAccountId,
        login,
        logout,
        register,
        changePassword,
        switchRole,
        transferFunds,
        previewTransfer,
        previewTransferFull,
        cancelTransfer,
        reverseTransfer,
        loadCounterparties,
        monthlyStatement,
        depositCash,
        withdrawCash,
        cashierDrawer,
        cashierReverse,
        cashierCheque,
        openNewAccount,
        activateAccount,
        freezeAccount,
        unfreezeAccount,
        lookupAccount,
        accountStatement,
        applyForLoan,
        previewEmi,
        loanSchedule,
        approveLoan,
        rejectLoan,
        disburseLoan,
        cancelLoan,
        payEmi,
        createStaffMember,
        changeStaffRole,
        toggleStaffStatus,
        loadAccounts,
        loadTransactions,
        loadLoans,
        loadStaff,
        loadAllAccounts, 
        managerUpdateAccountStatus,
		bulkUpdateAccountStatus, 
      }}
    >
      {children}
    </BankingContext.Provider>
  );
};

export const useBanking = () => {
  const ctx = useContext(BankingContext);
  if (!ctx) throw new Error('useBanking must be used within BankingProvider');
  return ctx;
};