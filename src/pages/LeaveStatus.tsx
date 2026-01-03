import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string | null;
  is_half_day: boolean;
  status: string;
  created_at: string;
}

export default function LeaveStatus() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    };

    fetchRequests();
  }, [profile]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="status-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected">Rejected</Badge>;
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">My Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No leave requests found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="uppercase text-xs font-semibold">Leave Type</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">From Date</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">To Date</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Reason</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="capitalize font-medium">{request.leave_type} Leave</TableCell>
                    <TableCell>{format(new Date(request.from_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(request.to_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{request.reason || '-'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
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
