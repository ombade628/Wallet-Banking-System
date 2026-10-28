import React, { useEffect, useState, useMemo } from 'react';
import { useBanking } from '../../context/BankingContext';
import { BankAccount } from '../../types';

export const ManageAccountsView: React.FC = () => {
  const { 
    allAccounts, 
    loadAllAccounts, 
    managerUpdateAccountStatus, 
    bulkUpdateAccountStatus,
    showToast 
  } = useBanking();

  // --- UI State ---
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'FROZEN'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SAVINGS' | 'CHECKING' | 'BUSINESS' | 'FIXED_DEPOSIT'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Drawer State
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // --- Data Loading & Polling ---
  useEffect(() => {
    loadAllAccounts().finally(() => setLoading(false));
    const interval = setInterval(() => loadAllAccounts(), 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [loadAllAccounts]);

  // --- Derived State ---
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter(acc => {
      if (statusFilter !== 'ALL' && acc.status.toUpperCase() !== statusFilter) return false;
      if (typeFilter !== 'ALL' && acc.accountType !== typeFilter) return false;
      
      if (search) {
        const q = search.toLowerCase();
        const matchMasked = acc.maskedNumber.includes(q);
        const matchFull = acc.accountNumber.includes(q);
        const matchOwner = acc.title.toLowerCase().includes(q); // Fallback if name isn't fully mapped
        return matchMasked || matchFull || matchOwner;
      }
      return true;
    });
  }, [allAccounts, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    let totalBalance = 0;
    let pendingCount = 0;
    let activeCount = 0;
    
    allAccounts.forEach(acc => {
      if (acc.status === 'active') {
        totalBalance += acc.balance;
        activeCount++;
      }
      if (acc.status === 'pending') pendingCount++;
    });

    return { totalBalance, pendingCount, activeCount };
  }, [allAccounts]);

  // --- Handlers ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredAccounts.map(a => a.id);
      setSelectedIds(new Set(allFilteredIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkApprove = () => {
    if (!window.confirm(`Are you sure you want to approve ${selectedIds.size} accounts?`)) return;
    bulkUpdateAccountStatus(Array.from(selectedIds), 'activate');
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    if (filteredAccounts.length === 0) {
      showToast('No accounts to export.', 'info');
      return;
    }
    const header = 'Account Number,Type,Balance,Status,Opened Date\n';
    const rows = filteredAccounts.map(a => 
      `${a.accountNumber},${a.accountType},${a.balance},${a.status},${a.openedDate}`
    ).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accounts_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded successfully.', 'success');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <span className="px-2.5 py-1 bg-[#DCFCE7] text-[#15803D] rounded-full text-[11px] font-bold tracking-wide">ACTIVE</span>;
      case 'pending': return <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#B45309] rounded-full text-[11px] font-bold tracking-wide">PENDING</span>;
      case 'frozen': return <span className="px-2.5 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-full text-[11px] font-bold tracking-wide">FROZEN</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-bold">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 relative">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#72777f] mb-1">
            <span>Manager Portal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#002743] font-semibold">Account Governance</span>
          </div>
          <h1 className="text-3xl text-[#002743] font-bold tracking-tight">Manage Accounts</h1>
          <p className="text-sm text-[#42474e]">Review pending KYC, freeze suspicious activity, and monitor branch portfolios.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="px-4 py-2 bg-white border border-[#c2c7cf]/50 rounded-lg text-xs font-semibold text-[#002743] hover:bg-[#f0f3ff] flex items-center gap-2 shadow-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
          </button>
          <button 
            onClick={() => { setLoading(true); loadAllAccounts().finally(() => setLoading(false)); showToast('Accounts refreshed', 'info'); }}
            className="px-4 py-2 bg-[#002743] text-white rounded-lg text-xs font-semibold hover:bg-[#0a3d62] flex items-center gap-2 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* --- Stats Row --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#c2c7cf]/30 shadow-sm">
          <span className="text-[11px] font-bold text-[#72777f] uppercase tracking-wider">Total Branch Deposits</span>
          <div className="text-2xl font-bold text-[#002743] mt-1 font-data-mono">
            ₹{stats.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#c2c7cf]/30 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[11px] font-bold text-[#72777f] uppercase tracking-wider">Pending Approvals</span>
            <div className="text-2xl font-bold text-[#B45309] mt-1 font-data-mono">{stats.pendingCount}</div>
          </div>
          {stats.pendingCount > 0 && (
            <span className="w-3 h-3 rounded-full bg-[#F59E0B] animate-pulse"></span>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#c2c7cf]/30 shadow-sm">
          <span className="text-[11px] font-bold text-[#72777f] uppercase tracking-wider">Active Accounts</span>
          <div className="text-2xl font-bold text-[#15803D] mt-1 font-data-mono">{stats.activeCount}</div>
        </div>
      </div>

      {/* --- Filters & Bulk Actions --- */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#c2c7cf]/30 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#72777f] text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search account number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-[#f0f3ff] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005cab]"
            />
          </div>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-10 px-3 bg-[#f0f3ff] rounded-lg text-sm font-semibold text-[#42474e] cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="SAVINGS">Savings</option>
            <option value="CHECKING">Checking</option>
            <option value="BUSINESS">Business</option>
            <option value="FIXED_DEPOSIT">Fixed Deposit</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
          {['ALL', 'PENDING', 'ACTIVE', 'FROZEN'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === f ? 'bg-[#002743] text-white shadow-sm' : 'bg-[#f0f3ff] text-[#42474e] hover:bg-[#e2e8f8]'}`}
            >
              {f}
            </button>
          ))}
          
          {selectedIds.size > 0 && statusFilter === 'PENDING' && (
            <button 
              onClick={handleBulkApprove}
              className="ml-2 px-4 py-2 bg-[#16A34A] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#15803D] whitespace-nowrap flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Bulk Approve ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* --- Main Table --- */}
      <div className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#72777f] text-[11px] uppercase tracking-wider font-semibold border-b border-[#e2e8f8]">
                {statusFilter === 'PENDING' && (
                  <th className="py-3 px-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-[#002743] focus:ring-[#002743]"
                      checked={filteredAccounts.length > 0 && selectedIds.size === filteredAccounts.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="py-3 px-4">Account Identity</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff]">
              {loading && allAccounts.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-[#72777f]">Loading accounts...</td></tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center flex flex-col items-center justify-center text-[#72777f]">
                    <span className="material-symbols-outlined text-[32px] text-[#c2c7cf] mb-2">search_off</span>
                    <span>No accounts match your filters.</span>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className={`hover:bg-[#f8faff] transition-colors ${selectedIds.has(acc.id) ? 'bg-[#f0f3ff]' : ''}`}>
                    {statusFilter === 'PENDING' && (
                      <td className="py-4 px-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-[#002743] focus:ring-[#002743]"
                          checked={selectedIds.has(acc.id)}
                          onChange={() => handleSelectRow(acc.id)}
                        />
                      </td>
                    )}
                    <td className="py-4 px-4">
                      <div className="flex flex-col cursor-pointer group" onClick={() => setSelectedAccount(acc)}>
                        <span className="font-bold text-[#002743] font-mono group-hover:text-[#005cab] transition-colors">{acc.accountNumber}</span>
                        <span className="text-[11px] text-[#72777f] mt-0.5">ID: {acc.id.split('-')[0]}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-[#42474e]">
                      <span className="px-2 py-0.5 bg-[#e2e8f8] rounded text-[11px] font-bold tracking-wide">{acc.accountType}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-data-mono font-bold text-[#151c27]">
                      ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(acc.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedAccount(acc)} 
                          className="px-3 py-1.5 bg-[#f0f3ff] text-[#005cab] rounded text-xs font-bold hover:bg-[#e2e8f8] transition-colors"
                        >
                          Details
                        </button>
                        {acc.status === 'pending' && (
                          <button onClick={() => managerUpdateAccountStatus(acc.id, 'activate')} className="px-3 py-1.5 bg-[#16A34A] text-white rounded text-xs font-bold hover:bg-[#15803D] transition-colors shadow-sm">
                            Approve
                          </button>
                        )}
                        {acc.status === 'active' && (
                          <button onClick={() => { if(window.confirm('Freeze this account?')) managerUpdateAccountStatus(acc.id, 'freeze'); }} className="px-3 py-1.5 bg-white border border-[#ba1a1a]/30 text-[#ba1a1a] rounded text-xs font-bold hover:bg-[#ffdad6] transition-colors">
                            Freeze
                          </button>
                        )}
                        {acc.status === 'frozen' && (
                          <button onClick={() => managerUpdateAccountStatus(acc.id, 'unfreeze')} className="px-3 py-1.5 bg-[#FEF3C7] text-[#B45309] rounded text-xs font-bold hover:bg-[#FDE68A] transition-colors">
                            Unfreeze
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-[#f0f3ff] px-6 py-3 border-t border-[#e2e8f8] text-[11px] text-[#72777f] flex justify-between items-center font-medium">
          <span>Showing {filteredAccounts.length} of {allAccounts.length} total accounts</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span> Synced with CBS</span>
        </div>
      </div>

      {/* --- Slide-over Drawer (View Account Details) --- */}
      {selectedAccount && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSelectedAccount(null)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="p-6 bg-[#002743] text-white flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#80a8d3]">Account Details</span>
                <h2 className="text-2xl font-bold mt-1 font-mono">{selectedAccount.accountNumber}</h2>
              </div>
              <button 
                onClick={() => setSelectedAccount(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* Status & Balance Banner */}
              <div className="bg-[#f0f3ff] p-5 rounded-xl border border-[#c2c7cf]/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#72777f] uppercase tracking-wider">Current Status</span>
                  {getStatusBadge(selectedAccount.status)}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#72777f] uppercase tracking-wider">Available Balance</span>
                  <div className="text-3xl font-bold text-[#002743] font-data-mono mt-1">
                    ₹{selectedAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#f0f3ff]">
                  <span className="text-[#72777f] font-medium">Account Type</span>
                  <span className="font-bold text-[#151c27]">{selectedAccount.accountType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f0f3ff]">
                  <span className="text-[#72777f] font-medium">Opened Date</span>
                  <span className="font-bold text-[#151c27]">{selectedAccount.openedDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f0f3ff]">
                  <span className="text-[#72777f] font-medium">Currency</span>
                  <span className="font-bold text-[#151c27]">{selectedAccount.currency}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f0f3ff]">
                  <span className="text-[#72777f] font-medium">IFSC Code</span>
                  <span className="font-bold font-mono text-[#151c27]">{selectedAccount.ifscCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#f0f3ff]">
                  <span className="text-[#72777f] font-medium">Branch</span>
                  <span className="font-bold text-right text-[#151c27] max-w-[200px]">{selectedAccount.branch}</span>
                </div>
              </div>

              {/* Warning Box */}
              <div className="p-3 bg-[#ffdad6]/30 rounded-lg text-[#ba1a1a] flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
                <p className="text-xs leading-relaxed font-medium">
                  Freezing an account immediately suspends all outbound transfers, wire routing, and ATM withdrawals.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-[#e2e8f8] bg-[#f9f9ff] flex gap-3">
              {selectedAccount.status === 'pending' && (
                <button 
                  onClick={() => { managerUpdateAccountStatus(selectedAccount.id, 'activate'); setSelectedAccount(null); }}
                  className="flex-1 py-2.5 bg-[#16A34A] text-white rounded-lg font-bold text-sm shadow-sm hover:bg-[#15803D]"
                >
                  Approve Account
                </button>
              )}
              {selectedAccount.status === 'active' && (
                <button 
                  onClick={() => { managerUpdateAccountStatus(selectedAccount.id, 'freeze'); setSelectedAccount(null); }}
                  className="flex-1 py-2.5 bg-[#ba1a1a] text-white rounded-lg font-bold text-sm shadow-sm hover:bg-[#93000a]"
                >
                  Freeze Account
                </button>
              )}
              {selectedAccount.status === 'frozen' && (
                <button 
                  onClick={() => { managerUpdateAccountStatus(selectedAccount.id, 'unfreeze'); setSelectedAccount(null); }}
                  className="flex-1 py-2.5 bg-[#F59E0B] text-white rounded-lg font-bold text-sm shadow-sm hover:bg-[#D97706]"
                >
                  Unfreeze Account
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};