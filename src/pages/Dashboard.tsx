import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, FileText, Users, BadgeCheck } from 'lucide-react';

interface Stats {
  todayAttendance: string;
  totalLeaves: number;
  pendingLeaves: number;
  totalEmployees?: number;
  todayPresentCount?: number;
}

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<Stats>({
    todayAttendance: 'Not Marked',
    totalLeaves: 0,
    pendingLeaves: 0,
    totalEmployees: 0,
    todayPresentCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];

      if (role === 'admin') {
        const [employeesRes, todayAttendanceRes, pendingLeavesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        ]);

        setStats({
          todayAttendance: 'N/A',
          totalLeaves: 0,
          pendingLeaves: pendingLeavesRes.count || 0,
          totalEmployees: employeesRes.count || 0,
          todayPresentCount: todayAttendanceRes.count || 0,
        });
      } else {
        const [attendanceRes, leavesRes, pendingRes] = await Promise.all([
          supabase.from('attendance').select('status').eq('employee_id', profile.id).eq('date', today).single(),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('employee_id', profile.id).eq('status', 'approved'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('employee_id', profile.id).eq('status', 'pending'),
        ]);

        setStats({
          todayAttendance: attendanceRes.data?.status ? (attendanceRes.data.status === 'present' ? 'Present' : 'Absent') : 'Not Marked',
          totalLeaves: leavesRes.count || 0,
          pendingLeaves: pendingRes.count || 0,
        });
      }
    };

    fetchStats();
  }, [profile, role]);

  const getAttendanceColor = (status: string) => {
    if (status === 'Present') return 'text-[hsl(145,63%,49%)]';
    if (status === 'Absent') return 'text-[hsl(6,78%,57%)]';
    return 'text-muted-foreground';
  };

  const adminCards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: Users },
    { title: 'Attendance Today', value: stats.todayPresentCount, icon: Clock },
    { title: 'Pending Leave Requests', value: stats.pendingLeaves, icon: FileText },
  ];

  const employeeCards = [
    { title: "Today's Attendance", value: stats.todayAttendance, icon: Clock, isStatus: true },
    { title: 'Total Leaves', value: stats.totalLeaves, icon: FileText },
    { title: 'Pending Requests', value: stats.pendingLeaves, icon: BadgeCheck },
  ];

  const cards = role === 'admin' ? adminCards : employeeCards;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-semibold ${card.isStatus ? getAttendanceColor(card.value as string) : 'text-foreground'}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
