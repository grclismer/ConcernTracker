import { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import type { CurrentUser } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

type SuperAdminDashboardProps = {
  user: CurrentUser;
  onLogout: () => void;
  onSettings: () => void;
};

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  department: string;
  job_title: string;
  employee_id: string;
  created_at: string;
  is_approved: boolean;
  role: string;
}

export default function SuperAdminDashboard({ user, onLogout, onSettings }: SuperAdminDashboardProps) {
  const [pendingStaff, setPendingStaff] = useState<StaffProfile[]>([]);
  const [allStaff, setAllStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPendingStaff(data.filter(s => !s.is_approved));
        setAllStaff(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch staff accounts';
      console.error('Error fetching staff:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (staffId: string) => {
    setActionLoading(staffId);
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ is_approved: true })
        .eq('id', staffId);

      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      console.error('Error approving staff:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (staffId: string) => {
    if (!confirm('Are you sure you want to reject and delete this staff registration?')) return;
    
    setActionLoading(staffId);
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', staffId);

      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      console.error('Error rejecting staff:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">C</div>
            <span className="text-slate-900 font-semibold text-sm">ConcernTrack</span>
          </div>
          <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
            Super Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">{user.email}</span>
          <button onClick={onSettings} className="text-slate-400 hover:text-slate-900 transition-colors text-xl" title="Account Settings">
            ⚙
          </button>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-600 transition-colors text-xl" title="Sign out">
            ⇥
          </button>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Super Admin Panel
          </h1>
          <p className="text-slate-500 mt-1">Manage staff accounts and system settings</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Database Permission Error</p>
              <p className="text-xs mt-0.5 text-red-500">{error}</p>
              <p className="text-xs mt-2 underline cursor-pointer font-bold" onClick={fetchStaff}>Try again</p>
            </div>
          </div>
        )}

        {/* Section 1: Pending Approvals */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Pending Staff Accounts</h2>
                <p className="text-sm text-slate-500 mt-0.5">These accounts are waiting for your approval before they can log in</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold">Job Title</th>
                  <th className="px-6 py-4 font-semibold">Employee ID</th>
                  <th className="px-6 py-4 font-semibold">Registered</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#4b5563]">Loading pending accounts...</td>
                  </tr>
                ) : pendingStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <CheckCircleIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No pending accounts</p>
                      <p className="text-slate-400 text-xs mt-1">All staff accounts have been reviewed</p>
                    </td>
                  </tr>
                ) : (
                  pendingStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">{staff.full_name}</td>
                      <td className="px-6 py-4 text-slate-600">{staff.email}</td>
                      <td className="px-6 py-4 text-slate-600">{staff.department}</td>
                      <td className="px-6 py-4 text-slate-600">{staff.job_title}</td>
                      <td className="px-6 py-4 text-slate-600 font-mono">{staff.employee_id}</td>
                      <td className="px-6 py-4 text-slate-600">{format(new Date(staff.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(staff.id)} 
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 border border-green-200 text-green-700 text-xs font-bold rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {actionLoading === staff.id ? '...' : '✓ Approve'}
                          </button>
                          <button 
                            onClick={() => handleReject(staff.id)} 
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {actionLoading === staff.id ? '...' : '✗ Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: All Staff Accounts */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900">All Staff Accounts</h2>
            <p className="text-sm text-slate-500 mt-0.5">Complete list of all registered staff members</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold">Job Title</th>
                  <th className="px-6 py-4 font-semibold">Employee ID</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#4b5563]">Loading accounts...</td>
                  </tr>
                ) : allStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <XMarkIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No staff accounts yet</p>
                      <p className="text-slate-400 text-xs mt-1">Staff members will appear here after registration</p>
                    </td>
                  </tr>
                ) : (
                  allStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">{staff.full_name}</td>
                      <td className="px-6 py-4 text-slate-600">{staff.email}</td>
                      <td className="px-6 py-4 text-slate-600">{staff.department}</td>
                      <td className="px-6 py-4 text-slate-600">{staff.job_title}</td>
                      <td className="px-6 py-4 text-slate-600 font-mono">{staff.employee_id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          staff.is_approved 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {staff.is_approved ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {staff.role !== 'superadmin' && (
                          <button 
                            onClick={() => handleReject(staff.id)}
                            disabled={!!actionLoading}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Account"
                          >
                            <UserMinusIcon className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
