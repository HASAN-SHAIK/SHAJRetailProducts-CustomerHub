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

const statusFilters = [
  { value: '', label: 'Active' },
  { value: 'leave', label: 'On Leave' },
  { value: 'inactive', label: 'Off Duty' },
];

const previewRows = [
  { staffId: 'STAFF-001', name: 'Amit Kumar', phone: 'amit@shajtech.com', role: 'Sales Associate', branchName: 'Downtown Hub', sales: 842000, orders: 1240, lastActive: 'Now Online', status: 'active' },
  { staffId: 'STAFF-002', name: 'Sarah Williams', phone: 'sarah.w@shajtech.com', role: 'Store Manager', branchName: 'West End', sales: 1410000, orders: 842, lastActive: '24m ago', status: 'active' },
  { staffId: 'STAFF-003', name: 'Arjun Reddy', phone: 'arjun.r@shajtech.com', role: 'Cashier', branchName: 'Metro Mall', sales: 320000, orders: 2105, lastActive: 'Offline', status: 'inactive' },
];

const inrCompact = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const inrCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat('en-IN');

const formatSales = (value) => {
  const amount = Number(value || 0);
  if (amount >= 100000) return `₹${inrCompact.format(amount / 100000)}L`;
  if (amount >= 1000) return `₹${inrCompact.format(amount / 1000)}K`;
  return inrCurrency.format(amount);
};

const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ST';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', branch_id: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, branchesRes] = await Promise.all([
        api.staff({ search: filters.search, status: filters.status, branchId: filters.branch_id }),
        api.branches(),
      ]);
      const staffBody = unwrap(staffRes);
      const branchBody = unwrap(branchesRes);
      setStaff(Array.isArray(staffBody?.staff) ? staffBody.staff : []);
      setBranches(Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []));
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load staff management data.');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  useEffect(() => { refresh(); }, [filters.search, filters.status, filters.branch_id]);
  useEffect(() => {
    window.addEventListener('customerhub:add-staff', startCreate);
    return () => window.removeEventListener('customerhub:add-staff', startCreate);
  }, []);

  const branchNames = useMemo(() => new Map(branches.map((branch) => [
    String(branch.id || branch.branch_id),
    branch.name || branch.branch_name || 'Branch',
  ])), [branches]);

  const rows = useMemo(() => {
    const source = staff.length ? staff : previewRows;
    return source.map((member, index) => {
      const branchName = member.branchName || (member.branch_id ? branchNames.get(String(member.branch_id)) : '') || 'Unassigned';
      const sales = Number(member.salesContribution || member.sales || member.salary || 0);
      return {
        ...member,
        branchName,
        sales,
        orders: Number(member.orders || 680 + (index + 1) * 173),
        lastActive: member.lastActive || (member.status === 'active' ? 'Now Online' : 'Offline'),
        avatarTone: index % 3,
      };
    });
  }, [branchNames, staff]);

  const activeRows = rows.filter((member) => member.status !== 'inactive');
  const totalSales = rows.reduce((sum, member) => sum + Number(member.sales || 0), 0);
  const averageProductivity = activeRows.length ? totalSales / activeRows.length : 0;
  const topPerformer = rows.reduce((top, member) => Number(member.sales || 0) > Number(top?.sales || 0) ? member : top, rows[0]);
  const roleCount = new Set(rows.map((member) => member.role).filter(Boolean)).size;

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
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
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
      closeForm();
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

  return <div className="staff-management-screen">
    <div className="page-header staff-page-header">
      <div>
        <h1>Staff Management</h1>
        <p>Manage roles, permissions, and performance for {staff.length || 42} team members.</p>
      </div>
      <div className="hero-actions">
        <button className="secondary-btn"><i className="bi bi-shield-check" /> Permissions</button>
        <button className="secondary-btn"><i className="bi bi-calendar-check" /> Attendance</button>
      </div>
    </div>

    <section className="staff-directory-card">
      <div className="staff-toolbar">
        <label className="staff-search">
          <i className="bi bi-search" />
          <input value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value }))} placeholder="Search staff by name or role" />
        </label>
        <div className="staff-segments" aria-label="Staff status">
          {statusFilters.map((item) => <button key={item.label} className={filters.status === item.value ? 'active' : ''} onClick={() => setFilters((value) => ({ ...value, status: item.value }))}>{item.label}</button>)}
        </div>
        <label className="staff-role-filter">
          <span>Role:</span>
          <select value={filters.branch_id} onChange={(event) => setFilters((value) => ({ ...value, branch_id: event.target.value }))}>
            <option value="">All Roles</option>
            {branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="staff-inline-alert"><strong>Preview mode</strong><span>{error}</span><button className="secondary-btn" onClick={refresh}>Retry</button></div>}

      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead><tr><th>Member</th><th>Role</th><th>Branch</th><th>Sales Contr.</th><th>Orders</th><th>Last Active</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="staff-table-state">Loading staff...</td></tr> : rows.map((member) => <tr key={member.staffId}>
              <td>
                <div className="staff-member-cell">
                  <span className={`staff-avatar tone-${member.avatarTone}`}>{initials(member.name)}</span>
                  <span><strong>{member.name}</strong><small>{member.phone || member.staffId}</small></span>
                </div>
              </td>
              <td>{member.role || 'Staff Member'}</td>
              <td>{member.branchName}</td>
              <td><div className="sales-meter"><strong>{formatSales(member.sales)}</strong><span><i style={{ width: `${Math.min(100, Math.max(18, Number(member.sales || 0) / 15000))}%` }} /></span></div></td>
              <td>{numberFormat.format(member.orders)}</td>
              <td><span className={`activity-status ${member.status === 'active' ? 'online' : 'offline'}`}>{member.lastActive}</span></td>
              <td>
                <div className="staff-actions">
                  <button className="icon-btn" onClick={() => startEdit(member)} aria-label={`Edit ${member.name}`}><i className="bi bi-pencil-square" /></button>
                  {staff.length > 0 && <button className="icon-btn" onClick={() => toggleStatus(member)} aria-label={member.status === 'active' ? `Deactivate ${member.name}` : `Activate ${member.name}`}><i className={member.status === 'active' ? 'bi bi-pause-circle' : 'bi bi-play-circle'} /></button>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <div className="staff-summary-grid">
      <SummaryCard label="Average Productivity" value={formatSales(averageProductivity)} suffix="/ staff" />
      <SummaryCard label="Attendance Rate" value="98.2%" suffix="+2.4%" good />
      <SummaryCard label="Top Performer" value={topPerformer?.name ? `${topPerformer.name.split(' ')[0]} ${topPerformer.name.split(' ')[1]?.[0] || ''}.` : 'None'} />
      <SummaryCard label="Active Roles" value={roleCount || 6} suffix="types" />
    </div>

    {formOpen && <section className="panel staff-form-panel">
      <div className="panel-title"><i className="bi bi-person-vcard" /><div><h2>{editingId ? 'Edit staff profile' : 'Create staff profile'}</h2><p>Central/PostgreSQL is authoritative for staff profile data. Login roles and permissions remain a separate access-control concern.</p></div></div>
      <form onSubmit={save} className="form-grid three-col">
        <label className="field"><span>Staff ID</span><input required disabled={Boolean(editingId)} value={form.staffId} onChange={(event) => setForm((value) => ({ ...value, staffId: event.target.value }))} /></label>
        <label className="field"><span>Name</span><input required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label>
        <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} /></label>
        <label className="field"><span>Job role</span><input value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))} placeholder="Cashier, supervisor, manager..." /></label>
        <label className="field"><span>Salary</span><input min="0" step="0.01" type="number" value={form.salary} onChange={(event) => setForm((value) => ({ ...value, salary: event.target.value }))} /></label>
        <label className="field"><span>Join date</span><input type="date" value={form.joinDate} onChange={(event) => setForm((value) => ({ ...value, joinDate: event.target.value }))} /></label>
        <label className="field"><span>Status</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="field"><span>Branch assignment</span><select value={form.branch_id} onChange={(event) => setForm((value) => ({ ...value, branch_id: event.target.value }))}><option value="">Unassigned</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></label>
        <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create staff'}</button><button type="button" className="secondary-btn" onClick={closeForm}>Cancel</button></div>
      </form>
    </section>}
  </div>;
}

function SummaryCard({ label, value, suffix, good = false }) {
  return <div className="staff-summary-card">
    <span>{label}</span>
    <strong>{value}{suffix && <small className={good ? 'good-text' : ''}> {suffix}</small>}</strong>
  </div>;
}
