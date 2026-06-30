const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const filesToCreate = {
  'components/layout/AppShell.jsx': `
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useUiStore from '../../store/uiStore';
import { cn } from '../../lib/utils';

export default function AppShell() {
  const { sidebarCollapsed } = useUiStore();
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 mt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
  `,
  'components/layout/Sidebar.jsx': `
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Search, GitBranch, GraduationCap, Shield, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useUiStore from '../../store/uiStore';
import { cn } from '../../lib/utils';

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
    <aside className={cn("fixed left-0 top-0 h-full bg-sidebar border-r flex flex-col transition-all duration-300 z-50", sidebarCollapsed ? "w-16" : "w-64")}>
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!sidebarCollapsed && <span className="font-bold text-xl text-brand-primary truncate">PharmaVigil</span>}
        {sidebarCollapsed && <span className="font-bold text-xl text-brand-primary mx-auto">PV</span>}
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-2">
        {filteredNav.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn("flex items-center gap-3 px-3 py-2 rounded-md transition-colors", isActive ? "bg-brand-light text-brand-dark font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground", sidebarCollapsed && "justify-center px-0")}>
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>
      
      <div className="p-2 border-t flex flex-col gap-2">
        <button onClick={logout} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground w-full text-left", sidebarCollapsed && "justify-center px-0")}>
          <LogOut className="h-5 w-5 shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
  `,
  'components/layout/Topbar.jsx': `
import { Bell } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export default function Topbar() {
  const { user } = useAuth();
  
  return (
    <header className="fixed top-0 right-0 h-16 bg-topbar border-b z-40 flex items-center justify-end px-6 shadow-sm left-64 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{user?.full_name}</span>
            <span className="text-xs text-muted-foreground">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
  `
};

for (const [relativePath, content] of Object.entries(filesToCreate)) {
  const filePath = path.join(srcDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trim());
  console.log('Created:', filePath);
}
