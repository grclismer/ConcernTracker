import { useState, useRef, useEffect } from 'react';
import { 
  ArrowDownTrayIcon, 
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useConcerns } from '../hooks/useConcerns';
import type { Concern } from '../hooks/useConcerns';
import type { CurrentUser } from '../hooks/useAuth';
import ConcernDetailDrawer from './ConcernDetailDrawer';
import { differenceInDays, format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

interface AdminDashboardProps {
  user: CurrentUser;
}

const getDaysOpen = (submittedAt: string) =>
  differenceInDays(new Date(), new Date(submittedAt));

const getSLAStatus = (concern: Concern) => {
  const days = getDaysOpen(concern.submitted_at);
  if (concern.status === 'Resolved') return 'resolved';
  if (days > 5) return 'critical';
  if (days > 2) return 'warning';
  return 'ok';
};

const getSLAColor = (concern: Concern) => {
  const sla = getSLAStatus(concern);
  if (sla === 'critical') return 'text-red-600';
  if (sla === 'warning') return 'text-amber-600';
  if (sla === 'resolved') return 'text-slate-500';
  return 'text-green-600';
};

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const { fetchConcerns, concerns, updateConcernStatus, loading } = useConcerns();
  const [selectedConcern, setSelectedConcern] = useState<Concern | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const data = await fetchConcerns();
      if (data) {
        // Filter to department-specific concerns before SLA escalation check
        const deptData = user.role === 'superadmin' 
          ? data 
          : data.filter(c => c.department === user.department);
        checkAndEscalateSLA(deptData);
      }
    };
    init();
  }, []);

  const checkAndEscalateSLA = async (concerns: Concern[]) => {
    const now = new Date();
    for (const concern of concerns) {
      if (concern.status === 'Resolved' || concern.status === 'Escalated') continue;

      const daysOpen = differenceInDays(now, new Date(concern.submitted_at));

      // Rule 1: Submitted or Routed for more than 2 days
      if (['Submitted', 'Routed'].includes(concern.status) && daysOpen >= 2) {
        await updateConcernStatus(
          concern.id,
          'Escalated',
          'System',
          `SLA breach — concern was ${concern.status} for ${daysOpen} days without action`
        );
      }

      // Rule 2: Read but not Screened for more than 5 days
      if (concern.status === 'Read' && daysOpen >= 5) {
        await updateConcernStatus(
          concern.id,
          'Escalated',
          'System',
          `SLA breach — concern was Read for ${daysOpen} days without screening`
        );
      }
    }
  };

  // Close filter panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        const toggleBtn = document.getElementById('filter-toggle-btn');
        if (toggleBtn && !toggleBtn.contains(event.target as Node)) {
          setIsFilterPanelOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter concerns by department if user is a standard admin
  const deptConcerns = user.role === 'superadmin' 
    ? concerns 
    : concerns.filter(c => c.department === user.department);

  // Filtered Concerns (for display)
  const filteredConcerns = deptConcerns
    .filter(c => searchTerm === '' || c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.concern_number.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(c => selectedCategory === 'All' || c.category === selectedCategory)
    .filter(c => activeStatus === 'All' || c.status === activeStatus);

  // Metrics (using deptConcerns so metrics only reflect this admin's department or all departments for superadmin)
  const totalConcerns = deptConcerns.length;
  const resolved = deptConcerns.filter(c => c.status === 'Resolved').length;
  const escalated = deptConcerns.filter(c => c.status === 'Escalated').length;
  
  // Using deptConcerns for average response time calculation
  const resolvedConcerns = deptConcerns.filter(c => c.status === 'Resolved');
  const avgDays = resolvedConcerns.length > 0
    ? (resolvedConcerns.reduce((sum, c) =>
        sum + differenceInDays(new Date(c.updated_at), new Date(c.submitted_at)), 0
      ) / resolvedConcerns.length).toFixed(1)
    : '0';

  const escalationRate = totalConcerns > 0 ? ((escalated / totalConcerns) * 100).toFixed(1) + '%' : '0%';
  const resolutionRate = totalConcerns > 0 ? Math.round((resolved / totalConcerns) * 100) + '%' : '0%';

  // SLA Warnings — using deptConcerns so only this department's breached items are counted
  const breachedCount = deptConcerns.filter(c => getSLAStatus(c) === 'critical' && c.status !== 'Resolved').length;

  // Chart Data — using deptConcerns so counts reflect only this department
  const statusCounts = ['Resolved','Screened','Routed','Escalated','Submitted']
    .map(status => ({
      label: status,
      count: deptConcerns.filter(c => c.status === status).length,
      color: ({
        Resolved: 'bg-green-500',
        Screened: 'bg-amber-500',
        Routed: 'bg-blue-500',
        Escalated: 'bg-red-500',
        Submitted: 'bg-gray-500'
      } as Record<string, string>)[status]
    }));
  const maxCount = Math.max(...statusCounts.map(s => s.count), 1);

  // Category counts — using deptConcerns so percentages reflect only this department
  const categoryCounts = {
    Academic: deptConcerns.filter(c => c.category === 'Academic').length,
    Welfare: deptConcerns.filter(c => c.category === 'Welfare').length,
    Financial: deptConcerns.filter(c => c.category === 'Financial').length,
  };
  const totalCat = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const categoryPct = {
    Academic: totalCat > 0 ? Math.round(categoryCounts.Academic / totalCat * 100) : 0,
    Welfare: totalCat > 0 ? Math.round(categoryCounts.Welfare / totalCat * 100) : 0,
    Financial: totalCat > 0 ? Math.round(categoryCounts.Financial / totalCat * 100) : 0,
  };

  // Export CSV
  const exportCSV = () => {
    setExportLoading(true);
    const csvData = filteredConcerns.map(c => ({
      'Concern ID': c.concern_number,
      'Title': c.title,
      'Category': c.category,
      'Department': c.department,
      'Status': c.status,
      'Student Name': c.is_anonymous ? 'Anonymous' : c.student_name,
      'Student Number': c.student_number,
      'Program': c.program,
      'Submitted At': format(new Date(c.submitted_at), 'MMM dd, yyyy h:mm a'),
      'Days Open': getDaysOpen(c.submitted_at),
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ConcernTrack_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
  };

  // Export PDF
  const exportPDF = () => {
    setExportLoading(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ConcernTrack Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy h:mm a')}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Department: ${user.role === 'superadmin' ? 'All Departments' : user.department}`, pageWidth / 2, 34, { align: 'center' });

    // Metrics summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Concerns: ${totalConcerns}`, 14, 50);
    doc.text(`Resolved: ${resolved} (${resolutionRate})`, 14, 57);
    doc.text(`Escalated: ${escalated} (${escalationRate})`, 14, 64);
    doc.text(`Avg Response Time: ${avgDays} days`, 14, 71);

    // Table header
    let y = 85;
    doc.setFillColor(241, 245, 249); // Slate 100 for light mode header
    doc.rect(14, y - 6, pageWidth - 28, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('ID', 16, y);
    doc.text('TITLE', 45, y);
    doc.text('CATEGORY', 115, y);
    doc.text('STATUS', 145, y);
    doc.text('DAYS OPEN', 175, y);
    
    // Table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    filteredConcerns.forEach((c) => {
      y += 8;
      if (y > 275) { 
        doc.addPage(); 
        y = 30;
        // Re-draw header on new page
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y - 6, pageWidth - 28, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('ID', 16, y);
        doc.text('TITLE', 45, y);
        doc.text('CATEGORY', 115, y);
        doc.text('STATUS', 145, y);
        doc.text('DAYS OPEN', 175, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        y += 8;
      }
      
      doc.text(c.concern_number, 16, y);
      
      // Truncate title if too long to prevent overlap
      let title = c.title;
      if (title.length > 45) title = title.substring(0, 42) + '...';
      doc.text(title, 45, y);
      
      doc.text(c.category, 115, y);
      doc.text(c.status, 145, y);
      doc.text(String(getDaysOpen(c.submitted_at)), 175, y);
      
      // Subtle line between rows
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + 2, pageWidth - 14, y + 2);
    });

    doc.save(`ConcernTrack_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportLoading(false);
  };

  const statuses = ["All", "Submitted", "Routed", "Read", "Screened", "Escalated", "Resolved"];

  return (
    <div className="w-full">
      {/* SLA Alert Banner */}
      {breachedCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm font-bold">
            ⚠ {breachedCount} concern(s) in your department need attention — SLA has been breached. Check escalated items below.
          </p>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admin dashboard</h2>
          <p className="text-slate-500 mt-1 font-medium tracking-wide">
            AY 2025–2026 · Semester 2 · {user.role === 'superadmin' ? 'All Departments' : user.department}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportCSV}
            disabled={exportLoading}
            className="px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 font-medium transition-all flex items-center text-sm disabled:opacity-50 shadow-sm"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export CSV'}
          </button>
          <button 
            onClick={exportPDF}
            disabled={exportLoading}
            className="px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 font-medium transition-all flex items-center text-sm disabled:opacity-50 shadow-sm"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export PDF'}
          </button>
          <button 
            onClick={() => fetchConcerns()}
            className="px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 font-medium transition-all flex items-center text-sm shadow-sm"
          >
            <ArrowPathIcon className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            id="filter-toggle-btn"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-4 py-2 border ${isFilterPanelOpen ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'} rounded-lg font-medium transition-all flex items-center text-sm shadow-sm`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Slide-down Filter Panel */}
      {isFilterPanelOpen && (
        <div 
          ref={filterPanelRef}
          className="mb-8 p-6 bg-white border border-slate-200 rounded-xl shadow-xl animate-in slide-in-from-top-4 duration-200"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Filter by Status</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      activeStatus === status 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Category</label>
                <div className="relative">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option>All</option>
                    <option>Academic</option>
                    <option>Financial</option>
                    <option>Welfare</option>
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <button 
                onClick={() => { setActiveStatus('All'); setSelectedCategory('All'); setIsFilterPanelOpen(false); }}
                className="px-6 py-2 border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-sm transition-colors shadow-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Total Concerns</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">{totalConcerns}</p>
          <p className="text-[10px] text-indigo-600 font-bold tracking-tight">System lifetime</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Avg Response</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">{avgDays} days</p>
          <p className="text-[10px] text-green-600 font-bold tracking-tight">Submission to Resolution</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Escalation Rate</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">{escalationRate}</p>
          <p className="text-[10px] text-red-600 font-bold tracking-tight">{escalated} flagged items</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Resolution Rate</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">{resolutionRate}</p>
          <p className="text-[10px] text-slate-500 font-bold tracking-tight">{resolved} / {totalConcerns} closed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8 items-stretch">
        {/* Sidebar Charts */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Concerns by status */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex-1 flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 opacity-90">Concerns by status</h3>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {statusCounts.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1.5 font-bold uppercase tracking-wider">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="text-slate-900">{s.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${s.color}`} style={{ width: `${(s.count / Math.max(maxCount, 1) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category split */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex-1 flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 opacity-90">Category split</h3>
            <div className="flex items-center gap-8 flex-1">
              <div className="flex-1 space-y-3">
                <div className="flex items-center text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-3"></span>
                  <span className="text-slate-500 flex-1">Academic</span>
                  <span className="text-slate-900">{categoryPct.Academic}%</span>
                </div>
                <div className="flex items-center text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-teal-500 mr-3"></span>
                  <span className="text-slate-500 flex-1">Welfare</span>
                  <span className="text-slate-900">{categoryPct.Welfare}%</span>
                </div>
                <div className="flex items-center text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-3"></span>
                  <span className="text-slate-500 flex-1">Financial</span>
                  <span className="text-slate-900">{categoryPct.Financial}%</span>
                </div>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-8 border-slate-50 shadow-sm">
                <div className="text-center">
                  <p className="text-lg font-black text-slate-900 leading-none">{totalConcerns}</p>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Total</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Concerns Table & Search */}
        <div className="xl:col-span-8 flex flex-col">
          {/* Search Bar - Integrated in the column */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Search concern number or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Loading concerns...</p>
              </div>
            ) : filteredConcerns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                <ClipboardDocumentIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-bold opacity-50">No matching concerns</p>
                <p className="text-xs opacity-40 mt-1 uppercase tracking-widest font-black">Adjust your filters</p>
              </div>
            ) : (
          <div>
            {/* Mobile View: Card List */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredConcerns.map((c) => {
                const slaStatus = getSLAStatus(c);
                const daysOpen = getDaysOpen(c.submitted_at);
                return (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedConcern(c)}
                    className="p-4 active:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-indigo-600 tracking-widest">{c.concern_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        c.status === 'Escalated' ? 'bg-red-100 text-red-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <h4 className="text-slate-900 font-bold text-sm mb-1 line-clamp-1">{c.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      <span>{c.category}</span>
                      <span>•</span>
                      <span className={getSLAColor(c)}>{slaStatus === 'critical' ? 'SLA BREACH' : `${daysOpen} DAYS`}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center w-24">ID</th>
                    <th className="px-6 py-4 font-semibold">Title</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Days Open</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConcerns.map((c) => {
                    const slaColor = getSLAColor(c);
                    const daysOpen = getDaysOpen(c.submitted_at);
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => setSelectedConcern(c)}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-100"
                      >
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black text-indigo-600 tracking-tighter">{c.concern_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">{c.title}</p>
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">
                            {c.is_anonymous ? 'Anonymous' : c.student_name}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {c.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${
                            c.status === 'Resolved' ? 'text-green-600' :
                            c.status === 'Escalated' ? 'text-red-600 animate-pulse' :
                            'text-indigo-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'Resolved' ? 'bg-green-600' :
                              c.status === 'Escalated' ? 'bg-red-600' :
                              'bg-indigo-600'
                            }`}></span>
                            {c.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-xs font-black tracking-widest ${slaColor}`}>
                          {daysOpen} DAYS
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>

  <ConcernDetailDrawer 
    isOpen={!!selectedConcern} 
    concern={selectedConcern}
    currentUser={user}
    onClose={() => {
      setSelectedConcern(null);
      fetchConcerns(); // Refresh list after close in case status updated
    }} 
  />
</div>
);
}
