import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Clock, Users, FileText, DollarSign, Shield,
  BarChart3, CheckCircle, ArrowRight, Zap,
  Layers, Lock, Monitor, Briefcase
} from 'lucide-react';

const EnterpriseFeature = ({ icon: Icon, title, description, delay }: any) => (
  <div
    className="relative group p-8 rounded-3xl bg-[#111827]/40 border border-white/5 backdrop-blur-xl hover:bg-[#111827]/60 transition-all duration-500 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
    </div>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0E14] text-gray-300 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0E14]/70 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="h-12 w-12 rounded-xl border border-white/10 shadow-lg overflow-hidden transition-transform group-hover:rotate-6">
              <img src="/logo.jpg" alt="DayFlow Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">DayFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide uppercase">
            <a href="#" className="hover:text-blue-400 transition-colors">Solutions</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Resources</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Enterprise</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/5 font-bold px-6">Login</Button>
            </Link>
            <Link to="/setup">
              <Button className="bg-white text-black hover:bg-white/90 font-black px-8 rounded-full shadow-xl shadow-white/10">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              The Future of Workforce Management
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter">
              Smart HR. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
                Simplified.
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
              Revolutionize your workplace with DayFlow. Manage attendance, leaves, and payroll with surgical precision on a platform designed for the modern enterprise.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <Link to="/setup">
                <Button size="lg" className="h-16 px-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-lg shadow-2xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 group">
                  Deploy DayFlow
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-[#0A0E14] bg-gray-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="avatar" />
                  </div>
                ))}
                <div className="h-10 px-3 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  +2.4k Teams joined
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[#0F172A] border border-white/10 rounded-[2rem] p-4 shadow-2xl overflow-hidden animate-float">
              {/* Mock Dashboard UI Visualization */}
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4 px-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/50" />
                </div>
                <div className="h-4 w-32 bg-white/5 rounded-full mx-auto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="h-32 rounded-2xl bg-blue-500/5 border border-blue-500/10 p-4 space-y-3">
                    <div className="h-3 w-1/2 bg-blue-400/20 rounded" />
                    <div className="h-8 w-3/4 bg-blue-500/40 rounded-lg" />
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-1 w-full bg-blue-500/10 rounded" />)}
                    </div>
                  </div>
                  <div className="h-20 rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20" />
                    <div className="space-y-2 flex-1">
                      <div className="h-2 w-full bg-white/5 rounded" />
                      <div className="h-2 w-1/2 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-24 rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                    <div className="flex justify-between mb-4">
                      <div className="h-3 w-8 bg-green-500/30 rounded" />
                      <div className="h-3 w-3 rounded-full bg-white/10" />
                    </div>
                    <div className="h-6 w-ful bg-white/5 rounded" />
                  </div>
                  <div className="h-28 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-4 space-y-3">
                    <div className="h-3 w-full bg-indigo-400/20 rounded" />
                    <div className="h-8 w-2/3 bg-indigo-500/20 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-500">Core Capabilities</h2>
              <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">Everything your HR <br /> department needs.</p>
            </div>
            <p className="text-gray-400 max-w-sm font-medium">Modular components designed to scale with your business growth and workforce complexity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EnterpriseFeature
              icon={Users} title="Workforce Directory"
              description="A centralized HUB for all employee data with high-fidelity profiles and instant search."
              delay={0}
            />
            <EnterpriseFeature
              icon={Clock} title="Precision Attendance"
              description="Track time with millisecond accuracy. Check-ins, extra hours, and real-time status tracking."
              delay={100}
            />
            <EnterpriseFeature
              icon={FileText} title="Leave Automation"
              description="Smarter workflows for time-off requests. Automated approvals and policy enforcement."
              delay={200}
            />
            <EnterpriseFeature
              icon={DollarSign} title="Payroll Engine"
              description="Institutional-grade salary processing. Handle complex structures, allowances, and taxes."
              delay={300}
            />
            <EnterpriseFeature
              icon={Shield} title="Admin Authority"
              description="Unmatched control over company policies, employee roles, and system-wide visibility."
              delay={400}
            />
            <EnterpriseFeature
              icon={BarChart3} title="Business Intelligence"
              description="Real-time reporting and analytics to drive informed workforce decisions."
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* Split Auth Preview Section */}
      <section className="py-32 px-6 bg-[#080B10]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2 space-y-10">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tighter">Enter the Enterprise.</h2>
              <p className="text-lg text-gray-400 font-medium leading-relaxed">Secure access for both Administrative and Employee roles. Experience a unified environment where productivity meets precision.</p>
            </div>

            <div className="space-y-6">
              {[
                { icon: Lock, text: "End-to-end data encryption" },
                { icon: Monitor, text: "Optimized for all viewport sizes" },
                { icon: Briefcase, text: "Scalable for 10 to 10,000 employees" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-white font-bold text-sm tracking-wide uppercase">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 w-full max-w-lg">
            <div className="bg-[#111827] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <Lock className="h-12 w-12 text-white/[0.03]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">System Access</h3>
                <p className="text-sm text-gray-500">Pick your role and sign in to continue.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-center cursor-pointer hover:bg-blue-600/20 transition-all">
                  <div className="h-1 w-full bg-blue-500 mb-4 rounded-full" />
                  <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Admin</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center cursor-pointer hover:bg-white/10 transition-all">
                  <div className="h-1 w-full bg-white/10 mb-4 rounded-full" />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Employee</span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <Link to="/login" className="block">
                  <Button className="w-full h-14 bg-white text-black font-black text-base rounded-2xl group">
                    Proceed to Login
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/setup" className="block">
                  <Button variant="ghost" className="w-full h-14 text-gray-400 font-bold hover:text-white transition-colors">
                    Create Company Registry
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img src="/logo.jpg" alt="DayFlow Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-xl font-black text-white tracking-widest uppercase">DayFlow</span>
            </div>
            <p className="text-sm text-gray-500 font-medium tracking-tight">Enterprise Human Resource Management Systems.</p>
          </div>

          <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Compliance</a>
          </div>

          <p className="text-[11px] font-medium text-gray-600">
            © {new Date().getFullYear()} DAYFLOW CORP. INTELLECTUAL PROPERTY.
          </p>
        </div>
      </footer>
    </div>
  );
}
