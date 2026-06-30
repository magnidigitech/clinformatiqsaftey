import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCases } from '../hooks/useCases';
import useAuth from '../hooks/useAuth';
import { 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Mail, 
  FolderOpen, 
  AlertCircle,
  Search,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { getDueDate, getDueStatus, formatDueDate, getDueBadgeClasses, getDueLabel } from '../utils/dueDateUtils';

export default function DashboardPage() {
  const { cases, loading } = useCases();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickLaunch, setQuickLaunch] = useState('');

  const assignedCases = cases?.filter(c => Number(c.assigned_to) === Number(user?.user_id)) || [];

  const [expanded, setExpanded] = useState({
    search: true,
    cases: true,
    contacts: true,
    actions: true
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleQuickLaunch = (e) => {
    e.preventDefault();
    if (quickLaunch) {
      // Find the case by its case_number (e.g., US-2024-...) or case_id
      const foundCase = cases?.find(
        c => c.case_number === quickLaunch || c.case_id.toString() === quickLaunch
      );
      
      if (foundCase) {
        navigate(`/cases/${foundCase.case_id}`);
      } else {
        alert(`Case '${quickLaunch}' not found in your assigned cases.`);
      }
    }
  };


  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans">
      {/* 3. Breadcrumb & Toolbar */}
      <div className="px-8 pt-6 flex justify-between items-center">
        <div className="text-sm font-medium text-slate-500">
          Home <span className="mx-2 text-slate-300">/</span> <span className="text-brand-dark font-semibold">Personal Status</span>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 bg-white border border-slate-200 rounded-sm shadow-sm hover:shadow hover:-translate-y-0.5 text-slate-600 hover:text-brand-primary transition-all"><Mail size={16} /></button>
          <button className="p-2 bg-white border border-slate-200 rounded-sm shadow-sm hover:shadow hover:-translate-y-0.5 text-slate-600 hover:text-brand-primary transition-all"><Printer size={16} /></button>
          <button className="p-2 bg-white border border-slate-200 rounded-sm shadow-sm hover:shadow hover:-translate-y-0.5 text-slate-600 hover:text-brand-primary transition-all"><FolderOpen size={16} /></button>
        </div>
      </div>

      {/* 4. Page Title */}
      <div className="px-8 py-4 mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Personal Status</h1>
        <p className="text-slate-500 mt-1">Manage and track your assigned cases and action items.</p>
      </div>

      {/* 5. Main Content Accordions/Cards */}
      <div className="px-8 pb-16 space-y-6 max-w-7xl">

        {/* Search Case */}
        <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden hover-card-effect">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
            <span className="text-slate-800 font-bold flex items-center gap-2">
              <Search size={18} className="text-brand-primary" />
              Search Case
            </span>
          </div>
          {expanded.search && (
            <div className="p-6 bg-white flex items-center space-x-6 animate-fade-in-up">
              <span className="text-sm font-medium text-slate-600">Case Quick Launch:</span>
              <form onSubmit={handleQuickLaunch} className="flex space-x-3 relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={quickLaunch}
                  onChange={(e) => setQuickLaunch(e.target.value)}
                  className="h-10 pl-9 pr-4 w-full text-sm rounded-sm border-slate-200 focus:ring-brand-primary/50 shadow-sm transition-all" 
                  placeholder="Enter case number..."
                />
                <Button type="submit" className="h-10 px-6 rounded-sm shadow-sm shadow-brand-primary/20 hover:shadow-sm transition-all font-semibold">Open</Button>
              </form>
            </div>
          )}
        </div>

        {/* Cases Assigned */}
        <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden hover-card-effect">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 text-white px-6 py-4 flex justify-between items-center cursor-pointer transition-colors"
            onClick={() => toggleSection('cases')}
          >
            <div className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="rounded text-brand-dark focus:ring-brand-dark bg-white/20 border-white/30 h-4 w-4" onClick={(e) => e.stopPropagation()} />
              <span className="font-bold text-lg flex items-center gap-2">
                <FileText size={20} />
                Cases Assigned <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm ml-1">{assignedCases.length}</span>
              </span>
            </div>
            <button className="bg-white/10 p-1.5 rounded-sm text-white hover:bg-white/20 transition-colors">
              {expanded.cases ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {expanded.cases && (
            <div className="overflow-x-auto animate-fade-in-up">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold flex items-center space-x-1.5">
                      <span>(Country) Case Number</span>
                      <AlertCircle size={14} className="text-amber-500" />
                    </th>
                    <th className="px-6 py-4 font-semibold">Report Type</th>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Workflow State</th>
                    <th className="px-6 py-4 font-semibold">Due Date</th>
                    <th className="px-6 py-4 font-semibold">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-primary border-t-transparent"></div>
                        <span>Loading cases...</span>
                      </div>
                    </td></tr>
                  ) : assignedCases.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <CheckCircle size={40} className="mb-3 text-slate-300" />
                        <span className="text-base font-medium text-slate-500">No cases currently assigned</span>
                        <span className="text-sm mt-1">You're all caught up!</span>
                      </div>
                    </td></tr>
                  ) : (
                    assignedCases.map((c) => (
                      <tr key={c.case_id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <Link to={`/cases/${c.case_id}`} className="text-brand-primary font-bold flex items-center group-hover:text-brand-dark transition-colors">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 mr-3"></span>
                            (US) {c.case_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{c.case_type || 'Spontaneous'}</td>
                        <td className="px-6 py-4 text-slate-600">{c.products?.[0]?.drug_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                            {c.workflow_state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {(() => {
                            const { dueDate, phase } = getDueDate(c);
                            const status = getDueStatus(dueDate);
                            if (!dueDate) return <span className="text-slate-400">—</span>;
                            return (
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-md text-xs font-semibold ${getDueBadgeClasses(status)}`}>
                                  {formatDueDate(dueDate)}
                                </span>
                                <span className={`text-[10px] font-bold ${status === 'overdue' ? 'text-red-600 animate-pulse' : status === 'due-today' ? 'text-orange-600' : 'text-green-600'}`}>
                                  {getDueLabel(status)} ({phase})
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{c.events?.[0]?.entity_title || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contact Log Entries */}
        <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden hover-card-effect">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 text-white px-6 py-4 flex justify-between items-center cursor-pointer transition-colors"
            onClick={() => toggleSection('contacts')}
          >
            <div className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="rounded text-brand-dark focus:ring-brand-dark bg-white/20 border-white/30 h-4 w-4" onClick={(e) => e.stopPropagation()} />
              <span className="font-bold text-lg flex items-center gap-2">
                <Mail size={20} />
                Contact Log Entries <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm ml-1">0</span>
              </span>
            </div>
            <button className="bg-white/10 p-1.5 rounded-sm text-white hover:bg-white/20 transition-colors">
              {expanded.contacts ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {expanded.contacts && (
            <div className="overflow-x-auto animate-fade-in-up min-h-[120px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold flex items-center space-x-1.5">
                      <span>(Country) Case Number</span>
                    </th>
                    <th className="px-6 py-4 font-semibold">Contact Date</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm font-medium">No contact log entries found.</span>
                    </div>
                  </td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Item Entries */}
        <div className="bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden hover-card-effect">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 text-white px-6 py-4 flex justify-between items-center cursor-pointer transition-colors"
            onClick={() => toggleSection('actions')}
          >
            <div className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="rounded text-brand-dark focus:ring-brand-dark bg-white/20 border-white/30 h-4 w-4" onClick={(e) => e.stopPropagation()} />
              <span className="font-bold text-lg flex items-center gap-2">
                <Clock size={20} />
                Action Item Entries <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm ml-1">0</span>
              </span>
            </div>
            <button className="bg-white/10 p-1.5 rounded-sm text-white hover:bg-white/20 transition-colors">
              {expanded.actions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {expanded.actions && (
            <div className="overflow-x-auto animate-fade-in-up min-h-[120px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold flex items-center space-x-1.5">
                      <span>(Country) Case Number</span>
                    </th>
                    <th className="px-6 py-4 font-semibold">Due On</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm font-medium">No action items found.</span>
                    </div>
                  </td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}