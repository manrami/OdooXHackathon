import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

export default function EmergencySetup() {
    const { toast } = useToast();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const runRecovery = async () => {
        setStatus('loading');
        setLogs([]);
        addLog("Starting Emergency Recovery...");

        try {
            const email = 'admin@daysflow.com';
            const password = 'admin123';

            // 1. Try Login first
            addLog("Attempting to Login as Admin...");
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (loginData.session) {
                addLog("SUCCESS: Admin account exists and login worked!");
                addLog("Referencing 'profiles'...");

                // Ensure profile exists
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: loginData.user.id,
                        email: email,
                        role: 'admin',
                        first_name: 'System',
                        last_name: 'Admin',
                        employee_id: 'ADMIN-001'
                    });

                if (profileError) addLog(`Warning: Profile update failed: ${profileError.message}`);
                else addLog("Profile verified.");

                setStatus('success');
                return;
            }

            // 2. If Login failed, try SignUp (Restoration)
            addLog(`Login failed (${loginError?.message}). Attempting to CREATE Admin...`);

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'admin',
                        first_name: 'System',
                        last_name: 'Admin'
                    }
                }
            });

            if (signUpError) {
                throw signUpError;
            }

            if (signUpData.session) {
                addLog("SUCCESS: Admin created and logged in immediately!");
                // Ensure profile exists
                await supabase.from('profiles').upsert({
                    id: signUpData.user?.id,
                    email: email,
                    role: 'admin',
                    first_name: 'System',
                    last_name: 'Admin',
                    employee_id: 'ADMIN-001'
                });
                setStatus('success');
            } else if (signUpData.user && !signUpData.session) {
                addLog("CRITICAL: Admin created but Email Confirmation is REQUIRED.");
                addLog("You must disable 'Confirm Email' in Supabase Settings or check the fake email.");
                setStatus('error');
            }

        } catch (error: any) {
            addLog(`ERROR: ${error.message}`);
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-destructive/10 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-destructive/50 shadow-xl">
                <CardHeader className="bg-destructive/5 border-b">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-6 w-6" />
                        Emergency Admin Recovery
                    </CardTitle>
                    <CardDescription>
                        Attempt to restore Admin Access (`admin@daysflow.com` / `admin123`)
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="bg-black/90 text-green-400 p-4 rounded-md font-mono text-xs h-64 overflow-y-auto">
                        {logs.length === 0 ? "> Ready to start..." : logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>

                    <Button
                        className="w-full h-12 text-lg font-bold"
                        variant={status === 'success' ? "default" : "destructive"}
                        onClick={runRecovery}
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? "Running Recovery..." : "Run Recovery Script"}
                    </Button>

                    {status === 'success' && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded border border-green-200">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-semibold">Success! You can now go to /login</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
