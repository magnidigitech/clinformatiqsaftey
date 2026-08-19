import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import ClinformatiqLogo from '../components/layout/ClinformatiqLogo';
import { AlertTriangle, XCircle } from 'lucide-react';

export default function UserLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await loginUser(username, password);
      // loginUser redirects to / on success
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative">
      {/* Floating Toast Notification for Login Errors */}
      {error && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-50 border-2 border-red-500/30 text-red-900 px-4 py-3 rounded-lg shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-red-100 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-red-800">Authentication Error</p>
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-700 p-1 rounded-md transition-colors"
              title="Dismiss"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <Card className="w-full max-w-md shadow-sm rounded-sm border-slate-100 overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 pt-8 pb-6 border-b border-slate-100 flex justify-center items-center">
          <CardHeader className="text-center p-0 flex flex-col items-center">
            <ClinformatiqLogo sizeClass="h-28" className="mb-2" />
            <CardTitle className="text-xl font-bold text-slate-800">Student Portal</CardTitle>
          </CardHeader>
        </div>
        <CardContent className="pt-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter username" className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
            </div>
            
            <Button 
              type="submit" 
              className="w-full rounded-md h-11 font-bold bg-[#0F766E] hover:bg-[#115E59] text-white shadow-sm transition-all" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login to Student Portal'}
            </Button>
          </form>
        </CardContent>
        <div className="border-t border-slate-100 bg-slate-50/50 py-4 px-6 text-center text-xs text-slate-400 font-medium">
          <p className="italic">Student access is assigned and managed by your college administrator.</p>
        </div>
      </Card>
    </div>
  );
}
