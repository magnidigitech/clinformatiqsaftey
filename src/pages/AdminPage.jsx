import React, { useEffect, useState } from 'react';
import { Users, FileText, Activity, CheckCircle, Clock, Lock, Unlock, RefreshCcw, Eye } from 'lucide-react';
import { getAnalytics } from '../services/adminService';
import api from '../services/api';
import { Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#64748b'];

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, casesRes] = await Promise.all([
          getAnalytics(),
          api.get('/cases')
        ]);
        setData(analyticsRes);
        if (casesRes.data && casesRes.data.data) {
          setCases(casesRes.data.data);
        }
        setLoading(false);
        setLoadingCases(false);
      } catch (err) {
        setError('Failed to load admin data.');
        setLoading(false);
        setLoadingCases(false);
      }
    };
    fetchData();
  }, []);

  const handleUnlock = async (caseId) => {
    try {
      await api.post(`/cases/${caseId}/unlock`);
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, locked_by: null, lock_time: null } : c));
    } catch (err) {
      alert('Failed to unlock case');
    }
  };

  const handleReopen = async (caseId) => {
    try {
      await api.post(`/cases/${caseId}/reopen`);
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, workflow_state: 'DRAFT' } : c));
      const analyticsRes = await getAnalytics();
      setData(analyticsRes);
    } catch (err) {
      alert('Failed to reopen case');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-gray-50">
        <div className="animate-spin text-brand-primary">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-gray-50">
        <div className="bg-red-50 text-red-600 p-4 rounded-sm shadow-sm border border-red-100">
          {error}
        </div>
      </div>
    );
  }

  // Format user data for the bar chart
  const userChartData = data.users
    .map(u => ({
      name: u.username,
      total: u.total_cases,
      active: u.active_cases,
      closed: u.closed_cases
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // top 10 users

  return (
    <div className="flex-1 p-8 bg-white overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Analytics, overview of platform usage, and case management.</p>
        </div>

        <Tabs.Root defaultValue="analytics" className="w-full">
          <Tabs.List className="flex border-b border-slate-200 mb-6">
            <Tabs.Trigger
              value="analytics"
              className="px-6 py-3 font-medium text-sm text-slate-600 border-b-2 border-transparent data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-2"><Activity size={18} /> Analytics</div>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="cases"
              className="px-6 py-3 font-medium text-sm text-slate-600 border-b-2 border-transparent data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-2"><FileText size={18} /> All Cases</div>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="analytics" className="space-y-8 focus:outline-none">
            {/* Top summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-sm shadow-sm p-6 border border-slate-200 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-sm">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Users size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Accounts</p>
                  <p className="text-3xl font-bold text-slate-800">{data.totalUsers}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-sm shadow-sm p-6 border border-slate-200 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-sm">
                <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Cases</p>
                  <p className="text-3xl font-bold text-slate-800">{data.totalCases}</p>
                </div>
              </div>

              <div className="bg-white rounded-sm shadow-sm p-6 border border-slate-200 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-sm">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                  <Activity size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Cases</p>
                  <p className="text-3xl font-bold text-slate-800">{data.activeCases}</p>
                </div>
              </div>

              <div className="bg-white rounded-sm shadow-sm p-6 border border-slate-200 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-sm">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Closed Cases</p>
                  <p className="text-3xl font-bold text-slate-800">{data.closedCases}</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution Pie Chart */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Activity size={20} className="text-slate-500" /> Case Status Distribution
                </h2>
                <div className="h-64 w-full">
                  {data.caseStatusDistribution && data.caseStatusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.caseStatusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {data.caseStatusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [value, 'Cases']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 italic">
                      No case data available
                    </div>
                  )}
                </div>
              </div>

              {/* User Case Load Bar Chart */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Users size={20} className="text-slate-500" /> Top Users by Case Load
                </h2>
                <div className="h-64 w-full">
                  {userChartData && userChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{fill: '#F8FAFC'}} />
                        <Legend />
                        <Bar dataKey="active" name="Active Cases" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="closed" name="Closed Cases" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 italic">
                      No user data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Analytics Table */}
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users size={20} className="text-slate-500" /> User Analytics Directory
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4 text-center">Total Cases</th>
                      <th className="px-6 py-4 text-center">Active Cases</th>
                      <th className="px-6 py-4 text-center">Closed Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.users.map((user) => (
                      <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{user.full_name}</div>
                          <div className="text-slate-500 text-xs">@{user.username}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold">
                              {user.total_cases}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-bold border border-amber-100">
                              {user.active_cases}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">
                              {user.closed_cases}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.users.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Clock size={32} className="text-slate-300" />
                            <p>No active users found.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="cases" className="space-y-6 focus:outline-none">
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={20} className="text-slate-500" /> Cases Directory
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Case Number</th>
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Locked By</th>
                      <th className="px-6 py-4">Assigned By</th>
                      <th className="px-6 py-4">Assignee</th>
                      <th className="px-6 py-4">Closed By</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.length > 0 ? cases.map((c) => (
                      <tr key={c.case_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-brand-primary">
                          <Link to={`/cases/${c.case_id}`} className="hover:underline">{c.case_number}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.patient?.patient_code || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.workflow_state === 'CLOSED' ? 'bg-slate-100 text-slate-800' :
                            c.workflow_state === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                            c.workflow_state === 'PENDING_QC' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {c.workflow_state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.locked_by ? (
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <Lock size={14} /> {c.locked_by}
                            </span>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.assignee ? (
                            c.workflow_logs?.find(l => l.comments?.toLowerCase().includes('rout') || l.to_state === 'PENDING_QC')?.user?.full_name || 
                            (c.student_id === c.assignee.user_id ? 'Self' : 'System')
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.assignee?.full_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.workflow_state === 'CLOSED' ? 
                            (c.workflow_logs?.find(l => l.to_state === 'CLOSED')?.user?.full_name || 'System') 
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Link to={`/cases/${c.case_id}`} className="inline-flex items-center justify-center p-2 text-brand-primary hover:bg-blue-50 rounded-md transition-colors" title="View/Edit">
                            <Eye size={18} />
                          </Link>
                          {c.locked_by && (
                            <button onClick={() => handleUnlock(c.case_id)} className="inline-flex items-center justify-center p-2 text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Unlock">
                              <Unlock size={18} />
                            </button>
                          )}
                          {c.workflow_state === 'CLOSED' && (
                            <button onClick={() => handleReopen(c.case_id)} className="inline-flex items-center justify-center p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Reopen Case">
                              <RefreshCcw size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                          <Clock size={32} className="text-slate-300 mx-auto mb-2" />
                          <p>No cases found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

      </div>
    </div>
  );
}