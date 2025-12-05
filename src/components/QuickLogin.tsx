import React, { useState } from 'react';
import { supabase } from '../utils/supabase/info';

type Props = {
  onLoginSuccess: (token: string) => void;
};

export default function QuickLogin({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message || 'Sign in failed');
        setLoading(false);
        return;
      }
      if (data?.session?.access_token) {
        onLoginSuccess(data.session.access_token);
      } else {
        setError('No token returned');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999, background: 'white', padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Plain login (fallback)</div>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 6 }}>
          <label style={{ display: 'block', fontSize: 12 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: 240 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12 }}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" style={{ width: 240 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: '6px 10px' }}>{loading ? 'Signing...' : 'Sign in'}</button>
        </div>
        {/* Remove error display for production */}
      </form>
    </div>
  );
}
