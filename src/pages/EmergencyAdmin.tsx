import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmergencyAdmin() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleCreateAdmin = async () => {
        setStatus('loading');
        setMessage('');

        try {
            // 1. Try to Sign Up
            const { data, error } = await supabase.auth.signUp({
                email: 'admin@daysflow.com',
                password: 'admin123',
                options: {
                    data: {
                        first_name: 'Admin',
                        last_name: 'User',
                        role: 'admin',
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    throw new Error('User already exists! Please DELETE "admin@daysflow.com" from your Supabase Dashboard > Authentication > Users list, then try this button again.');
                }
                throw error;
            }

            if (data.user) {
                // 2. Ensure Profile Exists (Trigger might handle it, but we double check)
                // Wait a sec for trigger
                await new Promise(r => setTimeout(r, 2000));

                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        email: 'admin@daysflow.com',
                        role: 'admin',
                        employee_id: 'ADMIN-001',
                        first_name: 'Admin',
                        last_name: 'User'
                    });

                if (profileError) {
                    console.error('Profile update warning:', profileError);
                    // Don't fail the whole process if just profile update failed, but warn
                }

                setStatus('success');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-destructive/5 p-4">
            <Card className="max-w-md w-full shadow-xl border-destructive/20">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-6 h-6 text-destructive" />
                    </div>
                    <CardTitle className="text-xl">Emergency Admin Setup</CardTitle>
                    <CardDescription>
                        Use this tool if you cannot login as Admin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm">
                        <strong>Before clicking:</strong> If 'admin@daysflow.com' already exists in your Supabase Dashboard,
                        <span className="font-bold underline"> delete it manually first</span>.
                    </div>

                    {status === 'error' && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded flex items-start gap-2">
                            <XCircle className="w-5 h-5 shrink-0" />
                            <p>{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="bg-green-50 text-green-700 text-sm p-3 rounded flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            <div>
                                <p className="font-semibold">Admin Created Successfully!</p>
                                <p>Email: admin@daysflow.com</p>
                                <p>Password: admin123</p>
                                <p className="mt-2 text-xs text-muted-foreground">Note: If login fails with "Email not confirmed", go to Supabase Dashboard and Confirm the user manually.</p>
                            </div>
                        </div>
                    )}

                    <Button
                        className="w-full"
                        variant="destructive"
                        onClick={handleCreateAdmin}
                        disabled={status === 'loading' || status === 'success'}
                    >
                        {status === 'loading' ? 'Creating...' : 'Create Admin Account'}
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">Go to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
