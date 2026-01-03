import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Building, Copy, Check, Phone, Briefcase, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { z } from 'zod';
import { Navigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { createClient } from '@supabase/supabase-js';

const employeeSchema = z.object({
  name: z.string().min(1, 'Employee name is required'),
  email: z.string().email('Please enter a valid email'),
  department: z.string().min(1, 'Department is required'),
  phone: z.string().optional(),
  jobTitle: z.string().min(1, 'Job title is required'),
});

interface CreatedEmployee {
  employeeId: string;
  temporaryPassword: string;
  name: string;
  email: string;
}

export default function CreateEmployee() {
  const { role, profile } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
    jobTitle: '',
  });
  const [loading, setLoading] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployee | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = employeeSchema.safeParse(formData);
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
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || formData.name;
      const lastName = nameParts.slice(1).join(' ') || '';
      const temporaryPassword = generateTemporaryPassword();

      // Get company name for custom employee ID
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .limit(1)
        .single();

      // 1. Generate ID (Try RPC, Fallback to Client-side)
      let customEmployeeId = 'EMP-' + Math.floor(1000 + Math.random() * 9000);

      try {
        const { data: rpcId, error: rpcError } = await supabase.rpc('generate_custom_employee_id', {
          p_first_name: firstName,
          p_last_name: lastName,
          p_company_name: companyData?.name || null,
          p_hire_year: new Date().getFullYear(),
        });
        if (!rpcError && rpcId) customEmployeeId = rpcId;
      } catch (err) {
        console.warn("ID Generation RPC failed, using fallback", err);
      }

      // 2. Create employee user via AUTH
      // We use a temporary client so the administrator doesn't get logged out
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false,
          },
        }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: temporaryPassword,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'employee',
            department: formData.department,
            job_title: formData.jobTitle,
            phone: formData.phone,
            force_password_change: true,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create employee user');

      const newUserId = authData.user.id;

      // 3. Update profile with additional details
      // Trigger should have already created the profile, so we just update it
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          employee_id: customEmployeeId,
          department: formData.department,
          job_title: formData.jobTitle,
          phone: formData.phone,
          company_id: profile?.company_id || null,
        })
        .eq('id', newUserId);

      if (updateError) {
        console.error('Profile update error:', updateError);
      }

      setCreatedEmployee({
        employeeId: customEmployeeId,
        temporaryPassword,
        name: formData.name,
        email: formData.email,
      });

      toast({
        title: 'Employee Created!',
        description: 'Account successfully initialized.',
      });

      setFormData({ name: '', email: '', department: '', phone: '', jobTitle: '' });

    } catch (error: any) {
      console.error('Create employee error:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'An error occurred during onboarding',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'id' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateAnother = () => {
    setCreatedEmployee(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {createdEmployee ? (
          <Dialog open={!!createdEmployee} onOpenChange={(open) => !open && setCreatedEmployee(null)}>
            <DialogContent className="sm:max-w-md bg-[#111827] border-white/10 text-white rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="flex flex-col items-center gap-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <ShieldCheck className="h-8 w-8 text-blue-400" />
                  </div>
                  <span className="text-2xl font-black tracking-tight">Onboarding Successful</span>
                </DialogTitle>
                <DialogDescription className="text-center text-gray-400 pt-2 font-medium">
                  Institutional identity generated for <strong>{createdEmployee.email}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-white/5 rounded-2xl p-6 space-y-4 my-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Employee Login ID</p>
                    <p className="text-xl font-black text-blue-400 tracking-tight">{createdEmployee.employeeId}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(createdEmployee.employeeId, 'id')}
                    className="hover:bg-blue-500/10 text-blue-400"
                  >
                    {copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Temporary Access Key</p>
                    <p className="text-xl font-black text-white tracking-tight">{createdEmployee.temporaryPassword}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(createdEmployee.temporaryPassword, 'password')}
                    className="hover:bg-white/10 text-white"
                  >
                    {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full h-14 bg-white text-black hover:bg-white/90 font-black text-lg rounded-xl shadow-xl shadow-white/5 flex items-center gap-3 transition-all"
                  onClick={async () => {
                    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                    if (!serviceId || !templateId || !publicKey) {
                      toast({
                        title: "Config Error",
                        description: "EmailJS keys missing in environment.",
                        variant: "destructive"
                      });
                      return;
                    }

                    try {
                      await emailjs.send(
                        serviceId,
                        templateId,
                        {
                          to_name: createdEmployee.name,
                          to_email: createdEmployee.email,
                          employee_id: createdEmployee.employeeId,
                          password: createdEmployee.temporaryPassword,
                          login_url: `${window.location.origin}/login`
                        },
                        publicKey
                      );

                      toast({
                        title: "Identity Transmitted",
                        description: `Credentials sent to ${createdEmployee.email}`,
                      });
                    } catch (error: any) {
                      console.error("EmailJS Error:", error);
                      toast({
                        title: "Transmission Failed",
                        description: "Check credentials or manual copy.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Mail className="h-5 w-5" />
                  Dispatch Credentials
                </Button>

                <Button variant="ghost" className="w-full text-gray-500 font-bold hover:text-white" onClick={handleCreateAnother}>
                  Initialize Another Hire
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="mb-8 space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter">Onboard Talent</h1>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Acquisition Registry • System Instance</p>
            </div>

            <Card className="bg-[#111827]/40 border-white/5 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Legal Name</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="name"
                        placeholder="Johnathan Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-14 pl-12 bg-white/5 border-white/5 text-white placeholder:text-gray-700 rounded-2xl focus:ring-blue-500/20 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="department" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Division</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) => setFormData({ ...formData, department: value })}
                      >
                        <SelectTrigger className="h-14 bg-white/5 border-white/5 text-white rounded-2xl focus:ring-blue-500/20">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-600" />
                            <SelectValue placeholder="Select Division" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-white/10 text-white rounded-xl">
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="HR">Human Resources</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="jobTitle" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Strategic Title</Label>
                      <div className="relative group">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          id="jobTitle"
                          placeholder="Lead Architect"
                          value={formData.jobTitle}
                          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                          className="h-14 pl-12 bg-white/5 border-white/5 text-white placeholder:text-gray-700 rounded-2xl focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Communication Channel</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="hire@enterprise.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-14 pl-12 bg-white/5 border-white/5 text-white placeholder:text-gray-700 rounded-2xl focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Contact Reference</Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 (000) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-14 pl-12 bg-white/5 border-white/5 text-white placeholder:text-gray-700 rounded-2xl focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-16 bg-white text-black hover:bg-white/90 font-black text-lg rounded-2xl shadow-xl shadow-white/5 transition-all active:scale-[0.98] group" disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin h-6 w-6" />
                    ) : (
                      <span className="flex items-center gap-3">
                        Commit Onboarding Phase
                        <ShieldCheck className="h-6 w-6" />
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
