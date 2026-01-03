import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Search, DollarSign, Users, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import SalaryStructureManager from "@/components/payroll/SalaryStructureManager";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string | null;
  basic_salary: number | null;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  paid_date: string | null;
  remarks: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
    department: string | null;
  };
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminPayroll() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    basic_salary: '',
    allowances: '0',
    deductions: '0',
    remarks: '',
  });

  const [activeTab, setActiveTab] = useState("process");
  const [selectedEmployeeForConfig, setSelectedEmployeeForConfig] = useState<Employee | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchPayrollRecords();
    fetchEmployees();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payroll')
      .select(`
        *,
        profiles:employee_id (
          first_name,
          last_name,
          employee_id,
          department
        )
      `)
      .eq('month', parseInt(selectedMonth))
      .eq('year', parseInt(selectedYear))
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayrollRecords(data as PayrollRecord[]);
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    // Fetch all profiles and filter in JS for maximum reliability
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name');

    if (error) {
      console.error('Error fetching employees:', error);
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
      return;
    }

    if (data) {
      // Robust filtering: EXCLUDE Admins by role OR employee_id OR email
      const filteredEmployees = (data as any[]).filter(emp =>
        emp.role !== 'admin' &&
        emp.employee_id !== 'ADMIN-001' &&
        emp.email !== 'admin@daysflow.com'
      );

      console.log('Fetched total profiles:', data.length);
      console.log('Filtered employees for configuration:', filteredEmployees.length);
      setEmployees(filteredEmployees);
    }
  };

  const handleCreatePayroll = async () => {
    if (!formData.employee_id) {
      toast({ title: 'Error', description: 'Please select an employee', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('payroll').insert({
      employee_id: formData.employee_id,
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      basic_salary: parseFloat(formData.basic_salary) || 0,
      allowances: parseFloat(formData.allowances) || 0,
      deductions: parseFloat(formData.deductions) || 0,
      status: 'draft',
    });

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'Payroll already exists for this employee and month', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Success', description: 'Payroll record created' });
      setIsDialogOpen(false);
      setFormData({ employee_id: '', basic_salary: '', allowances: '0', deductions: '0', remarks: '' });
      fetchPayrollRecords();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updateData: { status: string; paid_date?: string | null } = { status: newStatus };
    if (newStatus === 'paid') {
      updateData.paid_date = new Date().toISOString().split('T')[0];
    } else {
      updateData.paid_date = null;
    }

    const { error } = await supabase
      .from('payroll')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Status updated' });
      fetchPayrollRecords();
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setFormData({
      ...formData,
      employee_id: employeeId,
      basic_salary: employee?.basic_salary?.toString() || '0',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'processed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredRecords = payrollRecords.filter(record =>
    record.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.profiles?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats
  const totalPayroll = payrollRecords.reduce((sum, r) => sum + Number(r.net_salary), 0);
  const paidCount = payrollRecords.filter(r => r.status === 'paid').length;
  const pendingCount = payrollRecords.filter(r => r.status !== 'paid').length;

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout title="Payroll Management">
      <div className="max-w-7xl mx-auto space-y-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-12">
            <TabsList className="inline-flex h-12 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-auto min-w-[450px] shadow-sm">
              <TabsTrigger
                value="process"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-10 py-2.5 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md"
              >
                Process Monthly Payroll
              </TabsTrigger>
              <TabsTrigger
                value="salary"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-10 py-2.5 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md"
              >
                Manage Salary Structures
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="process" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Payroll</CardTitle>
                  <div className="bg-primary/10 p-2 rounded-full">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-primary">{formatCurrency(totalPayroll)}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    For {months[parseInt(selectedMonth) - 1]} {selectedYear}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Records</CardTitle>
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-blue-700">{payrollRecords.length}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Employees processed</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Paid</CardTitle>
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-green-700">{paidCount}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Completed payments</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pending</CardTitle>
                  <div className="bg-orange-100 p-2 rounded-full">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-orange-700">{pendingCount}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Awaiting payment</p>
                </CardContent>
              </Card>
            </div>

            {/* Payroll Table */}
            <Card className="shadow-md border-muted/60 overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-muted">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Payroll Records</CardTitle>
                    <CardDescription>View and manage monthly payroll for your employees.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-44 lg:w-64 bg-background border-muted-foreground/20 focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center bg-background border border-muted-foreground/20 rounded-md p-1 shadow-sm">
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[110px] border-none shadow-none h-8 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Separator orientation="vertical" className="h-4 mx-1" />
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[80px] border-none shadow-none h-8 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} className="shadow-sm font-bold">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Record
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Loading payroll records...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-24 px-6">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                      <DollarSign className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                    <h3 className="text-lg font-bold">No Records Found</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                      There are no payroll records for {months[parseInt(selectedMonth) - 1]} {selectedYear}. Click "Add Record" to create one.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-b border-muted">
                          <TableHead className="font-bold py-4">Employee</TableHead>
                          <TableHead className="font-bold">ID / Dept</TableHead>
                          <TableHead className="text-right font-bold">Basic</TableHead>
                          <TableHead className="text-right font-bold">Allowances</TableHead>
                          <TableHead className="text-right font-bold">Deductions</TableHead>
                          <TableHead className="text-right font-bold">Net Salary</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                          <TableHead className="text-right font-bold px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id} className="hover:bg-muted/30 transition-colors border-b border-muted/60">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {record.profiles?.first_name?.[0]}{record.profiles?.last_name?.[0]}
                                </div>
                                <span className="font-bold text-sm">
                                  {record.profiles?.first_name} {record.profiles?.last_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-medium">{record.profiles?.employee_id}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{record.profiles?.department || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(record.basic_salary)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">+{formatCurrency(record.allowances)}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">-{formatCurrency(record.deductions)}</TableCell>
                            <TableCell className="text-right">
                              <span className="font-black text-primary text-base">
                                {formatCurrency(record.net_salary)}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell className="text-right px-6">
                              <Select
                                value={record.status}
                                onValueChange={(value) => handleStatusChange(record.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8 bg-background shadow-sm text-xs font-bold ml-auto focus:ring-primary">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                                  <SelectItem value="processed" className="text-xs">Processed</SelectItem>
                                  <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create Payroll Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payroll Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={formData.employee_id} onValueChange={handleEmployeeSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Input value={months[parseInt(selectedMonth) - 1]} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input value={selectedYear} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Basic Salary (₹)</Label>
                    <Input
                      type="number"
                      value={formData.basic_salary}
                      onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Allowances (₹)</Label>
                      <Input
                        type="number"
                        value={formData.allowances}
                        onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deductions (₹)</Label>
                      <Input
                        type="number"
                        value={formData.deductions}
                        onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreatePayroll} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Record
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="salary" className="space-y-6">
            {!selectedEmployeeForConfig ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-center max-w-2xl mx-auto space-y-4 py-8">
                  <h2 className="text-3xl font-bold tracking-tight">Employee Salary Configuration</h2>
                  <p className="text-muted-foreground">
                    Select an employee from the directory below to define and manage their monthly salary structure, components, and bank details.
                  </p>
                  <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or employee ID..."
                      className="pl-10 h-12 text-lg shadow-sm border-primary/20 focus:border-primary transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {employees.filter(emp =>
                    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length > 0 ? (
                    employees
                      .filter(emp =>
                        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((emp) => (
                        <Card
                          key={emp.id}
                          className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden border-muted/60"
                          onClick={() => setSelectedEmployeeForConfig(emp)}
                        >
                          <CardHeader className="p-4 bg-muted/30 group-hover:bg-primary/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {emp.first_name[0]}{emp.last_name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-bold truncate">{emp.first_name} {emp.last_name}</CardTitle>
                                <CardDescription className="text-xs truncate">{emp.employee_id}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 flex flex-col gap-3">
                            {emp.department && (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] bg-muted/50 border-transparent">
                                  {emp.department}
                                </Badge>
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="w-full mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                              Configure Salary
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                  ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-2xl border border-dashed border-muted">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground opacity-20" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">No Employees Found</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          We couldn't find any employees matching your criteria. Make sure you have created employee accounts first.
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => window.location.href = '/create-employee'}>
                        Add New Employee
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmployeeForConfig(null)}
                      className="hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 rotate-45 mr-1" /> Back to Directory
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-muted-foreground">Configuring Salary for:</span>
                      <span className="font-bold text-primary">{selectedEmployeeForConfig.first_name} {selectedEmployeeForConfig.last_name}</span>
                      <Badge variant="outline" className="ml-2 font-mono h-5 py-0">{selectedEmployeeForConfig.employee_id}</Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-background rounded-xl border shadow-sm">
                  <SalaryStructureManager
                    employeeId={selectedEmployeeForConfig.id}
                    employeeName={`${selectedEmployeeForConfig.first_name} ${selectedEmployeeForConfig.last_name}`}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
