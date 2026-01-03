import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  FileText,
  Users,
  BadgeCheck,
  Circle,
  Plane,
  DollarSign,
  UserPlus,
  CalendarCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Activity,
  Zap,
  Shield,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Stats {
  totalDays: number;
  presentDays: number;
  onLeaveDays: number;
  absentDays: number;
  paidLeaveBalance: number;
  sickLeaveBalance: number;
  latestNetSalary: number | null;
  totalEmployees?: number;
  todayPresentCount?: number;
  pendingRequests?: number;
  totalPayroll?: number;
}

interface RecentLeaveRequest {
  id: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: string;
  avatar_url?: string;
}

interface RecentEmployee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface OnlineAdmin {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function Dashboard() {
  const { profile, role, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalDays: 0,
    presentDays: 0,
    onLeaveDays: 0,
    absentDays: 0,
    paidLeaveBalance: 12,
    sickLeaveBalance: 6,
    latestNetSalary: null,
    totalEmployees: 0,
    todayPresentCount: 0,
    pendingRequests: 0,
    totalPayroll: 0,
  });
  const [recentLeaves, setRecentLeaves] = useState<RecentLeaveRequest[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];
      const currentMonthNum = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      if (role === 'admin') {
        const [employeesRes, todayAttendanceRes, pendingLeavesRes, payrollRes, recentLeavesRes, recentEmployeesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('payroll').select('net_salary').eq('month', currentMonthNum).eq('year', currentYear),
          supabase
            .from('leave_requests')
            .select(`
              id,
              leave_type,
              from_date,
              to_date,
              status,
              profiles:employee_id (first_name, last_name, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('profiles')
            .select('id, first_name, last_name, employee_id, department, avatar_url, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const totalPayroll = payrollRes.data?.reduce((sum, r) => sum + Number(r.net_salary), 0) || 0;

        setStats(prev => ({
          ...prev,
          totalEmployees: employeesRes.count || 0,
          todayPresentCount: todayAttendanceRes.count || 0,
          pendingRequests: pendingLeavesRes.count || 0,
          totalPayroll,
        }));

        const processedLeaves = recentLeavesRes.data?.map((leave: any) => ({
          id: leave.id,
          employee_name: `${leave.profiles?.first_name || ''} ${leave.profiles?.last_name || ''}`.trim(),
          leave_type: leave.leave_type,
          from_date: leave.from_date,
          to_date: leave.to_date,
          status: leave.status,
          avatar_url: leave.profiles?.avatar_url,
        })) || [];

        setRecentLeaves(processedLeaves);
        setRecentEmployees(recentEmployeesRes.data || []);
      } else {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const startOfMonth = `${currentMonth}-01`;
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        const [attendanceRes, payrollRes] = await Promise.all([
          supabase
            .from('attendance')
            .select('status')
            .eq('employee_id', profile.id)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth),
          supabase
            .from('payroll')
            .select('net_salary')
            .eq('employee_id', profile.id)
            .eq('status', 'paid')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const attendanceData = attendanceRes.data;
        const present = attendanceData?.filter(r => r.status === 'present').length || 0;
        const onLeave = attendanceData?.filter(r => r.status === 'on_leave').length || 0;
        const absent = attendanceData?.filter(r => r.status === 'absent').length || 0;

        setStats(prev => ({
          ...prev,
          totalDays: attendanceData?.length || 0,
          presentDays: present,
          onLeaveDays: onLeave,
          absentDays: absent,
          latestNetSalary: payrollRes.data?.net_salary ?? null,
        }));
      }
    };

    fetchStats();
  }, [profile, role]);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    const channel = supabase.channel('online-admins', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const admins: OnlineAdmin[] = [];
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.role === 'admin') {
              admins.push({
                user_id: presence.user_id,
                first_name: presence.first_name,
                last_name: presence.last_name,
                avatar_url: presence.avatar_url,
              });
            }
          });
        });
        setOnlineAdmins(admins);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && profile) {
          await channel.track({
            user_id: user.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
            role: role,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, profile]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full font-bold">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-bold">Rejected</Badge>;
      default:
        return <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full font-bold">Pending</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const PremiumCard = ({ children, className, onClick }: any) => (
    <div
      onClick={onClick}
      className={cn(
        "relative group bg-[#111827]/40 border border-white/5 backdrop-blur-2xl rounded-[2rem] p-6 shadow-2xl transition-all duration-500 hover:bg-[#111827]/60 hover:border-blue-500/30 hover:-translate-y-1 cursor-pointer overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (role === 'admin') {
    const statsCards = [
      {
        title: 'Workforce Hub',
        label: 'Total Employees',
        value: stats.totalEmployees,
        icon: Users,
        color: 'from-blue-600 to-indigo-700 shadow-blue-500/20',
        onClick: () => navigate('/employees'),
      },
      {
        title: 'Active Presence',
        label: 'Present Today',
        value: stats.todayPresentCount,
        icon: CalendarCheck,
        color: 'from-emerald-600 to-teal-700 shadow-emerald-500/20',
        onClick: () => navigate('/attendance/manage'),
      },
      {
        title: 'Queue Control',
        label: 'Pending Requests',
        value: stats.pendingRequests,
        icon: AlertCircle,
        color: 'from-orange-600 to-amber-700 shadow-orange-500/20',
        onClick: () => navigate('/time-off/approvals'),
      },
      {
        title: 'Financial Flow',
        label: 'Monthly Payroll',
        value: formatCurrency(stats.totalPayroll || 0),
        icon: TrendingUp,
        color: 'from-indigo-600 to-purple-700 shadow-indigo-500/20',
        onClick: () => navigate('/payroll/manage'),
      },
    ];

    return (
      <DashboardLayout>
        <div className="space-y-10 pb-10">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Administrative Authority
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">
                Synchronizing, {profile?.first_name}.
              </h1>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-wide">
                System status: <span className="text-white">Optimal Operations</span> • {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate('/employees/create')} className="h-12 px-6 rounded-xl bg-white text-black hover:bg-white/90 font-black gap-2 transition-all hover:scale-105 active:scale-95">
                <UserPlus className="h-4 w-4" />
                Hire Talent
              </Button>
              <Button onClick={() => navigate('/payroll/manage')} variant="outline" className="h-12 px-6 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-black gap-2 transition-all">
                <DollarSign className="h-4 w-4" />
                Finalize Payroll
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((card) => (
              <PremiumCard key={card.title} onClick={card.onClick} className="h-[180px] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <Target className="h-4 w-4 text-white/10 group-hover:text-blue-500/30 transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{card.label}</p>
                  <p className="text-3xl font-black text-white mt-1 group-hover:text-blue-400 transition-colors tracking-tight">{card.value}</p>
                </div>
              </PremiumCard>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* List Components (2/3 width) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Leave Requests */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Queue Protocol
                    <span className="text-xs font-bold text-gray-600 px-2 py-0.5 rounded-lg bg-white/5 ml-2">Recent Requests</span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/time-off/approvals')} className="text-xs font-black text-blue-400 uppercase tracking-widest hover:bg-blue-500/10">View Operations Hub</Button>
                </div>

                <div className="grid gap-3">
                  {recentLeaves.length > 0 ? recentLeaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#111827]/30 border border-white/5 hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border border-white/10 p-0.5">
                          <AvatarImage src={leave.avatar_url} />
                          <AvatarFallback className="bg-blue-600/20 text-blue-400 font-black text-sm">
                            {leave.employee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-white group-hover:text-blue-400 transition-colors tracking-tight">{leave.employee_name}</p>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                            {leave.leave_type} — {format(new Date(leave.from_date), 'MMM d')} to {format(new Date(leave.to_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(leave.status)}
                    </div>
                  )) : (
                    <div className="p-12 text-center rounded-3xl border border-dashed border-white/5">
                      <Activity className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">No Active Transmissions</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Workforce Feed */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Workforce Directory
                    <span className="text-xs font-bold text-gray-600 px-2 py-0.5 rounded-lg bg-white/5 ml-2">Latest Onboards</span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} className="text-xs font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500/10">Full Registry</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentEmployees.map(employee => (
                    <div key={employee.id} className="p-4 rounded-2xl bg-[#111827]/30 border border-white/5 hover:bg-white/[0.04] transition-all flex items-center gap-4 group">
                      <Avatar className="h-11 w-11 border border-white/10 p-0.5 group-hover:border-purple-500/30 transition-colors">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-600/20 text-purple-400 font-black text-sm">
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white tracking-tight">{employee.first_name} {employee.last_name}</p>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
                          {employee.department || 'General Operations'} — ID: {employee.employee_id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Dashboards (1/3 width) */}
            <div className="space-y-8">
              {/* Online Network */}
              <PremiumCard className="space-y-6 !p-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                    <h4 className="font-black text-white uppercase tracking-widest text-xs">Live Network</h4>
                  </div>
                  <Shield className="h-4 w-4 text-gray-700" />
                </div>
                <div className="space-y-4">
                  {onlineAdmins.length > 0 ? onlineAdmins.map((admin) => (
                    <div key={admin.user_id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10 group-hover:border-green-500/30 transition-colors">
                          <AvatarImage src={admin.avatar_url || undefined} />
                          <AvatarFallback className="bg-green-600/20 text-green-400 font-bold text-xs uppercase">
                            {getInitials(admin.first_name, admin.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{admin.first_name}</span>
                      </div>
                      <Badge className="bg-green-500/10 text-[9px] font-black uppercase text-green-400 border-none">Active</Badge>
                    </div>
                  )) : (
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest italic">Silent Terminal...</p>
                  )}
                </div>
              </PremiumCard>

              {/* System Efficiency */}
              <PremiumCard className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border-white/10 !p-8">
                <div className="space-y-6">
                  <Zap className="h-8 w-8 text-blue-400" />
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-white tracking-tight">System Authority</h4>
                    <p className="text-xs font-bold text-blue-400/60 uppercase tracking-widest">Global Health: 100%</p>
                  </div>
                  <div className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>Workforce Saturation</span>
                        <span>{((stats.todayPresentCount || 0) / (stats.totalEmployees || 1) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${((stats.todayPresentCount || 0) / (stats.totalEmployees || 1) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Employee Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-10 pb-10">
        {/* Welcome Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
            Employee Terminal Instance
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter">
            System Online, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{profile?.first_name}</span>.
          </h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-wide">
            Network status: <span className="text-white">Encrypted</span> • {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Global Overview Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Financial Capsule */}
          <PremiumCard className="flex flex-col justify-between h-[180px]" onClick={() => navigate('/payroll')}>
            <div className="flex justify-between items-start">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <Activity className="h-4 w-4 text-white/5 group-hover:text-indigo-400/50" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Latest Net Salary</p>
              <p className="text-3xl font-black text-white mt-1 group-hover:text-indigo-400 transition-colors tracking-tight">
                {stats.latestNetSalary !== null ? formatCurrency(stats.latestNetSalary) : 'PENDING'}
              </p>
            </div>
          </PremiumCard>

          {/* Time Allocation */}
          <PremiumCard className="flex flex-col justify-between h-[180px]" onClick={() => navigate('/attendance')}>
            <div className="flex justify-between items-start">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <BadgeCheck className="h-4 w-4 text-white/5 group-hover:text-teal-400/50" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Present (Month)</p>
              <p className="text-3xl font-black text-white mt-1 group-hover:text-emerald-400 transition-colors tracking-tight">
                {stats.presentDays} <span className="text-lg text-gray-600 font-bold">/ {stats.totalDays}</span>
              </p>
            </div>
          </PremiumCard>

          {/* Leave Assets */}
          <PremiumCard className="flex flex-col justify-between h-[180px]" onClick={() => navigate('/time-off')}>
            <div className="flex justify-between items-start">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <Plane className="h-4 w-4 text-white/5 group-hover:text-purple-400/50" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Leave Balance</p>
              <p className="text-3xl font-black text-white mt-1 group-hover:text-purple-400 transition-colors tracking-tight">
                {stats.paidLeaveBalance + stats.sickLeaveBalance} <span className="text-lg text-gray-600 font-bold text-sm tracking-widest">UNITS</span>
              </p>
            </div>
          </PremiumCard>

          {/* Verification Status */}
          <PremiumCard className="flex flex-col justify-between h-[180px]" onClick={() => navigate('/profile')}>
            <div className="flex justify-between items-start">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg text-white">
                <Shield className="h-5 w-5" />
              </div>
              <BadgeCheck className="h-4 w-4 text-white/5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Profile Integrity</p>
              <p className="text-2xl font-black text-white mt-1 group-hover:text-gray-400 transition-colors tracking-tight uppercase">
                Verified
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Detailed Interaction Row */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Identity Capsule */}
          <PremiumCard className="bg-gradient-to-br from-blue-600/10 to-transparent border-white/10 !p-8 space-y-8">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-24 w-24 rounded-3xl overflow-hidden border-2 border-blue-500/30 p-1 shadow-2xl shadow-blue-500/10">
                <Avatar className="h-full w-full rounded-2xl">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white font-black text-2xl uppercase">
                    {getInitials(profile?.first_name || '', profile?.last_name || '')}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white tracking-tight">{profile?.first_name} {profile?.last_name}</h3>
                <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mt-1">{profile?.department || 'Operations'}</p>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID Reference</span>
                <span className="text-sm font-bold text-white font-mono">{profile?.employee_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Level</span>
                <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">{role}</span>
              </div>
            </div>
            <Button onClick={() => navigate('/profile')} className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all">
              Modify Identity Profile
            </Button>
          </PremiumCard>

          {/* Leave allocation graph mock */}
          <PremiumCard className="lg:col-span-2 space-y-8 !p-8">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-white uppercase tracking-widest text-xs flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Quota Utilization
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                    <span>Paid Time Off</span>
                    <span className="text-white">{stats.paidLeaveBalance} Units Left</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                    <span>Sick Leave Assets</span>
                    <span className="text-white">{stats.sickLeaveBalance} Units Left</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
              </div>
              <div className="bg-blue-500/5 rounded-3xl p-6 border border-blue-500/10 flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Plane className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Next Leave Cycle</p>
                    <p className="text-sm font-bold text-white">Quarter 1, 2026</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/time-off')} className="h-11 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-500 shadow-lg shadow-blue-500/20 uppercase tracking-widest text-[10px]">
                  Initiate Leave Request
                </Button>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>
    </DashboardLayout>
  );
}