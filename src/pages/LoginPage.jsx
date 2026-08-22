import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await login(form); } catch (err) { setError(err?.response?.data?.message || 'Unable to sign in.'); } finally { setBusy(false); }
  };
  return <div className="login-screen"><div className="login-card">
    <div className="login-brand"><div className="brand-mark large">S</div><div><h1>SHAJ Retail Hub</h1><p>Manage your business, stores & POS.</p></div></div>
    <form onSubmit={submit} className="login-form">
      <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="owner@business.com" /></label>
      <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>
      {error && <div className="alert danger">{error}</div>}
      <button className="primary-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <div className="login-meta"><span><i className="bi bi-shield-check" /> Tenant isolated</span><span><i className="bi bi-wifi-off" /> Offline aware</span><span><i className="bi bi-pc-display" /> POS connected</span></div>
  </div></div>;
}
