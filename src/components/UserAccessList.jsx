import React, { useMemo } from 'react';
import { api } from '../lib/api';

export default function UserAccessList({ users, branches, reload, busy, setBusy, setMessage }) {
  const branchNames = useMemo(() => Object.fromEntries(branches.map((b)=>[String(b.id),b.name||b.branch_name||b.id])), [branches]);
  const roleChange = async (user, role) => {
    setBusy(true); setMessage('');
    try { await api.updateUserRole(user.id, role); await reload(); setMessage('User role updated.'); }
    catch (error) { setMessage(error?.response?.data?.message || error?.response?.data?.error || 'Unable to update role.'); }
    finally { setBusy(false); }
  };
  const accessChange = async (user, value) => {
    setBusy(true); setMessage('');
    try {
      await api.updateUserAccess(user.id, value==='all'?{all_branch_access:true,branch_id:null}:{all_branch_access:false,branch_id:value});
      await reload(); setMessage('Store access updated.');
    } catch (error) { setMessage(error?.response?.data?.message || error?.response?.data?.error || 'Unable to update store access.'); }
    finally { setBusy(false); }
  };

  if (!users.length && !busy) return <div className="empty-state"><i className="bi bi-people"/><strong>No users found</strong><span>Create the first additional store login above.</span></div>;
  return <div className="user-list">{users.map((user)=>{
    const access = user.all_branch_access!==false?'all':String(user.branch_id||'');
    return <div className="user-access-row" key={user.id}>
      <div className="user-identity"><div className="avatar">{String(user.name||user.email||'U').slice(0,1).toUpperCase()}</div><div><strong>{user.name||'Unnamed user'}</strong><span>{user.email}</span></div></div>
      <label className="field"><span>Role</span><select value={user.role||'staff'} disabled={busy} onChange={(e)=>roleChange(user,e.target.value)}><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>
      <label className="field"><span>Store access</span><select value={user.role==='admin'?'all':access} disabled={busy||user.role==='admin'} onChange={(e)=>accessChange(user,e.target.value)}><option value="all">All stores</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.name||b.branch_name||b.id}</option>)}</select></label>
      <div className="user-meta"><span>{user.all_branch_access!==false?'All stores':branchNames[String(user.branch_id)]||'Branch restricted'}</span><small>Created {user.created_at?new Date(user.created_at).toLocaleDateString():'—'}</small></div>
    </div>;
  })}</div>;
}
