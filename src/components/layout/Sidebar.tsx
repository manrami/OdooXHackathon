import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Clock,
  FileText,
  Users,
  UserCircle,
  LogOut,
  UserPlus,
  DollarSign,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const location = useLocation();
  const { role, signOut } = useAuth();

  const employeeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/time-off', icon: FileText, label: 'Time Off' },
    { to: '/payroll', icon: DollarSign, label: 'Payroll' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/employees/create', icon: UserPlus, label: 'Create Employee' },
    { to: '/attendance/manage', icon: Clock, label: 'Attendance' },
    { to: '/time-off/approvals', icon: FileText, label: 'Time Off Requests' },
    { to: '/payroll/manage', icon: DollarSign, label: 'Payroll' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const links = role === 'admin' ? adminLinks : employeeLinks;

  return (
    <aside className="relative flex flex-col h-screen w-64 bg-[#080B10] border-r border-white/5 shadow-2xl z-20 overflow-hidden shrink-0">
      {/* Sidebar background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

      <div className="relative p-6 border-b border-white/5 flex flex-col items-center text-center gap-3">
        <Link to="/dashboard" className="group">
          <div className="h-20 w-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:border-blue-500/30">
            <img src="/logo.jpg" alt="DayFlow Logo" className="h-full w-full object-cover" />
          </div>
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white">DayFlow</h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Enterprise HRMS</p>
        </div>
      </div>

      <nav className="relative flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 group',
              location.pathname === link.to
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            )}
          >
            <link.icon className={cn(
              "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
              location.pathname === link.to ? "text-blue-400" : "text-gray-600 group-hover:text-blue-500"
            )} />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="relative p-6 border-t border-white/5 bg-[#080B10]">
        <Button
          variant="ghost"
          className="w-full justify-start gap-4 h-12 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all group font-bold"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Logout System
        </Button>
      </div>
    </aside>
  );
}
