import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';

const EMPTY_FORM = {
  staffId: '',
  name: '',
  phone: '',
  role: '',
  salary: '',
  joinDate: '',
  status: 'active',
  branch_id: '',
};

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', branch_id: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, branchesRes] = await Promise.all([
        api.staff(filters),
        api.branches(),
      ]);
      const staffBody = unwrap(staffRes);
      const branchBody = unwrap(branchesRes);
      setStaff(Array.isArray(staffBody?.staff) ? staffBody.staff : []);
      setBranches(Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []));
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load staff management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [filters.search, filters.status, filters.branch_id]);

  const branchNames = useMemo(() => new Map(branches.map((branch) => [String(branch.id || branch.branch_id), branch.name || branch.branch_name || 'Branch'])), [branches]);

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (member) => {
    setEditingId(member.staffId);
    setForm({
      staffId: member.staffId || '',
      name: member.name || '',
      phone: member.phone || '',
      role: member.role || '',
      salary: member.salary ?? '',
      joinDate: member.joinDate ? String(member.joinDate).slice(0, 10) : '',
      status: member.status || 'active',
      branch_id: member.branch_id || '',
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      staffId: form.staffId.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      role: form.role.trim() || null,
      salary: form.salary === '' ? null : Number(form.salary),
      joinDate: form.joinDate || null,
      status: form.status,
      branch_id: form.branch_id || null,
    };
    try {
      if (editingId) await api.updateStaff(editingId, payload);
      else await api.createStaff(payload);
      startCreate();
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || `Unable to ${editingId ? 'update' : 'create'} staff profile.`);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    setError('');
    try {
      await api.updateStaff(member.staffId, { status: nextStatus });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update staff status.');
    }
  };

  return <div className="page-stack">
    <section className="hero-panel">
      <div><span className="eyebrow">People & access</span><h1>Staff management</h1><p>Manage canonical staff profiles, employment status and branch assignment. Login roles and permissions remain a separate access-control concern.</p></div>
      <div className="hero-actions"><button className="secondary-btn" onClick={refresh}><i className="bi bi-arrow-clockwise"/> Refresh</button><button className="primary-btn" onClick={startCreate}><i className="bi bi-person-plus"/> New staff</button></div>
    </section>

    <section className="panel">
      <div className="panel-title"><i className="bi bi-funnel"/><div><h2>Staff directory</h2><p>Central/PostgreSQL is authoritative for staff profile data.</p></div></div>
      <div className="form-grid three-col">
        <label><span>Search</span><input value={filters.search} onChange={(e) => setFilters(v => ({ ...v, search: e.target.value }))} placeholder="Name, phone or staff ID" /></label>
        <label><span>Status</span><select value={filters.status} onChange={(e) => setFilters(v => ({ ...v, status: e.target.value }))}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label><span>Branch</span><select value={filters.branch_id} onChange={(e) => setFilters(v => ({ ...v, branch_id: e.target.value }))}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></label>
      </div>
      {error && <div className="state-card bad"><strong>Staff data unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={refresh}>Retry</button></div>}
      {loading ? <div className="state-card"><strong>Loading staff…</strong></div> : staff.length === 0 ? <div className="state-card"><strong>No staff profiles found</strong><span>Change the filters or create the first staff profile.</span></div> : <div className="table-wrap"><table><thead><tr><th>Staff</th><th>Job role</th><th>Branch</th><th>Status</th><th>Salary</th><th>Actions</th></tr></thead><tbody>{staff.map((member) => <tr key={member.staffId}><td><strong>{member.name}</strong><br/><small>{member.staffId}{member.phone ? ` · ${member.phone}` : ''}</small></td><td>{member.role || '—'}</td><td>{member.branch_id ? (branchNames.get(String(member.branch_id)) || member.branch_id) : 'Unassigned'}</td><td><span className={`status-pill ${member.status === 'active' ? 'live' : 'future'}`}>{member.status || 'active'}</span></td><td>{member.salary == null ? '—' : new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(member.salary)}</td><td><div className="row-actions"><button className="secondary-btn" onClick={() => startEdit(member)}>Edit</button><button className="secondary-btn" onClick={() => toggleStatus(member)}>{member.status === 'active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div>}
    </section>

    <section className="panel">
      <div className="panel-title"><i className="bi bi-person-vcard"/><div><h2>{editingId ? 'Edit staff profile' : 'Create staff profile'}</h2><p>Employment profile fields are distinct from RetailHub user/login permissions.</p></div></div>
      <form onSubmit={save} className="form-grid three-col">
        <label><span>Staff ID</span><input required disabled={Boolean(editingId)} value={form.staffId} onChange={(e) => setForm(v => ({ ...v, staffId:e.target.value }))}/></label>
        <label><span>Name</span><input required value={form.name} onChange={(e) => setForm(v => ({ ...v, name:e.target.value }))}/></label>
        <label><span>Phone</span><input value={form.phone} onChange={(e) => setForm(v => ({ ...v, phone:e.target.value }))}/></label>
        <label><span>Job role</span><input value={form.role} onChange={(e) => setForm(v => ({ ...v, role:e.target.value }))} placeholder="Cashier, supervisor, manager…"/></label>
        <label><span>Salary</span><input min="0" step="0.01" type="number" value={form.salary} onChange={(e) => setForm(v => ({ ...v, salary:e.target.value }))}/></label>
        <label><span>Join date</span><input type="date" value={form.joinDate} onChange={(e) => setForm(v => ({ ...v, joinDate:e.target.value }))}/></label>
        <label><span>Status</span><select value={form.status} onChange={(e) => setForm(v => ({ ...v, status:e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label><span>Branch assignment</span><select value={form.branch_id} onChange={(e) => setForm(v => ({ ...v, branch_id:e.target.value }))}><option value="">Unassigned</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></label>
        <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create staff'}</button>{editingId && <button type="button" className="secondary-btn" onClick={startCreate}>Cancel</button>}</div>
      </form>
    </section>
  </div>;
}
