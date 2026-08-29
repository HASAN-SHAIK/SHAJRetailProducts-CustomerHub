import React, { useState } from 'react';
import { api } from '../lib/api';

const blank = { name: '', email: '', password: '', role: 'cashier', access: 'branch', branch_id: '' };
const roleOptions = ['cashier', 'manager', 'staff', 'admin'];
const titleCase = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function UserCreateForm({ branches, onCreated, busy, setBusy, setMessage }) {
  const [form, setForm] = useState(blank);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const admin = form.role === 'admin';
      const all = admin || form.access === 'all';
      await api.createUser({
        name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role,
        all_branch_access: all, branch_id: all ? null : form.branch_id,
      });
      setForm({ ...blank, branch_id: String(branches?.[0]?.id || '') });
      await onCreated();
      setMessage('Login user created.');
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.response?.data?.error || 'Unable to create user.');
    } finally { setBusy(false); }
  };

  return <form className="panel" onSubmit={submit}>
    <div className="panel-title"><i className="bi bi-person-plus"/><div><h2>Add login user</h2><p>Create an administrator or a store-scoped staff login.</p></div></div>
    <div className="form-grid">
      <label className="field"><span>Name</span><input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label>
      <label className="field"><span>Email</span><input required type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label>
      <label className="field"><span>Temporary password</span><input required minLength={8} type="password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></label>
      <label className="field"><span>Role</span><select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value,access:e.target.value==='admin'?'all':form.access})}>{roleOptions.map((role)=><option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
      {form.role!=='admin' && <label className="field"><span>Store access</span><select value={form.access==='all'?'all':form.branch_id} onChange={(e)=>setForm({...form,access:e.target.value==='all'?'all':'branch',branch_id:e.target.value==='all'?'':e.target.value})}><option value="all">All stores</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name||b.branch_name||b.id}</option>)}</select></label>}
    </div>
    <div className="form-actions"><span>Backend hashes the password; the Hub never reads it back.</span><button className="primary-btn" disabled={busy}>{busy?'Working…':'Create user'}</button></div>
  </form>;
}
