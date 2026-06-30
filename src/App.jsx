import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import AppShell from './components/layout/AppShell';

// Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import UserLoginPage from './pages/UserLoginPage';
import UserRegisterPage from './pages/UserRegisterPage';
import DashboardPage from './pages/DashboardPage';
import NewCasePage from './pages/NewCasePage';
import CaseOpenPage from './pages/CaseOpenPage';
import CaseDetailPage from './pages/CaseDetailPage';
import MedicalReviewPage from './pages/MedicalReviewPage';
import MedDRAPage from './pages/MedDRAPage';
import WorkflowPage from './pages/WorkflowPage';
import InstructorPage from './pages/InstructorPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" />;
  
  return children;
}

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const target = e.target;
        if (
          (target.tagName === 'INPUT' && (target.type === 'text' || target.type === '')) ||
          target.tagName === 'TEXTAREA'
        ) {
          if (target.value === '=') {
            const date = new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const formattedDate = `${day}-${month}-${year}`;

            let nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            ).set;
            
            if (target.tagName === 'TEXTAREA') {
              nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                "value"
              ).set;
            }

            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(target, formattedDate);
              const event = new Event('input', { bubbles: true });
              target.dispatchEvent(event);
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<UserLoginPage />} />
      <Route path="/register" element={<UserRegisterPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin-register" element={<AdminRegisterPage />} />
      
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cases/new" element={<NewCasePage />} />
        <Route path="/cases/open" element={<CaseOpenPage />} />
        <Route path="/cases/medical-review" element={<MedicalReviewPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/meddra" element={<MedDRAPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/instructor" element={<ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}><InstructorPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}