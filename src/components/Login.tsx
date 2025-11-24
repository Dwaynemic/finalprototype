import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import logo from '../petlogo.jpg';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Heart, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

type LoginProps = {
  onLoginSuccess: (token: string) => void;
  onSwitchToRegister: () => void;
};

export function Login({ onLoginSuccess, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.session?.access_token) {
        onLoginSuccess(data.session.access_token);
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-1 w-24 h-24  bg-primary overflow-hidden flex items-center justify-center shadow-lg">
            <img src={logo} alt="Pethouse Logo" className="w-full h-full object-cover object-center transform scale-110"/>
          </div>
          <p className="text-muted-foreground">Veterinary Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Don't have an account? Register
                </button>
              </div>
            </form>

            {/* Demo accounts removed for production */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}