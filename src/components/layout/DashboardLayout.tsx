import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ChevronDown, UserCircle, LogOut, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { supabase } from '@/integrations/supabase/client';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/attendance': 'My Attendance',
  '/attendance/manage': 'Attendance Management',
  '/time-off': 'Leave & Time Off',
  '/time-off/approvals': 'Leave Approvals',
  '/employees': 'Workforce Directory',
  '/employees/create': 'Onboard Employee',
  '/profile': 'Personal Profile',
  '/payroll': 'Salary & Payroll',
  '/payroll/manage': 'Payroll Operations',
};

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, profile, loading, signOut, role } = useAuth();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    const channel = supabase.channel('admin-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setIsOnline(true);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        setIsOnline(true);
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      } else {
        setIsOnline(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0E14]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-blue-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pageTitle = title || pageTitles[location.pathname] || 'System Dashboard';

  return (
    <div className="flex min-h-screen bg-[#0A0E14] text-gray-300 font-sans selection:bg-blue-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <header className="h-20 bg-[#0A0E14]/70 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black text-white tracking-tight">{pageTitle}</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Enterprise Network Instance</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 pr-6 border-r border-white/5">
              <NotificationBell />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-4 cursor-pointer group">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{role}</p>
                  </div>
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform">
                      <span className="text-sm font-black text-white">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </span>
                    </div>
                    {role === 'admin' && (
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0A0E14] ${isOnline ? 'bg-green-500' : 'bg-red-500'
                          } shadow-sm shadow-black/50`}
                      />
                    )}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111827] border-white/10 text-gray-300 p-2 rounded-2xl shadow-2xl">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/5 focus:bg-white/5 transition-colors">
                    <UserCircle className="h-4 w-4 text-blue-400" />
                    <span className="font-bold text-sm">Corporate Profile</span>
                  </Link>
                </DropdownMenuItem>
                <div className="h-px bg-white/5 my-2 mx-2" />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer text-red-400 hover:bg-red-500/5 focus:bg-red-500/5 transition-colors">
                  <LogOut className="h-4 w-4" />
                  <span className="font-bold text-sm">Terminate Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#0A0E14] relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}