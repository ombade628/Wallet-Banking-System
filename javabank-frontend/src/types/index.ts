// ============================================================================
// Auth & user
// ============================================================================
export type UserRole = 'CUSTOMER' | 'MANAGER' | 'CASHIER' | 'BANK';
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  allRoles?: UserRole[]; // <--- ADD THIS
  branch?: string;
  branchId?: string;
  avatarUrl?: string;
}

/** Backend /api/auth/me — used if you wire the /me endpoint */
export interface AuthMe {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface LoginResponse {
  token: string;
}

// ============================================================================
// Accounts
// ============================================================================
export type AccountType = 'SAVINGS' | 'CHECKING' | 'BUSINESS' | 'FIXED_DEPOSIT';

export type AccountStatus = 'active' | 'pending' | 'frozen';

export type BackendAccountStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface BankAccount {
  id: string;
  accountNumber: string;
  maskedNumber: string;
  accountType: AccountType;
  title: string;
  subtitle: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  openedDate: string;
  ifscCode: string;
  branch: string;
  interestRate?: string;
  overdraftLimit?: number;
  maturityDate?: string;
  yieldRate?: string;
  directDepositActive?: boolean;
  version?: number;
}

/** Shape of /api/accounts response */
export interface AccountApiResponse {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
  type: AccountType;
  status: BackendAccountStatus;
  createdAt?: string;
}

export interface AccountStatement {
  accountNumber: string;
  year: number;
  month: number;
  entryCount: number;
  totalDebits: number;
  totalCredits: number;
  netFlow: number;
  closingBalance: number;
}

// ============================================================================
// Transactions
// ============================================================================
export type TransactionDirection = 'SENT' | 'RECEIVED';

export type TransactionStatus = 'SETTLED' | 'PENDING' | 'FAILED';

export interface Transaction {
  /** UUID — required for reverse / cancel calls */
  rawId?: string;
  id: string;
  reference: string;
  date: string;
  time: string;
  fromAccount: string;
  fromAccountType?: string;
  toAccount: string;
  toAccountType?: string;
  toEntityName?: string;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  status: TransactionStatus;
  note?: string;
}

/** Shape of /api/transfers/history entry */
export interface TransactionApiView {
  id: string;
  requestId: string;
  fromAccountId: string | null;
  fromAccountNumber: string | null;
  toAccountId: string | null;
  toAccountNumber: string | null;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface TransferResponse {
  transactionId: string;
  requestId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  createdAt: string;
  /** Only present if backend includes it */
  newFromBalance?: number;
}

export interface TransferPreview {
  from: string;
  fromOwner: string;
  fromBalance: number;
  to: string;
  toOwner: string;
  amount: number;
  fee: number;
  totalDebit: number;
  currency: string;
  sufficientFunds: boolean;
}

export interface FeePreview {
  amount: number;
  fee: number;
  totalDebit: number;
}

// ============================================================================
// Cashier
// ============================================================================
export interface DepositResponse {
  reference: string;
  accountNumber: string;
  holderName: string;
  amount: number;
  newBalance: number;
  type: string;
  timestamp: string;
}

export interface WithdrawResponse {
  reference: string;
  accountNumber: string;
  amount: number;
  newBalance: number;
  type: string;
  timestamp: string;
}

export interface CashierDrawerTotals {
  date: string;
  depositCount: number;
  depositTotal: number;
  withdrawCount: number;
  withdrawTotal: number;
  chequeCount: number;
  chequeTotal: number;
  netCash: number;
}

// ============================================================================
// Loans
// ============================================================================
export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type EmiStatus = 'UPCOMING' | 'DUE' | 'PAID' | 'OVERDUE' | 'MONATORIUM';

export interface LoanApplication {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  employer?: string;
  cibilScore?: number;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  status: LoanStatus;
  appliedDate: string;
  appliedTimestamp: string;
  approvalNote?: string;
  reviewedBy?: string;
  /** Additional fields the backend returns */
  outstandingAmount?: number;
  approvedDate?: string;
  disbursedDate?: string;
}

export interface EmiInstallment {
  installmentNumber: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: EmiStatus;
  paidDate?: string;
}

export interface EmiPreview {
  amount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalPayable: number;
  totalInterest: number;
}

export interface LoanEmiPaymentResponse {
  loanId: string;
  installmentNumber: number;
  amountPaid: number;
  newBalance: number;
  loanOutstanding: number;
  loanStatus: string;
}

// ============================================================================
// Staff
// ============================================================================
export interface StaffMember {
  id: string;
  code: string;
  name: string;
  email: string;
  role: 'MANAGER' | 'CASHIER' | 'CUSTOMER';
  status: 'Enabled' | 'Disabled';
  provisionedDate: string;
  avatarInitials: string;
  createdAt?: string;
}

export interface StaffApiResponse {
  id: string;
  email: string;
  fullName: string;
  enabled: boolean;
  roles: string[];
  createdAt?: string;
}

// ============================================================================
// Errors
// ============================================================================
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}

// ============================================================================
// Dashboard / stats
// ============================================================================
export interface BankStats {
  totalUsers: number;
  customers: number;
  managers: number;
  cashiers: number;
  pendingLoans: number;
}

export interface CustomerDashboard {
  accounts: AccountApiResponse[];
  recentTransactions: TransactionApiView[];
  loans: LoanApplication[];
}

// ============================================================================
// Toast (kept here for reuse)
// ============================================================================
export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
}