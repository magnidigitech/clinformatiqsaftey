import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useCases } from '../hooks/useCases';
import { cn } from '../lib/utils';
import useAuth from '../hooks/useAuth';
import useUIStore from '../store/uiStore';
import api from '../services/api';
import { Search, ChevronDown, Check, Lock, Unlock, FileText, ChevronRight, Menu, Printer, Flag, ChevronLeft, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getDueDate, getDueStatus, formatDueDate, getDueBadgeClasses, getDueLabel } from '../utils/dueDateUtils';

export default function WorkflowPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter') || 'action-items';
  
  const { cases, loading, fetchCases } = useCases();
  const { user } = useAuth();
  const addNotification = useUIStore(state => state.addNotification);
  
  const [contextMenu, setContextMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(true);
  const [selectedActionItem, setSelectedActionItem] = useState(null);
  const [acceptedCases, setAcceptedCases] = useState(() => {
    const saved = localStorage.getItem('acceptedCases');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [searchFilter, setSearchFilter] = useState('Case Number');
  const [searchValue, setSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState({ filter: 'Case Number', value: '' });

  const [showRoutePrompt, setShowRoutePrompt] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [routeComments, setRouteComments] = useState('');
  const [orgUsers, setOrgUsers] = useState([]);
  const [caseToRoute, setCaseToRoute] = useState(null);

  const filterTitle = filterParam.replace('-', ' ').toUpperCase();

  const handleContextMenu = (e, caseItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      case: caseItem
    });
  };

  const handleAcceptCase = async () => {
    if (contextMenu?.case) {
      const caseId = contextMenu.case.case_id || contextMenu.case.id;
      try {
        await api.put(`/cases/${caseId}`, { assigned_to: user?.username });
        
        addNotification({ type: 'success', message: `Case ${contextMenu.case.case_number} accepted successfully.` });
        setContextMenu(null);
        // Force refresh cases
        window.location.reload();
      } catch (err) {
        console.error("Failed to accept case:", err);
        addNotification({ type: 'error', message: "Failed to accept case." });
      }
    }
  };

  const handleCloseActionItem = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const getDaysOpen = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const diffTime = Math.abs(new Date() - d);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWorkflowBadge = (state) => {
    if (state === 'PENDING_QC' || state === 'QC') {
      return {
        label: 'QC Pending',
        className: 'bg-purple-100 text-purple-800 border border-purple-200'
      };
    }
    if (state === 'QC_COMPLETED') {
      return {
        label: 'QC Completed',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      };
    }
    if (state === 'CLOSED') {
      return {
        label: 'Closed',
        className: 'bg-slate-100 text-slate-700 border border-slate-200'
      };
    }
    return {
      label: 'Data Entry',
      className: 'bg-blue-100 text-blue-800 border border-blue-200'
    };
  };

  const filteredCases = cases.filter(c => {
    let matchesCategory = true;
    const currentUserId = Number(user?.user_id);
    const isAssigned = Number(c.assigned_to) === currentUserId || 
                       Number(c.assignee?.user_id) === currentUserId ||
                       (user?.username && c.assignee?.username?.toLowerCase() === user.username.toLowerCase());
    const isStudent = Number(c.student_id) === currentUserId || 
                      Number(c.student?.user_id) === currentUserId ||
                      (user?.username && c.student?.username?.toLowerCase() === user.username.toLowerCase());

    if (user?.role === 'ADMIN') {
      matchesCategory = true;
    } else if (filterParam === 'new') {
      matchesCategory = c.workflow_state === 'DRAFT' && (isStudent || isAssigned);
    } else if (filterParam === 'open' || filterParam === 'action-items') {
      matchesCategory = isAssigned || isStudent; 
    }
    
    if (!matchesCategory) return false;

    if (!appliedSearch.value || appliedSearch.value.trim() === '') return true;

    const query = appliedSearch.value.toLowerCase().trim();
    
    if (appliedSearch.filter === 'Case Number') {
      return c.case_number?.toLowerCase().includes(query);
    } else if (appliedSearch.filter === 'Workflow State') {
      return c.workflow_state?.toLowerCase().includes(query) || (query.includes('qc') && (c.workflow_state === 'PENDING_QC' || c.workflow_state === 'QC'));
    } else if (appliedSearch.filter === 'Product') {
      return c.products?.some(p => p.drug_name?.toLowerCase().includes(query));
    } else if (appliedSearch.filter === 'Event PT') {
      return c.events?.some(e => e.entity_title?.toLowerCase().includes(query) || e.entity_code?.toLowerCase().includes(query));
    }
    
    return true;
  });

  const isActionItems = filterParam === 'action-items';

  const inp = "h-9 pl-3 pr-4 text-sm rounded-sm border-slate-200 focus:ring-brand-primary/50 shadow-sm transition-all w-full bg-white";
  const sel = "h-9 pl-3 pr-8 text-sm rounded-sm border-slate-200 focus:ring-brand-primary/50 shadow-sm transition-all w-full bg-white text-slate-700";

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans">
      <div className="px-8 pt-6 flex justify-between items-center">
        <div className="text-sm font-medium text-slate-500">
          Worklist <span className="mx-2 text-slate-300">/</span> <span className="text-brand-dark font-semibold">{filterTitle === 'NEW' ? 'New' : filterTitle}</span>
        </div>
      </div>

      <div className="px-8 py-4 mb-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">{filterTitle}</h1>
      </div>

      <div className="px-8 pb-16 space-y-6 max-w-[1400px]">
        {/* Search Filter Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover-card-effect">
          <div 
            className="bg-gradient-to-r from-emerald-50 to-teal-50/50 px-6 py-4 flex justify-between items-center border-b border-slate-100 cursor-pointer"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <span className="text-slate-800 font-bold flex items-center gap-2 text-sm">
              <Search size={18} className="text-brand-primary" />
              Search Filters
            </span>
            <button className="text-slate-400 hover:text-brand-primary transition-colors">
              {searchOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          
          {searchOpen && (
            <div className="p-6 bg-white animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Filter</label>
                  <select 
                    className={sel}
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                  >
                    <option>Case Number</option>
                    <option>Workflow State</option>
                    <option>Product</option>
                    <option>Event PT</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Value</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className={inp} 
                      placeholder="Search value..." 
                      value={searchValue}
                      onChange={e => setSearchValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && setAppliedSearch({ filter: searchFilter, value: searchValue })}
                    />
                    <Button 
                      className="rounded-sm shadow-sm hover:shadow-sm transition-all font-semibold whitespace-nowrap bg-brand-primary hover:bg-brand-primary/90 text-white"
                      onClick={() => setAppliedSearch({ filter: searchFilter, value: searchValue })}
                    >
                      Search
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Group Membership</label>
                  <select className={sel}>
                    <option>All</option>
                    <option>Data Entry</option>
                    <option>Quality Control</option>
                    <option>Medical Review</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Table Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-6 py-3.5 flex justify-between items-center shadow-inner">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-base flex items-center gap-2">
                <FileText size={18} className="text-emerald-100" />
                Results <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm ml-1">{filteredCases.length}</span>
              </span>
            </div>
            <button 
              onClick={() => fetchCases()} 
              className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded transition-all border border-white/20 cursor-pointer"
              title="Refresh case list"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-center w-14">Status</th>
                  <th className="px-4 py-3 min-w-[120px]">Dates</th>
                  <th className="px-4 py-3 min-w-[90px]">Days Open</th>
                  <th className="px-4 py-3 min-w-[130px]">Due Date</th>
                  <th className="px-4 py-3 min-w-[160px]">Case Details</th>
                  <th className="px-4 py-3 min-w-[140px]">Product</th>
                  <th className="px-4 py-3 min-w-[180px]">Event (PT)</th>
                  <th className="px-4 py-3 min-w-[130px]">Reporter</th>
                  <th className="px-4 py-3 min-w-[150px]">Assignment</th>
                  <th className="px-4 py-3 text-center w-14">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Check size={36} className="text-slate-300" />
                        <span className="text-sm font-medium text-slate-500">No matching cases found</span>
                        <span className="text-xs text-slate-400">Try adjusting your filter or search criteria</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => {
                    const product = c.products?.[0];
                    const event = c.events?.[0];
                    const reporter = c.reporters?.[0];
                    const badge = getWorkflowBadge(c.workflow_state);
                    
                    return (
                    <tr 
                      key={c.id || c.case_number} 
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onContextMenu={(e) => handleContextMenu(e, c)}
                      onClick={() => navigate(`/cases/${c.case_id || c.id}`)}
                    >
                      {/* Status / Lock */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300 cursor-pointer" 
                          />
                          {c.locked_by ? (
                            <Lock size={15} className="text-amber-500 shrink-0" title={`Locked by ${c.locked_by}`} />
                          ) : (
                            <Unlock size={15} className="text-slate-300 shrink-0" title="Unlocked" />
                          )}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-800 text-[12px]">{formatDate(c.receipt_date) || '—'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span className="text-slate-400 font-medium">Aware:</span> {formatDate(c.aware_date) || '—'}
                        </div>
                      </td>

                      {/* Days Open */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {getDaysOpen(c.receipt_date) || '0'} {getDaysOpen(c.receipt_date) === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3.5 align-middle">
                        {(() => {
                          const { dueDate, phase } = getDueDate(c);
                          const status = getDueStatus(dueDate);
                          if (!dueDate) return <span className="text-slate-400 text-xs">—</span>;
                          return (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 border rounded-md text-xs font-semibold whitespace-nowrap ${getDueBadgeClasses(status)}`}>
                                {formatDueDate(dueDate)}
                              </span>
                              <span className={`text-[10px] font-bold ${status === 'overdue' ? 'text-red-600 animate-pulse' : status === 'due-today' ? 'text-orange-600' : 'text-emerald-600'}`}>
                                {getDueLabel(status)} ({phase === 'QC' ? 'QC Pending' : phase})
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Case Details */}
                      <td className="px-4 py-3.5 align-middle">
                        <div>
                          <Link 
                            to={`/cases/${c.case_id || c.id}`} 
                            className="text-emerald-700 hover:text-emerald-900 font-bold text-[13px] tracking-tight hover:underline inline-block" 
                            onClick={e => e.stopPropagation()}
                          >
                            {c.case_number}
                          </Link>
                        </div>
                        <div className="mt-1">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs",
                            badge.className
                          )}>
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold text-slate-800 text-[12px] truncate max-w-[150px]" title={product?.drug_name || ''}>
                          {product?.drug_name || <span className="text-slate-400 font-normal italic">(No Product)</span>}
                        </div>
                        {product?.indication && (
                          <div className="text-[11px] text-slate-500 uppercase mt-0.5 truncate max-w-[150px] font-medium" title={product.indication}>
                            {product.indication}
                          </div>
                        )}
                      </td>

                      {/* Event */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-800 text-[12px] line-clamp-2 max-w-[180px]" title={event?.entity_title || event?.entity_code || ''}>
                          {event?.entity_title || event?.entity_code || <span className="text-slate-400 font-normal italic">(No Event)</span>}
                        </div>
                        {event?.narrative && event.narrative !== event.entity_title && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-[180px]" title={event.narrative}>
                            {event.narrative}
                          </div>
                        )}
                      </td>

                      {/* Reporter */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-700 text-[12px]">
                          {reporter?.reporter_type || <span className="text-slate-400 font-normal italic">(No Reporter)</span>}
                        </div>
                        {reporter?.country && (
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {reporter.country}
                          </div>
                        )}
                      </td>

                      {/* Assignment */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold text-slate-800 text-[12px] truncate max-w-[150px]" title={c.assignee ? c.assignee.full_name : ''}>
                          {c.assignee ? c.assignee.full_name : <span className="text-slate-400 font-normal italic">(Unassigned)</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                          Creator: {c.student?.full_name || 'System'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <button 
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); handleContextMenu(e, c); }}
                          title="Actions"
                        >
                          <Menu size={16} />
                        </button>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border border-slate-200 shadow-sm rounded-sm py-2 w-56 animate-dropdown-enter"
          style={{ 
            top: Math.min(contextMenu.y, window.innerHeight - 300), 
            left: Math.min(contextMenu.x, window.innerWidth - 240) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 pb-2 mb-2 border-b border-slate-100 font-bold text-xs text-slate-400 uppercase tracking-wider">
            Case Actions
          </div>
          {contextMenu.type === 'actionItem' ? (
            <>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors" onClick={() => navigate(`/cases/${contextMenu.item.case_id}`)}>Case Summary</button>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors" onClick={handleCloseActionItem}>Close Action Item</button>
            </>
          ) : (
            <>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors" onClick={() => navigate(`/cases/${contextMenu.case.case_id || contextMenu.case.id}`)}>Open Read Only</button>
              <button className="w-full text-left px-4 py-2 text-sm font-medium text-brand-primary bg-brand-light/50 hover:bg-brand-light transition-colors" onClick={handleAcceptCase}>Accept Case</button>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors" onClick={() => { 
                setCaseToRoute(contextMenu.case.case_id || contextMenu.case.id);
                setShowRoutePrompt(true);
                api.get('/users/org').then(res => setOrgUsers(res.data.data)).catch(err => console.error(err));
                setContextMenu(null); 
              }}>Route...</button>
              {contextMenu.case.locked_by === user?.username && (
                <button className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-slate-50 transition-colors" onClick={async () => {
                  try {
                    await api.post(`/cases/${contextMenu.case.case_id || contextMenu.case.id}/unlock`);
                    fetchCases();
                    setContextMenu(null);
                    alert("Case unlocked successfully.");
                  } catch (err) {
                    console.error("Failed to unlock case:", err);
                    alert("Failed to unlock case.");
                  }
                }}>Unlock Case</button>
              )}
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors">Adjust Priority</button>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors">Adjust Assignment</button>
            </>
          )}
        </div>
      )}

      {/* Route Prompt Modal */}
      {showRoutePrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10">
          <div className="bg-[#4a8a9a] border-2 border-emerald-600 shadow-sm w-[400px]">
            <div className="flex justify-between items-center px-2 py-1 border-b border-emerald-500 bg-[#4a8a9a]">
              <span className="text-white font-bold text-[11px] tracking-wide">Route Case</span>
              <button onClick={() => setShowRoutePrompt(false)} className="bg-emerald-500 border border-white text-white rounded-[2px] w-[18px] h-[18px] flex items-center justify-center hover:bg-emerald-400 leading-none text-[12px] font-bold">✕</button>
            </div>
            <div className="bg-[#e4eff1] p-3 border-8 border-[#4a8a9a]">
              <div className="flex flex-col gap-2">
                <div className="text-[12px] text-black">Select User to Route for QC:</div>
                <select 
                  className="w-full border border-gray-400 h-6 text-xs bg-white text-black"
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                >
                  <option value="">(Select User)</option>
                  {orgUsers.map(u => (
                    <option key={u.user_id || u.id} value={u.user_id || u.username}>{u.full_name} ({u.role || u.username})</option>
                  ))}
                </select>
                <div className="text-[12px] text-black mt-2">Routing Comments:</div>
                <textarea 
                  className="w-full border border-gray-400 h-16 text-xs p-1 bg-white text-black resize-none"
                  value={routeComments}
                  onChange={(e) => setRouteComments(e.target.value)}
                ></textarea>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => {
                    if (!selectedAssignee) return alert("Please select a user to route to.");
                    api.post(`/cases/${caseToRoute}/route`, { assigned_to: selectedAssignee, comments: routeComments })
                      .then(() => {
                        setShowRoutePrompt(false);
                        addNotification({ type: 'success', message: 'Case routed successfully.' });
                        window.location.reload();
                      })
                      .catch(err => {
                        console.error(err);
                        alert("Failed to route case");
                      });
                  }} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">OK</button>
                  <button onClick={() => setShowRoutePrompt(false)} className="w-20 py-0.5 text-xs bg-white border border-gray-400 text-gray-800 hover:bg-slate-50 shadow-sm">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}