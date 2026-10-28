import React, { useState } from 'react';
import { useBanking } from '../../context/BankingContext';
import { StaffMember } from '../../types';

export const StaffManagementView: React.FC = () => {
  const {
    staffList,
    createStaffMember,
    changeStaffRole,
    toggleStaffStatus,
    showToast,
  } = useBanking();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'MANAGER' | 'CASHIER'>('CASHIER');
  const [creating, setCreating] = useState(false);

  // Change role form
  const [updatedRole, setUpdatedRole] = useState<'MANAGER' | 'CASHIER'>('CASHIER');
  const [updatingRole, setUpdatingRole] = useState(false);

  const filteredStaff = staffList.filter((s) => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const managersCount = staffList.filter((s) => s.role === 'MANAGER' && s.status === 'Enabled').length;
  const cashiersCount = staffList.filter((s) => s.role === 'CASHIER' && s.status === 'Enabled').length;
  const disabledCount = staffList.filter((s) => s.status === 'Disabled').length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      showToast('Name, email, and password are required.', 'error');
      return;
    }
    if (newStaffPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setCreating(true);
    try {
      await createStaffMember({
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        password: newStaffPassword,
        role: newStaffRole,
      });
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffRole('CASHIER');
      setIsCreateModalOpen(false);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to create staff account', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openChangeRole = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setUpdatedRole(staff.role);
    setIsChangeRoleModalOpen(true);
  };

  const handleRoleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setUpdatingRole(true);
    try {
      await changeStaffRole(selectedStaff.id, updatedRole);
      setIsChangeRoleModalOpen(false);
      setSelectedStaff(null);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to change role', 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    setBusyId(staff.id);
    try {
      await toggleStaffStatus(staff.id);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Status change failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#005cab] uppercase tracking-widest font-bold">
              Institutional Governance
            </span>
          </div>
          <h1 className="text-3xl text-[#002743] font-bold tracking-tight">Staff Management</h1>
          <p className="text-xs sm:text-sm text-[#42474e] mt-1">
            Directory and access control governance for branch managers, cashiers, and administrative officers.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 rounded-lg bg-[#002743] text-white hover:bg-[#0a3d62] transition-colors shadow-sm flex items-center gap-2 text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Create staff account</span>
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#72777f] uppercase tracking-wider font-bold">Managers</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl text-[#002743] font-bold">{managersCount}</span>
                <span className="text-xs text-[#3bbc5f] font-bold">Enabled</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#002743]">
              <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs border-t border-[#f0f3ff]">
            <span className="text-[#42474e]">
              {staffList.filter((s) => s.role === 'MANAGER').length} total
            </span>
            <span className="font-data-mono text-[#005cab] font-semibold">MANAGER</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#72777f] uppercase tracking-wider font-bold">Cashiers</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl text-[#002743] font-bold">{cashiersCount}</span>
                <span className="text-xs text-[#3bbc5f] font-bold">Enabled</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#e7eefe] flex items-center justify-center text-[#005cab]">
              <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs border-t border-[#f0f3ff]">
            <span className="text-[#42474e]">
              {staffList.filter((s) => s.role === 'CASHIER').length} total
            </span>
            <span className="font-data-mono text-[#005cab] font-semibold">CASHIER</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#72777f] uppercase tracking-wider font-bold">
                Disabled Accounts
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl text-[#002743] font-bold">{disabledCount}</span>
                <span className="text-xs text-[#72777f] font-semibold">Inactive</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#e2e8f8] flex items-center justify-center text-[#00451a]">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center justify-between text-xs border-t border-[#f0f3ff]">
            <span className="text-[#42474e]">Total staff</span>
            <span className="font-data-mono text-[#002743] font-bold">{staffList.length}</span>
          </div>
        </div>
      </div>

      {/* Directory */}
      <div className="bg-white rounded-xl shadow-sm border border-[#c2c7cf]/30 flex flex-col overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e2e8f8]">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-[#002743]">Staff Directory</h2>
            <span className="text-xs text-[#72777f]">
              Manage active authentication access and branch responsibilities
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#72777f] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-10 pl-9 pr-3 bg-[#f0f3ff] text-[#151c27] text-xs rounded-lg focus:bg-white focus:outline-none border border-[#c2c7cf]/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 px-3 bg-[#f0f3ff] text-[#151c27] text-xs font-semibold rounded-lg border border-[#c2c7cf]/40 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="MANAGER">Managers</option>
                <option value="CASHIER">Cashiers</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 bg-[#f0f3ff] text-[#151c27] text-xs font-semibold rounded-lg border border-[#c2c7cf]/40 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="Enabled">Enabled</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f0f3ff] flex items-center justify-center text-[#72777f] mb-4">
              <span className="material-symbols-outlined text-[32px]">group_off</span>
            </div>
            <h3 className="text-base font-bold text-[#002743]">
              {staffList.length === 0 ? 'No staff accounts yet' : 'No staff match your filters'}
            </h3>
            <p className="text-xs text-[#72777f] max-w-sm mt-1 mb-6">
              {staffList.length === 0
                ? 'Create the first staff account to get started.'
                : 'Try clearing the search or filter criteria.'}
            </p>
            {staffList.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-10 px-4 rounded-lg bg-[#002743] text-white text-xs font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Create the first one</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="h-10 px-4 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[850px] border-collapse">
              <thead>
                <tr className="bg-[#f0f3ff] text-[#72777f] text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-6">Staff Member</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Role Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provisioned</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ff]">
                {filteredStaff.map((staff, idx) => (
                  <tr
                    key={staff.id}
                    className={`${idx % 2 === 1 ? 'bg-[#f0f3ff]/30' : 'bg-white'} hover:bg-[#e2e8f8]/50 transition-colors`}
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            staff.role === 'MANAGER' ? 'bg-[#0a3d62]' : 'bg-[#005cab]'
                          }`}
                        >
                          {staff.avatarInitials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#002743] leading-none">{staff.name}</span>
                          <span className="text-[11px] text-[#72777f] mt-1">ID: {staff.code}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-data-mono text-[#151c27]">{staff.email}</span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold tracking-wide ${
                          staff.role === 'MANAGER'
                            ? 'bg-[#002743] text-white'
                            : 'bg-[#e2e8f8] text-[#002743]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {staff.role === 'MANAGER' ? 'shield_person' : 'payments'}
                        </span>
                        {staff.role}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          staff.status === 'Enabled'
                            ? 'bg-[#DCFCE7] text-[#16A34A]'
                            : 'bg-[#e2e8f8] text-[#72777f]'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            staff.status === 'Enabled' ? 'bg-[#16A34A]' : 'bg-[#72777f]'
                          }`}
                        ></span>
                        {staff.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-[#42474e]">
                      {staff.provisionedDate}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openChangeRole(staff)}
                          className="h-8 px-2.5 rounded bg-[#e7eefe] text-[#005cab] hover:bg-[#005cab] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          <span>Change role</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff)}
                          disabled={busyId === staff.id}
                          className={`h-8 px-2.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50 ${
                            staff.status === 'Enabled'
                              ? 'bg-[#ffdad6]/40 text-[#ba1a1a] hover:bg-[#ffdad6]'
                              : 'bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {staff.status === 'Enabled' ? 'block' : 'check_circle'}
                          </span>
                          <span>
                            {busyId === staff.id
                              ? 'Working…'
                              : staff.status === 'Enabled'
                              ? 'Disable'
                              : 'Enable'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 bg-[#f0f3ff] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#72777f] gap-2 border-t border-[#e2e8f8]">
          <span>
            Showing <strong className="text-[#002743]">{filteredStaff.length}</strong> of{' '}
            <strong className="text-[#002743]">{staffList.length}</strong> staff accounts
          </span>
          <span className="font-semibold text-[#002743]">Page 1 of 1</span>
        </div>
      </div>

      {/* Role matrix — honest about permissions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#c2c7cf]/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[#005cab] text-[20px]">policy</span>
          <h3 className="text-sm font-bold text-[#002743]">Role Authority &amp; Entitlements</h3>
        </div>
        <p className="text-xs text-[#42474e] mb-4">
          Backend-enforced role boundaries. Only BANK can create MANAGER; MANAGER can create CASHIER.
        </p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[#f0f3ff] flex items-start gap-2.5 text-xs">
            <span className="px-2 py-0.5 rounded bg-[#002743] text-white text-[10px] font-bold mt-0.5">
              MANAGER
            </span>
            <span className="text-[#151c27]">
              Loan underwriting approval, credit facility override, cashier creation, staff directory read/write.
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f3ff] flex items-start gap-2.5 text-xs">
            <span className="px-2 py-0.5 rounded bg-[#e2e8f8] text-[#002743] text-[10px] font-bold mt-0.5">
              CASHIER
            </span>
            <span className="text-[#151c27]">
              Over-the-counter deposit posting, withdrawal processing, cheque clearance, drawer totals.
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Create staff */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-[#c2c7cf]/40">
            <div className="px-6 py-5 bg-[#f0f3ff] flex items-start justify-between border-b border-[#e2e8f8]">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-[#002743]">Create staff account</h3>
                <p className="text-xs text-[#72777f] mt-0.5">
                  Provision new credential for authorized branch personnel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#e2e8f8] text-[#72777f] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="px-6 py-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#002743]">
                  Full Name <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Arun Verma"
                  className="w-full h-11 px-3.5 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs focus:bg-white focus:outline-none border border-[#c2c7cf]/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#002743]">
                  Email Address <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="e.g. arun.v@javabank.com"
                  className="w-full h-11 px-3.5 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs focus:bg-white focus:outline-none border border-[#c2c7cf]/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#002743]">
                  Password <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 px-3.5 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs focus:bg-white focus:outline-none border border-[#c2c7cf]/40"
                />
                <span className="text-[11px] text-[#72777f]">Minimum 8 characters</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#002743]">
                  Role <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'MANAGER' | 'CASHIER')}
                  className="w-full h-11 px-3.5 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs font-semibold focus:outline-none border border-[#c2c7cf]/40 cursor-pointer"
                >
                  <option value="CASHIER">CASHIER</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#e2e8f8]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="h-10 px-4 rounded-lg bg-[#f0f3ff] text-[#151c27] hover:bg-[#e2e8f8] text-xs font-semibold disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 px-5 rounded-lg bg-[#002743] text-white hover:bg-[#0a3d62] text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>{creating ? 'Creating…' : 'Create staff account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Change role */}
      {isChangeRoleModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[#c2c7cf]/40">
            <div className="px-6 py-5 bg-[#f0f3ff] flex items-start justify-between border-b border-[#e2e8f8]">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-[#002743]">Change staff role</h3>
                <p className="text-xs text-[#72777f] mt-0.5">
                  Modifying permissions for {selectedStaff.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeRoleModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#e2e8f8] text-[#72777f] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRoleUpdateSubmit} className="px-6 py-5 flex flex-col gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#f0f3ff] flex items-center justify-between border border-[#c2c7cf]/30">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#72777f]">Current role</span>
                  <span className="text-sm font-bold text-[#002743] mt-0.5">{selectedStaff.role}</span>
                </div>
                <span className="material-symbols-outlined text-[#005cab] text-[24px]">verified</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#002743]">New role</label>
                <select
                  value={updatedRole}
                  onChange={(e) => setUpdatedRole(e.target.value as 'MANAGER' | 'CASHIER')}
                  className="w-full h-11 px-3.5 rounded-lg bg-[#f0f3ff] text-[#151c27] text-xs font-semibold focus:outline-none border border-[#c2c7cf]/40 cursor-pointer"
                >
                  <option value="CASHIER">CASHIER</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#e2e8f8]">
                <button
                  type="button"
                  onClick={() => setIsChangeRoleModalOpen(false)}
                  disabled={updatingRole}
                  className="h-10 px-4 rounded-lg bg-[#f0f3ff] text-[#151c27] hover:bg-[#e2e8f8] text-xs font-semibold disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="h-10 px-5 rounded-lg bg-[#002743] text-white hover:bg-[#0a3d62] text-xs font-bold shadow-sm disabled:opacity-60"
                >
                  {updatingRole ? 'Updating…' : 'Update role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};