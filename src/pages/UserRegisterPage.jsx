import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';

export default function UserRegisterPage() {
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', email: '', org_name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await registerUser(formData);
      // registerUser redirects to / on success
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <Card className="w-full max-w-lg shadow-sm rounded-sm border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 pt-8 pb-6 border-b border-slate-100">
          <CardHeader className="text-center p-0">
            <CardTitle className="text-3xl font-extrabold text-slate-900 mb-2">Student Registration</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Join your institution's portal</CardDescription>
          </CardHeader>
        </div>
        <CardContent className="pt-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 rounded-sm border border-destructive/20 font-medium">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <Input name="full_name" value={formData.full_name} onChange={handleChange} required className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Institution</label>
              <Input name="org_name" value={formData.org_name} onChange={handleChange} required placeholder="Enter your college/university" className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Username</label>
                <Input name="username" value={formData.username} onChange={handleChange} required className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Input type="password" name="password" value={formData.password} onChange={handleChange} required className="rounded-sm h-11 focus:ring-brand-primary/50 transition-all border-slate-200" />
              </div>
            </div>
            
            <Button type="submit" className="w-full mt-6 rounded-sm h-11 font-bold shadow-sm shadow-brand-primary/20 hover:shadow-sm transition-all" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register as Student'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100/50 bg-slate-50/50 py-5">
          <p className="text-sm text-slate-500 font-medium">
            Already have an account? <Link to="/login" className="text-brand-primary hover:text-brand-dark hover:underline font-bold transition-colors">Login here</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
