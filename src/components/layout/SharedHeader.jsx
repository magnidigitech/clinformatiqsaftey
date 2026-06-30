import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useCases } from '../../hooks/useCases';
import { cn } from '../../lib/utils';
import CaseToolbar from './CaseToolbar';
import ClinformatiqLogo from './ClinformatiqLogo';
import ChangePasswordModal from '../ChangePasswordModal';

export default function SharedHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { cases } = useCases();

  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

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

  return (
    <div className="glass-panel border-b border-white/40 flex flex-col z-50 sticky top-0 shrink-0">
      {/* Brand Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100/50">
        <div className="flex items-center gap-3">
          <ClinformatiqLogo sizeClass="h-10" />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500 font-medium hidden sm:inline">
            Welcome <b className="text-slate-800">{user?.full_name}</b> <span className="opacity-50 mx-1">|</span> {currentDate}
          </span>
          <div className="flex overflow-hidden rounded-full shadow-sm border border-slate-200 bg-white/50 backdrop-blur-sm">
            <Link to="/" className="text-brand-dark hover:bg-brand-light px-4 py-1.5 transition-colors font-semibold text-xs">Home</Link>
            <button className="text-brand-dark hover:bg-brand-light px-4 py-1.5 border-l border-slate-200 transition-colors font-semibold text-xs">Help</button>
            <button onClick={logout} className="text-brand-dark hover:bg-brand-light px-4 py-1.5 border-l border-slate-200 transition-colors font-semibold text-xs">Logout</button>
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
                    <div className={cn(dropdownItemClass, "opacity-50 cursor-not-allowed")} title="Feature not available"><span>User Login List</span></div>
                    
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
