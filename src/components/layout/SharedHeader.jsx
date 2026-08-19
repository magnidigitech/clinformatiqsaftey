import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useCases } from '../../hooks/useCases';
import { cn } from '../../lib/utils';
import CaseToolbar from './CaseToolbar';
import ClinformatiqLogo from './ClinformatiqLogo';
import ChangePasswordModal from '../ChangePasswordModal';

import { User, Key, LogOut, Shield, ChevronDown, Laptop, Home as HomeIcon } from 'lucide-react';

export default function SharedHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { cases } = useCases();

  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Determine current case ID from URL if we are viewing a case
  const pathParts = location.pathname.split('/');
  const currentCaseId = pathParts[1] === 'cases' ? pathParts[2] : null;

  // Get up to 10 most recent cases for the dropdown
  const recentCases = cases?.slice(0, 10) || [];

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(new Date());

  const navTabs = [
    { name: 'Active Cases', path: '#' },
    { name: 'Worklist', path: '/workflow' },
    { name: 'Case Actions', path: '#' },
    { name: 'Reports', path: '#' },
    { name: 'Utilities', path: '#' },
    { name: 'Dashboards', path: '/' },
  ];

  const getActiveTab = () => {
    if (location.pathname === '/') return 'Dashboards';
    if (location.pathname === '/admin') return 'Dashboards';
    if (location.pathname.startsWith('/cases/new') || location.pathname.startsWith('/cases/open')) return 'Case Actions';
    if (location.pathname.startsWith('/cases/')) return 'Active Cases';
    if (location.pathname.startsWith('/workflow')) return 'Worklist';
    return '';
  };

  const activeTabName = getActiveTab();
  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="glass-panel border-b border-white/40 flex flex-col z-50 sticky top-0 shrink-0">
      {/* Brand Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100/50">
        <div className="flex items-center gap-3">
          <ClinformatiqLogo sizeClass="h-10" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs font-medium hidden lg:inline">
            {currentDate}
          </span>

          <Link 
            to="/" 
            className="hidden sm:flex items-center gap-1 text-slate-600 hover:text-teal-800 hover:bg-teal-50/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <HomeIcon className="h-3.5 w-3.5" />
            Home
          </Link>

          {/* Profile Dropdown with all Actions */}
          <div className="relative group">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100/80 border border-slate-200/80 transition-all bg-white/70 shadow-2xs"
            >
              <div className="h-7 w-7 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {userInitial}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{user?.full_name || user?.username}</p>
                <p className="text-[10px] font-semibold text-[#0F766E]">{user?.role === 'ADMIN' ? 'Administrator' : user?.role || 'User'}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-transform" />
            </button>

            {/* Profile Dropdown Menu */}
            <div className="absolute right-0 top-[110%] w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name || 'System User'}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">@{user?.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@clinformatiq.com'}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    <Shield className="h-3 w-3 text-[#0F766E]" />
                    {user?.role === 'ADMIN' ? 'Global Administrator' : user?.role || 'Student'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setPasswordModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors text-left"
                >
                  <Key className="h-4 w-4 text-[#0F766E]" />
                  <span>Change Password</span>
                </button>

                {user?.role === 'ADMIN' && (
                  <Link
                    to="/users"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
                  >
                    <Laptop className="h-4 w-4 text-[#0F766E]" />
                    <span>User & Session Control</span>
                  </Link>
                )}
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-transparent">
        <div className="flex items-center gap-1">
          {navTabs.map((tab, i) => {
            const hasDropdown = tab.name === 'Case Actions' || tab.name === 'Utilities' || tab.name === 'Active Cases' || tab.name === 'Worklist' || tab.name === 'Dashboards' || tab.name === 'Reports';
            const isActive = tab.name === activeTabName;
            const cls = cn(
              "block px-4 py-2 text-xs font-bold rounded-sm transition-all duration-200 cursor-pointer select-none",
              isActive
                ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/30"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            );

            const dropdownContainerClass = "absolute hidden group-hover:block top-[100%] left-0 w-56 bg-white shadow-sm rounded-sm z-50 py-2 border border-slate-200";
            const dropdownItemClass = "flex justify-between items-center px-3 py-1.5 text-xs text-slate-700 hover:bg-brand-light hover:text-brand-dark mx-1 rounded-md transition-colors";
            const dropdownItemActive = "bg-brand-light text-brand-dark font-medium";

            return (
              <div key={i} className="relative group">
                {hasDropdown ? (
                  <span className={cls}>{tab.name}</span>
                ) : (
                  <Link to={tab.path} className={cls}>{tab.name}</Link>
                )}
                
                {tab.name === 'Active Cases' && (
                  <div className={dropdownContainerClass}>
                    {recentCases.map(c => (
                      <Link 
                        key={c.case_id || c.case_number} 
                        to={`/cases/${c.case_id}`} 
                        className={cn(dropdownItemClass, (String(c.case_id) === currentCaseId || c.case_number === currentCaseId) && dropdownItemActive)}
                      >
                        <span>{c.case_number || `Case ${c.case_id}`}</span>
                      </Link>
                    ))}
                    {recentCases.length === 0 && (
                      <div className="px-4 py-2 text-xs text-slate-400 italic">No active cases</div>
                    )}
                    
                    <div className="relative group/last-accessed mt-1 border-t border-slate-100/50 pt-1">
                      <div className={dropdownItemClass + " cursor-pointer"}>
                        <span>Last Accessed Cases</span>
                        <span className="text-brand-primary text-[10px]">▶</span>
                      </div>
                      <div className="absolute hidden group-hover/last-accessed:block top-0 left-[100%] w-56 bg-white border border-slate-200 shadow-sm rounded-sm z-50 py-2 ml-1">
                        <div className="px-4 py-2 text-xs text-slate-400 italic">No recent cases</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {tab.name === 'Worklist' && (
                  <div className={cn(dropdownContainerClass, "w-52")}>
                    <Link to="/workflow?filter=new" className={dropdownItemClass}><span>New</span></Link>
                    <Link to="/workflow?filter=open" className={dropdownItemClass}><span>Open</span></Link>
                    <Link to="/workflow?filter=action-items" className={dropdownItemClass}><span>Action Items</span></Link>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Contacts</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Reports</span></div>
                  </div>
                )}
                
                {tab.name === 'Case Actions' && (
                  <div className={cn(dropdownContainerClass, "w-64")}>
                    <Link to="/cases/open" className={dropdownItemClass}><span>Open</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+O)</span></Link>
                    <Link to="/cases/new" className={cn(dropdownItemClass, "bg-slate-50 font-medium")}><span>New</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+N)</span></Link>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>New Case from Image</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+G)</span></div>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('close_case'))} className={cn(dropdownItemClass, "w-[calc(100%-8px)]")}><span>Close</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+C)</span></button>
                    <div className="border-t border-slate-100/50 my-1 mx-2" />
                    <button onClick={() => window.dispatchEvent(new CustomEvent('save_case'))} className={cn(dropdownItemClass, "w-[calc(100%-8px)] bg-slate-50 font-medium")}><span>Save</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+S)</span></button>
                    <Link to="#" className={dropdownItemClass}><span>Copy</span></Link>
                    <div className="border-t border-slate-100/50 my-1 mx-2" />
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Medical Review is disabled"><span>Medical Review</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+M)</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Coding Review is disabled"><span>Coding Review</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+Q)</span></div>
                    <div className="relative group/print">
                      <div className={dropdownItemClass + " cursor-pointer"}>
                        <span>Print</span>
                        <span className="text-slate-400 text-[10px]">▶</span>
                      </div>
                      <div className="absolute hidden group-hover/print:block top-0 left-[100%] w-56 bg-white border border-slate-200 shadow-sm rounded-sm z-50 py-2 ml-1">
                        <button onClick={() => {
                          if (!currentCaseId) alert("Please open a case first to print its form.");
                          else window.dispatchEvent(new CustomEvent('print_case'));
                        }} className={cn(dropdownItemClass, "w-[calc(100%-8px)] bg-slate-50")}>
                          <span>Case Form</span><span className="text-slate-400 text-[10px]">(Ctrl+Alt+P)</span>
                        </button>
                        <button onClick={() => {
                          if (!currentCaseId) alert("Please open a case first to print its medical summary.");
                          else window.dispatchEvent(new CustomEvent('print_medical_summary'));
                        }} className={cn(dropdownItemClass, "w-[calc(100%-8px)]")}>
                          <span>Medical Summary</span>
                        </button>
                      </div>
                    </div>
                    <Link to="#" className={dropdownItemClass}><span>Delete</span></Link>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('view_case_revisions'))} className={cn(dropdownItemClass, "w-[calc(100%-8px)]")}><span>Case Revisions</span></button>
                  </div>
                )}

                {tab.name === 'Reports' && (
                  <div className={cn(dropdownContainerClass, "w-52")}>
                    <div className="relative">
                      <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available">
                        <span>Compliance</span>
                        <span className="text-brand-primary text-[10px]">▶</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available">
                        <span>Aggregate Reports</span>
                        <span className="text-brand-primary text-[10px]">▶</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available">
                        <span>Periodic Reports</span>
                        <span className="text-brand-primary text-[10px]">▶</span>
                      </div>
                    </div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Bulk Reporting</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>ICSR Pending</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Processed ICSR</span></div>
                  </div>
                )}
                
                {tab.name === 'Utilities' && (
                  <div className={cn(dropdownContainerClass, "w-60")}>
                    <button onClick={() => setPasswordModalOpen(true)} className={cn(dropdownItemClass, "w-[calc(100%-8px)] text-left")}><span>Change Password</span></button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open_icd_browser'))} className={cn(dropdownItemClass, "w-[calc(100%-8px)] text-left")}><span>MedDRA Browser</span></button>
                    {user?.role === 'ADMIN' && (
                      <Link to="/users" className={cn(dropdownItemClass, "text-emerald-700 font-bold hover:bg-emerald-50")}><span>User & Session Control</span></Link>
                    )}
                    
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available">
                      <span>Logs</span>
                      <span className="text-brand-primary text-[10px]">▶</span>
                    </div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available">
                      <span>ICSR</span>
                      <span className="text-brand-primary text-[10px]">▶</span>
                    </div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available">
                      <span>Reconciliation</span>
                      <span className="text-brand-primary text-[10px]">▶</span>
                    </div>

                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Case Undelete</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Batch Reports</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>End Of Study</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Clear Cache</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Advanced Condition Library</span></div>
                  </div>
                )}
                
                {tab.name === 'Dashboards' && (
                  <div className={cn(dropdownContainerClass, "w-56")}>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Open Case Summary</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Open Action Items</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Quick Signal Report</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Increased Frequency Wizard</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Expedited Report Status</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Workflow Status</span></div>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Reports Due Soon</span></div>
                    <Link to="/" className={cn(dropdownItemClass, "bg-brand-light text-brand-dark font-bold")}><span>Personal Status</span></Link>
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>Case Workload</span></div>
                    {user?.role === 'ADMIN' && (
                      <>
                        <div className="border-t border-slate-100/50 my-1 mx-2" />
                        <Link to="/admin" className={cn(dropdownItemClass, "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-bold")}>
                          <span>Admin Dashboard</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Toolbar Icons directly in the header */}
        <div className="z-20">
          <CaseToolbar caseId={currentCaseId} />
        </div>
      </div>

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  );
}
