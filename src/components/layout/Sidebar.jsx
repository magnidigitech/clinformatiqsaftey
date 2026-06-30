import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Search, GitBranch, GraduationCap, Shield, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useUiStore from '../../store/uiStore';
import { cn } from '../../lib/utils';
import ClinformatiqLogo from './ClinformatiqLogo';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { name: 'New Case', path: '/cases/new', icon: FilePlus, roles: ['STUDENT'] },
    { name: 'MedDRA', path: '/meddra', icon: Search, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { name: 'Workflow', path: '/workflow', icon: GitBranch, roles: ['STUDENT'] },
    { name: 'Instructor', path: '/instructor', icon: GraduationCap, roles: ['INSTRUCTOR', 'ADMIN'] },
    { name: 'Admin', path: '/admin', icon: Shield, roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={cn("fixed left-0 top-0 h-full bg-white border-r border-slate-100 flex flex-col transition-all duration-300 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]", sidebarCollapsed ? "w-16" : "w-64")}>
      <div className="h-[64px] flex items-center justify-center px-2 border-b border-slate-100/50">
        {!sidebarCollapsed && <ClinformatiqLogo className="scale-75 origin-left" />}
        {sidebarCollapsed && <ClinformatiqLogo showText={false} className="scale-75" />}
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1.5 px-3">
        {filteredNav.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-200 group", 
                isActive 
                  ? "bg-gradient-to-r from-brand-light to-transparent text-brand-dark font-semibold shadow-sm border-l-4 border-brand-primary pl-2" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1", 
                sidebarCollapsed && "justify-center px-0 border-l-0 pl-3"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", isActive ? "text-brand-primary" : "text-slate-400 group-hover:text-brand-primary")} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>
      
      <div className="p-3 border-t border-slate-100/50 flex flex-col gap-2">
        <button onClick={logout} className={cn("flex items-center gap-3 px-3 py-2 rounded-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group hover:translate-x-1 w-full text-left", sidebarCollapsed && "justify-center px-0")}>
          <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-rose-500 transition-colors" />
          {!sidebarCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}