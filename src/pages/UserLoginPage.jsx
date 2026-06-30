import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import ClinformatiqLogo from '../components/layout/ClinformatiqLogo';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-sm rounded-sm border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 pt-8 pb-6 border-b border-slate-100 flex justify-center items-center">
          <CardHeader className="text-center p-0 flex flex-col items-center">
            <ClinformatiqLogo sizeClass="h-28" className="mb-2" />
            <CardTitle className="text-xl font-bold text-slate-800">Student Portal</CardTitle>
          </CardHeader>
        </div>
        <CardContent className="pt-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 rounded-sm border border-destructive/20 font-medium">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter username" className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
            </div>
            
            <Button type="submit" className="w-full rounded-sm h-11 font-bold shadow-sm shadow-brand-primary/20 hover:shadow-sm transition-all" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col justify-center border-t border-slate-100/50 bg-slate-50/50 py-5 gap-2">
          <p className="text-sm text-slate-500 font-medium text-center">
            New Student? <Link to="/register" className="text-brand-primary hover:text-brand-dark hover:underline font-bold transition-colors">Register Here</Link>
          </p>
          <p className="text-sm text-slate-500 font-medium text-center">
            Are you an Admin? <Link to="/admin-login" className="text-brand-primary hover:text-brand-dark hover:underline font-bold transition-colors">Admin Login</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
