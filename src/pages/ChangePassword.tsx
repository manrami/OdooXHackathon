import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const passwordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function ChangePassword() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validation = passwordSchema.safeParse(formData);
        if (!validation.success) {
            toast({
                title: 'Validation Error',
                description: validation.error.errors[0].message,
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        try {
            // Update password and clear the force_password_change flag
            const { error } = await supabase.auth.updateUser({
                password: formData.password,
                data: { force_password_change: false }
            });

            if (error) throw error;

            toast({
                title: 'Password Updated',
                description: 'You can now access your dashboard.',
            });

            navigate('/dashboard');

        } catch (error: any) {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
            <div className="w-full max-w-md">
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Security Update</h1>
                    <p className="text-muted-foreground">Please change your temporary password</p>
                </div>

                <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                            <Lock className="w-6 h-6 text-orange-600" />
                        </div>
                        <CardTitle className="text-center">Change Password</CardTitle>
                        <CardDescription className="text-center">
                            For your security, you must update your password before continuing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password & Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
