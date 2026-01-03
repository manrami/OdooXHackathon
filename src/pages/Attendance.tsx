import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Calendar, Clock, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  is_half_day: boolean;
  marked_at: string;
}

export default function Attendance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayMarked, setTodayMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchAttendance = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .order('date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching attendance:', error);
    } else {
      setRecords(data || []);
      setTodayMarked(data?.some(r => r.date === today) || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, [profile]);

  const markAttendance = async () => {
    if (!profile || todayMarked) return;

    setMarking(true);
    const { error } = await supabase.from('attendance').insert({
      employee_id: profile.id,
      date: today,
      status: 'present',
    });
    setMarking(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark attendance. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Attendance marked as present.',
      });
      fetchAttendance();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Mark Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <Button
                onClick={markAttendance}
                disabled={marking || todayMarked}
                className={todayMarked ? 'bg-muted text-muted-foreground' : 'bg-[hsl(145,63%,49%)] hover:bg-[hsl(145,63%,44%)]'}
              >
                {marking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {todayMarked ? 'Attendance Marked' : 'Mark Present'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="uppercase text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                    </TableHead>
                    <TableHead className="uppercase text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time
                      </div>
                    </TableHead>
                    <TableHead className="uppercase text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4" />
                        Status
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(record.marked_at), 'h:mm a')}</TableCell>
                      <TableCell>
                        <Badge className={record.status === 'present' ? 'status-present' : 'status-absent'}>
                          {record.status === 'present' ? 'Present' : 'Absent'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
