import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, User, Lock, Upload, ImageIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const setupSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  adminName: z.string().min(1, 'Admin name is required'),
  adminEmail: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function CompanySetup() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Error checking setup:', error);
      }

      setSetupComplete(data && data.length > 0);
      setCheckingSetup(false);
    };

    checkSetup();
  }, []);

  if (authLoading || checkingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0E14]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (setupComplete) {
    return <Navigate to="/login" replace />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload an image file (PNG or JPG)',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = setupSchema.safeParse(formData);
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
      const nameParts = formData.adminName.trim().split(' ');
      const firstName = nameParts[0] || formData.adminName;
      const lastName = nameParts.slice(1).join(' ') || '';

      // 1. Create Admin User via standard AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin',
            is_initial_admin: true,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create admin user');

      const adminUserId = authData.user.id;

      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Insert Company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          setup_complete: true,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 3. Generate ID (Server-side RPC)
      const { data: customIdResult } = await supabase.rpc('generate_custom_employee_id', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_company_name: formData.companyName,
        p_hire_year: new Date().getFullYear(),
      });

      // 4. Update Admin Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: companyData.id,
          employee_id: customIdResult || 'ADMIN-001',
        })
        .eq('id', adminUserId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      toast({
        title: 'Setup Successful!',
        description: 'Identity established. You can now login.',
      });

      navigate('/login');

    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Initialization Failed',
        description: error.message || 'An error occurred during critical setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-2xl relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-0.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-3xl">
            <img src="/logo.jpg" alt="DayFlow Logo" className="h-full w-full object-cover rounded-2xl" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter">DayFlow Registry</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2">Enterprise Resource Initialization</p>
          </div>
        </div>

        <Card className="bg-[#111827]/40 border-white/5 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Company Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 font-sans">Entity Information</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <Label htmlFor="companyName" className="text-xs font-bold text-gray-500 ml-1">Legal Company Name *</Label>
                    <input
                      id="companyName"
                      placeholder="e.g. Acme Corp"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="flex h-12 w-full border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 border-white/5 text-white placeholder:text-gray-600 rounded-xl focus:ring-blue-500/20"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold text-gray-500 ml-1">Entity Branding</Label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="h-12 w-12 rounded-xl border border-white/10 overflow-hidden shrink-0">
                          <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center bg-white/5 shrink-0">
                          <ImageIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 relative">
                        <input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="flex h-12 w-full border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 opacity-0 absolute inset-0 cursor-pointer z-10"
                        />
                        <div className="h-12 px-4 border border-white/5 bg-white/5 rounded-xl flex items-center justify-between pointer-events-none">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Upload Symbol</span>
                          <Upload className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-purple-500" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 font-sans">Primary Authority</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="adminName" className="text-xs font-bold text-gray-500 ml-1">Full Name *</Label>
                    <input
                      id="adminName"
                      placeholder="e.g. John Doe"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="flex h-12 w-full border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 border-white/5 text-white rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="adminEmail" className="text-xs font-bold text-gray-500 ml-1">Authority Email *</Label>
                    <input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@instance.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="flex h-12 w-full border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 border-white/5 text-white rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-xs font-bold text-gray-500 ml-1">Root Access Key *</Label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="flex h-12 w-full border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 border-white/5 text-white rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold text-gray-500 ml-1">Confirm Key *</Label>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="flex h-12 w-full border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 border-white/5 text-white rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-16 bg-white text-black hover:bg-white/90 font-black text-lg rounded-[1.5rem] shadow-2xl shadow-white/5 group transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-6 w-6" />
                  ) : (
                    <span className="flex items-center gap-3">
                      Initialize Enterprise Context
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                  )}
                </Button>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] text-center mt-6">
                  Critical Warning: Administrative initialization can only be performed once.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
