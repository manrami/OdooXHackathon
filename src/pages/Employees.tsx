import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  employee_id: string;
  department: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function Employees() {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<(Profile & { role?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchEmployees = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.data && rolesRes.data) {
        const rolesMap = new Map(rolesRes.data.map((r: UserRole) => [r.user_id, r.role]));
        const enriched = profilesRes.data.map((emp: Profile) => ({
          ...emp,
          role: rolesMap.get(emp.id) || 'employee',
        }));
        setEmployees(enriched);
      }
      setLoading(false);
    };

    fetchEmployees();
  }, []);

  return (
    <DashboardLayout>
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No employees found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="uppercase text-xs font-semibold">Employee ID</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Name</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Email</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Department</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employee_id}</TableCell>
                    <TableCell>{employee.first_name} {employee.last_name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell className="capitalize">{employee.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
