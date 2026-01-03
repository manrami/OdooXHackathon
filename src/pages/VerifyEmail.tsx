import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pendingVerificationEmail');
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleResend = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to resend verification.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Could not resend verification email. Please try again.',
        variant: 'destructive',
      });
    } else {
      setResent(true);
      toast({
        title: 'Email Sent!',
        description: 'Verification email has been resent. Please check your inbox.',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
            {resent ? (
              <CheckCircle className="h-8 w-8 text-[hsl(145,63%,49%)]" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-semibold">Verify Your Email</CardTitle>
          <CardDescription className="text-base">
            We've sent a verification link to your email address. Please check your inbox (and spam folder) and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or click below to resend.
          </p>
          
          <Button 
            onClick={handleResend} 
            disabled={loading}
            className="w-full h-11 font-medium"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend Verification Email
          </Button>
          
          <div className="pt-4 border-t">
            <Link to="/login" className="text-sm text-primary font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
