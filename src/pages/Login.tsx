import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Lock, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0E14]">
        <div className="h-12 w-12 rounded-full border-t-2 border-blue-500 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ employeeId, password });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let signInEmail = employeeId;
      const isEmail = employeeId.includes('@');

      if (!isEmail) {
        // Use RPC to get the actual email for this employee ID
        const { data: mappedEmail, error: rpcError } = await supabase
          .rpc('get_email_by_employee_id', { p_employee_id: employeeId });

        if (rpcError || !mappedEmail) {
          console.error('Email mapping error:', rpcError);
          setLoading(false);
          toast({
            title: 'Login Failed',
            description: 'Could not find a user with this Employee ID.',
            variant: 'destructive',
          });
          return;
        }
        signInEmail = mappedEmail;
        console.log(`Mapped ID ${employeeId} to Email: ${signInEmail}`);
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: password,
      });

      if (authError) {
        let message = authError.message;
        if (message.includes('Email not confirmed')) {
          message = 'Please verify your email before logging in.';
        } else if (message.includes('Invalid login credentials')) {
          message = 'Invalid password. Please try again.';
        }
        toast({
          title: 'Login Failed',
          description: message,
          variant: 'destructive',
        });
      } else {
        if (data.user?.user_metadata?.force_password_change) {
          navigate('/change-password');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="h-24 w-24 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl p-0.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-3xl">
            <img src="/logo.jpg" alt="DayFlow Logo" className="h-full w-full object-cover rounded-[1.9rem]" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter">DayFlow</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Access</p>
          </div>
        </div>

        <Card className="bg-[#111827]/40 border-white/5 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="pt-10 px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="employeeId" className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Identity Gateway</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Email or Employee ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="h-14 pl-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-gray-400">Security Key</Label>
                  <Link to="/forgot-password" title="Temporarily Unavailable" className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">Recover</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 pr-12 bg-white/5 border-white/5 text-white placeholder:text-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-white text-black hover:bg-white/90 font-black text-lg rounded-2xl shadow-xl shadow-white/5 transition-all active:scale-[0.98] group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  <span className="flex items-center gap-2">
                    Authorize Access
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-12 text-center space-y-4">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-3 w-3" />
            Back to Public Domain
          </Link>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} DayFlow. Internal System Instance.
          </p>
        </div>
      </div>
    </div>
  );
}
