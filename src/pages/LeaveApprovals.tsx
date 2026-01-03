import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';

interface LeaveRequest {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string | null;
  is_half_day: boolean;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export default function LeaveApprovals() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, profiles!inner(first_name, last_name, employee_id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave requests:', error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdating(id);
    const { error } = await supabase
      .from('leave_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update request. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Request ${status}.`,
      });
      fetchRequests();
    }
    setUpdating(null);
  };

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
          <CardTitle className="text-lg font-semibold">All Leave Requests</CardTitle>
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
                  <TableHead className="uppercase text-xs font-semibold">Employee</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Leave Type</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">From</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">To</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Reason</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Status</TableHead>
                  <TableHead className="uppercase text-xs font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.profiles.first_name} {request.profiles.last_name}</p>
                        <p className="text-xs text-muted-foreground">{request.profiles.employee_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{request.leave_type} Leave</TableCell>
                    <TableCell>{format(new Date(request.from_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(request.to_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{request.reason || '-'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-[hsl(145,63%,49%)] hover:bg-[hsl(145,63%,44%)]"
                            onClick={() => updateStatus(request.id, 'approved')}
                            disabled={updating === request.id}
                          >
                            {updating === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => updateStatus(request.id, 'rejected')}
                            disabled={updating === request.id}
                          >
                            {updating === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
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
