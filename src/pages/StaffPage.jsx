import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, unwrap } from '../lib/api';

const EMPTY_FORM = {
  staffId: '',
  name: '',
  phone: '',
  role: 'Cashier',
  salary: '',
  joinDate: '',
  status: 'active',
  branch_id: '',
};

const EMPTY_USER_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'cashier',
  access: 'branch',
  branch_id: '',
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

const EMPTY_SALARY_FORM = {
  salaryId: '',
  staffId: '',
  month: currentMonth(),
  baseSalary: '',
  bonus: 0,
  deductions: 0,
  paidAmount: 0,
  branch_id: '',
};

const statusFilters = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Off Duty' },
];

const loginRoles = ['admin', 'manager', 'cashier', 'staff'];
const staffRoles = ['Cashier', 'Store Manager', 'Inventory Lead', 'Sales Associate', 'Floor Supervisor', 'Purchase Clerk', 'Returns Desk', 'Dispatch Associate'];
const inrCompact = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const inrCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat('en-IN');

const createLocalId = () => globalThis.crypto?.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
  (Number(char) ^ Math.random() * 16 >> Number(char) / 4).toString(16)
);

const formatSales = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const amount = Number(value);
  if (amount >= 100000) return `₹${inrCompact.format(amount / 100000)}L`;
  if (amount >= 1000) return `₹${inrCompact.format(amount / 1000)}K`;
  return inrCurrency.format(amount);
};

const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ST';
const titleCase = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const idsEqual = (a, b) => String(a || '') === String(b || '');
const getBranchId = (member) => member?.branch_id || member?.branchId || '';
const isAllBranchAccess = (member) =>
  member?.all_branch_access === true ||
  member?.allBranchAccess === true ||
  (member?.source === 'Login user' && !getBranchId(member) && member?.all_branch_access !== false);

const resolveMode = (propMode, pathname) => {
  if (propMode) return propMode;
  if (pathname.endsWith('/new')) return 'new';
  if (pathname.endsWith('/edit')) return 'edit';
  if (pathname.endsWith('/salary')) return 'salary';
  if (pathname.endsWith('/branch-assignment')) return 'branch-assignment';
  if (pathname.endsWith('/roles-status')) return 'roles-status';
  if (pathname.endsWith('/expenses')) return 'expenses';
  if (pathname.endsWith('/performance')) return 'performance';
  return 'list';
};

export default function StaffPage({ mode: propMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = resolveMode(propMode, location.pathname);
  const [staff, setStaff] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [salaryRows, setSalaryRows] = useState([]);
  const [staffExpenses, setStaffExpenses] = useState([]);
  const [performance, setPerformance] = useState({ rows: [], summary: {} });
  const [filters, setFilters] = useState({ search: '', status: 'active', branch_id: '' });
  const [staffMonth, setStaffMonth] = useState(currentMonth());
  const [form, setForm] = useState(EMPTY_FORM);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [salaryForm, setSalaryForm] = useState(EMPTY_SALARY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, branchesRes, usersRes, salariesRes, expensesRes, performanceRes] = await Promise.all([
        api.staff({ search: filters.search, status: filters.status, branchId: filters.branch_id }),
        api.branches(),
        api.users(),
        api.staffSalaries({ month: staffMonth, branchId: filters.branch_id }),
        api.expenses({ type: 'staff', branchId: filters.branch_id, limit: 500 }),
        api.staffPerformance({ month: staffMonth, branchId: filters.branch_id }),
      ]);
      const staffBody = unwrap(staffRes);
      const branchBody = unwrap(branchesRes);
      const usersBody = unwrap(usersRes);
      const salariesBody = unwrap(salariesRes);
      const expensesBody = unwrap(expensesRes);
      const performanceBody = unwrap(performanceRes);
      const branchRows = Array.isArray(branchBody) ? branchBody : (branchBody?.branches || branchBody?.data?.branches || []);
      setStaff(Array.isArray(staffBody?.staff) ? staffBody.staff : []);
      setBranches(branchRows);
      setUsers(Array.isArray(usersBody?.users) ? usersBody.users : []);
      setSalaryRows(Array.isArray(salariesBody?.salaries) ? salariesBody.salaries : []);
      setStaffExpenses(Array.isArray(expensesBody?.expenses) ? expensesBody.expenses : []);
      setPerformance({
        rows: Array.isArray(performanceBody?.rows) ? performanceBody.rows : [],
        summary: performanceBody?.summary || {},
      });
      setUserForm((value) => ({ ...value, branch_id: value.branch_id || String(branchRows?.[0]?.id || branchRows?.[0]?.branch_id || '') }));
      setForm((value) => ({ ...value, branch_id: value.branch_id || String(branchRows?.[0]?.id || branchRows?.[0]?.branch_id || '') }));
      setSalaryForm((value) => ({
        ...value,
        staffId: value.staffId || String((Array.isArray(staffBody?.staff) ? staffBody.staff : [])?.[0]?.staffId || ''),
        branch_id: value.branch_id || String(branchRows?.[0]?.id || branchRows?.[0]?.branch_id || ''),
      }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load staff management data.');
      setStaff([]);
      setUsers([]);
      setSalaryRows([]);
      setStaffExpenses([]);
      setPerformance({ rows: [], summary: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [filters.search, filters.status, filters.branch_id, staffMonth]);

  const branchNames = useMemo(() => new Map(branches.map((branch) => [
    String(branch.id || branch.branch_id),
    branch.name || branch.branch_name || branch.store_name || branch.store_number || 'Branch',
  ])), [branches]);

  const rows = useMemo(() => {
    const userRows = users.map((user) => ({
      staffId: `user-${user.id}`,
      userId: user.id,
      name: user.name || user.email || 'Unnamed user',
      phone: user.email || '',
      role: titleCase(user.role || 'staff'),
      status: 'active',
      branch_id: user.branch_id || '',
      all_branch_access: user.all_branch_access,
      source: 'Login user',
      createdAt: user.created_at,
    }));
    const staffRows = staff.map((member) => ({
      ...member,
      staffId: member.staffId || member.id,
      branch_id: getBranchId(member),
      source: 'Staff profile',
    }));
    return [...userRows, ...staffRows]
      .filter((member) => {
        const search = filters.search.trim().toLowerCase();
        const matchesSearch = !search || [member.name, member.phone, member.role, member.source].some((value) => String(value || '').toLowerCase().includes(search));
        const matchesBranch = !filters.branch_id || isAllBranchAccess(member) || idsEqual(getBranchId(member), filters.branch_id);
        return matchesSearch && matchesBranch;
      })
      .map((member, index) => {
        const branchId = getBranchId(member);
        const branchName = member.branchName || member.branch_name || (isAllBranchAccess(member) ? 'All stores' : (branchId ? branchNames.get(String(branchId)) : '')) || 'Unassigned';
        const sales = member.salesContribution ?? member.sales ?? null;
        return {
          ...member,
          branchName,
          branchId,
          sales,
          orders: member.orders === undefined || member.orders === null ? null : Number(member.orders),
          lastActive: member.lastActive || (member.source === 'Login user' ? 'Login enabled' : (member.status === 'active' ? 'Active' : 'Inactive')),
          avatarTone: index % 3,
        };
      });
  }, [branchNames, filters.branch_id, filters.search, staff, users]);

  const activeRows = rows.filter((member) => member.status !== 'inactive');
  const salesRows = activeRows.filter((member) => member.sales !== null && member.sales !== undefined);
  const totalSales = salesRows.reduce((sum, member) => sum + Number(member.sales || 0), 0);
  const averageProductivity = salesRows.length ? totalSales / salesRows.length : null;
  const topPerformer = salesRows.reduce((top, member) => Number(member.sales || 0) > Number(top?.sales || 0) ? member : top, salesRows[0]);
  const roleCount = new Set(rows.map((member) => member.role).filter(Boolean)).size;
  const staffNames = useMemo(() => new Map(staff.map((member) => [String(member.staffId || member.id), member.name])), [staff]);
  const branchOptions = useMemo(() => branches.map((branch) => ({
    id: String(branch.id || branch.branch_id),
    name: branch.name || branch.branch_name || branch.store_name || branch.store_number || 'Branch',
  })), [branches]);
  const salarySummary = useMemo(() => salaryRows.reduce((summary, row) => ({
    payable: summary.payable + Number(row.netSalary || 0),
    paid: summary.paid + Number(row.paidAmount || 0),
    pending: summary.pending + Number(row.pendingAmount || 0),
  }), { payable: 0, paid: 0, pending: 0 }), [salaryRows]);
  const staffExpenseSummary = useMemo(() => staffExpenses.reduce((summary, row) => ({
    total: summary.total + Number(row.amount || 0),
    count: summary.count + 1,
  }), { total: 0, count: 0 }), [staffExpenses]);

  const selectStaff = (member) => {
    setEditingId(member.staffId);
    setForm({
      staffId: member.staffId || '',
      name: member.name || '',
      phone: member.phone || '',
      role: member.role || 'Cashier',
      salary: member.salary ?? '',
      joinDate: member.joinDate ? String(member.joinDate).slice(0, 10) : '',
      status: member.status || 'active',
      branch_id: getBranchId(member) || '',
    });
  };

  useEffect(() => {
    if (mode === 'edit' && !editingId && staff.length) selectStaff({ ...staff[0], staffId: staff[0].staffId || staff[0].id });
    if (mode === 'new') {
      setEditingId(null);
      setForm((value) => ({ ...EMPTY_FORM, branch_id: value.branch_id || String(branches?.[0]?.id || branches?.[0]?.branch_id || '') }));
    }
  }, [mode, staff.length, branches.length]);

  const saveStaff = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
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
      setMessage(editingId ? 'Staff profile updated.' : 'Staff profile created.');
      await refresh();
      if (!editingId) navigate('/staff/edit');
    } catch (err) {
      setError(err?.response?.data?.message || `Unable to ${editingId ? 'update' : 'create'} staff profile.`);
    } finally {
      setSaving(false);
    }
  };

  const createLoginUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const allBranchAccess = userForm.access === 'all' || userForm.role === 'admin';
      await api.createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        all_branch_access: allBranchAccess,
        branch_id: allBranchAccess ? null : userForm.branch_id,
      });
      setUserForm({ ...EMPTY_USER_FORM, branch_id: String(branches?.[0]?.id || branches?.[0]?.branch_id || '') });
      setMessage('Login user created.');
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to create login user.');
    } finally {
      setSaving(false);
    }
  };

  const updateStaffBranch = async (member, branchId) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updateStaff(member.staffId, { branch_id: branchId || null });
      setMessage('Staff branch assignment updated.');
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update staff branch assignment.');
    } finally {
      setSaving(false);
    }
  };

  const updateUserBranch = async (user, value) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updateUserAccess(user.id, value === 'all' ? { all_branch_access: true, branch_id: null } : { all_branch_access: false, branch_id: value });
      setMessage('Login user branch access updated.');
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to update login user access.');
    } finally {
      setSaving(false);
    }
  };

  const updateUserRole = async (user, role) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.updateUserRole(user.id, role);
      setMessage('Login role updated.');
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to update login role.');
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

  const selectSalary = (row) => {
    setSalaryForm({
      salaryId: row.salaryId || row.id || '',
      staffId: row.staffId || row.staff_id || '',
      month: row.month || currentMonth(),
      baseSalary: row.baseSalary ?? row.base_salary ?? '',
      bonus: row.bonus ?? 0,
      deductions: row.deductions ?? 0,
      paidAmount: row.paidAmount ?? row.paid_amount ?? 0,
      branch_id: row.branchId || row.branch_id || '',
    });
  };

  const saveSalary = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const baseSalary = Number(salaryForm.baseSalary || 0);
    const bonus = Number(salaryForm.bonus || 0);
    const deductions = Number(salaryForm.deductions || 0);
    const paidAmount = Number(salaryForm.paidAmount || 0);
    const netSalary = baseSalary + bonus - deductions;
    const payload = {
      salaryId: salaryForm.salaryId || createLocalId(),
      staffId: salaryForm.staffId,
      month: salaryForm.month,
      baseSalary,
      bonus,
      deductions,
      netSalary,
      paidAmount,
      pendingAmount: Math.max(netSalary - paidAmount, 0),
      branch_id: salaryForm.branch_id || null,
    };
    try {
      if (salaryForm.salaryId) await api.updateStaffSalary(salaryForm.salaryId, payload);
      else await api.createStaffSalary(payload);
      setMessage(salaryForm.salaryId ? 'Salary record updated.' : 'Salary record created.');
      setSalaryForm((value) => ({ ...EMPTY_SALARY_FORM, staffId: value.staffId, branch_id: value.branch_id, month: value.month }));
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to save salary record.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="staff-management-screen">
    <StaffHeader mode={mode} count={rows.length} />
    {(error || message) && <div className={`staff-inline-alert ${message ? 'success' : ''}`}><strong>{message ? 'Saved' : 'Unable to load real data'}</strong><span>{message || error}</span><button className="secondary-btn" onClick={refresh}>Refresh</button></div>}
    {mode === 'new' && <AddStaffView form={form} setForm={setForm} userForm={userForm} setUserForm={setUserForm} branches={branches} saving={saving} saveStaff={saveStaff} createLoginUser={createLoginUser} />}
    {mode === 'edit' && <EditStaffView staff={staff} form={form} setForm={setForm} branches={branches} editingId={editingId} saving={saving} selectStaff={selectStaff} saveStaff={saveStaff} />}
    {mode === 'branch-assignment' && <BranchAssignmentView staff={staff} users={users} branches={branches} branchNames={branchNames} saving={saving} updateStaffBranch={updateStaffBranch} updateUserBranch={updateUserBranch} />}
    {mode === 'roles-status' && <RoleStatusView staff={staff} users={users} saving={saving} updateUserRole={updateUserRole} toggleStatus={toggleStatus} />}
    {mode === 'salary' && <SalaryTrackingView staff={staff} salaries={salaryRows} form={salaryForm} setForm={setSalaryForm} branches={branchOptions} branchNames={branchNames} staffNames={staffNames} month={staffMonth} setMonth={setStaffMonth} saving={saving} saveSalary={saveSalary} selectSalary={selectSalary} summary={salarySummary} />}
    {mode === 'expenses' && <StaffExpensesView expenses={staffExpenses} staffNames={staffNames} branchNames={branchNames} summary={staffExpenseSummary} />}
    {mode === 'performance' && <StaffPerformanceView performance={performance} />}
    {mode === 'list' && <StaffListView loading={loading} rows={rows} branches={branches} filters={filters} setFilters={setFilters} navigate={navigate} toggleStatus={toggleStatus} />}
    {mode === 'list' && <div className="staff-summary-grid">
      <SummaryCard label="Average Productivity" value={formatSales(averageProductivity)} suffix={averageProductivity ? '/ staff' : ''} />
      <SummaryCard label="Login Users" value={users.length} suffix="accounts" />
      <SummaryCard label="Top Performer" value={topPerformer?.name ? `${topPerformer.name.split(' ')[0]} ${topPerformer.name.split(' ')[1]?.[0] || ''}.` : 'No metrics'} />
      <SummaryCard label="Active Roles" value={roleCount || 0} suffix="types" />
    </div>}
  </div>;
}

function StaffHeader({ mode, count }) {
  const titles = {
    list: ['Staff Management', `Manage roles, permissions, branch access, and profiles for ${count} team members.`],
    new: ['Add Staff', 'Create staff profiles and cashier login users with store assignment.'],
    edit: ['Edit Staff', 'Update staff profile fields, branch assignment, salary, and status.'],
    salary: ['Salary Tracking', 'Review monthly salary payable, paid, and pending amounts from Central payroll records.'],
    'branch-assignment': ['Branch Assignment', 'Assign cashiers and staff profiles to the correct POS store.'],
    'roles-status': ['Role / Status Management', 'Manage login roles and staff active/off-duty status.'],
    expenses: ['Staff-wise Expenses', 'Track staff-linked allowances, claims, and operational reimbursements.'],
    performance: ['Staff Performance', 'Compare cashier sales activity with profile compensation and staff expense signals.'],
  };
  const [title, subtitle] = titles[mode] || titles.list;
  return <div className="page-header staff-page-header">
    <div><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="hero-actions">
      <button className="secondary-btn"><i className="bi bi-shield-check" /> Permissions</button>
      <button className="secondary-btn"><i className="bi bi-calendar-check" /> Attendance</button>
    </div>
  </div>;
}

function StaffListView({ loading, rows, branches, filters, setFilters, navigate, toggleStatus }) {
  return <section className="staff-directory-card">
    <div className="staff-toolbar">
      <label className="staff-search"><i className="bi bi-search" /><input value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value }))} placeholder="Search staff by name or role" /></label>
      <div className="staff-segments" aria-label="Staff status">{statusFilters.map((item) => <button key={item.label} className={filters.status === item.value ? 'active' : ''} onClick={() => setFilters((value) => ({ ...value, status: item.value }))}>{item.label}</button>)}</div>
      <label className="staff-role-filter"><span>Store:</span><select value={filters.branch_id} onChange={(event) => setFilters((value) => ({ ...value, branch_id: event.target.value }))}><option value="">All Stores</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></label>
    </div>
    <StaffTable loading={loading} rows={rows} navigate={navigate} toggleStatus={toggleStatus} />
  </section>;
}

function StaffTable({ loading, rows, navigate, toggleStatus }) {
  return <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Member</th><th>Role</th><th>Branch Access</th><th>Source</th><th>Sales Contr.</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {loading ? <tr><td colSpan="8" className="staff-table-state">Loading staff...</td></tr> : rows.length === 0 ? <tr><td colSpan="8" className="staff-table-state">No staff or cashier login users found.</td></tr> : rows.map((member) => <tr key={`${member.source}-${member.staffId}`}>
      <td><div className="staff-member-cell"><span className={`staff-avatar tone-${member.avatarTone}`}>{initials(member.name)}</span><span><strong>{member.name}</strong><small>{member.phone || member.staffId}</small></span></div></td>
      <td>{member.role || 'Staff Member'}</td><td>{member.branchName}</td><td>{member.source}</td>
      <td><div className="sales-meter"><strong>{formatSales(member.sales)}</strong><span><i style={{ width: `${member.sales === null ? 0 : Math.min(100, Math.max(18, Number(member.sales || 0) / 15000))}%` }} /></span></div></td>
      <td>{member.orders === null ? '-' : numberFormat.format(member.orders)}</td>
      <td><span className={`activity-status ${member.status === 'active' ? 'online' : 'offline'}`}>{member.lastActive}</span></td>
      <td><div className="staff-actions">{member.source === 'Staff profile' ? <><button className="icon-btn" onClick={() => navigate('/staff/edit')} aria-label={`Edit ${member.name}`}><i className="bi bi-pencil-square" /></button><button className="icon-btn" onClick={() => toggleStatus(member)} aria-label={member.status === 'active' ? `Deactivate ${member.name}` : `Activate ${member.name}`}><i className={member.status === 'active' ? 'bi bi-pause-circle' : 'bi bi-play-circle'} /></button></> : <button className="link-action" onClick={() => navigate('/staff/branch-assignment')}>Assign</button>}</div></td>
    </tr>)}
  </tbody></table></div>;
}

function StaffProfileForm({ form, setForm, branches, saving, onSubmit, editing }) {
  return <form onSubmit={onSubmit} className="form-grid three-col staff-workflow-form">
    <label className="field"><span>Staff ID</span><input required disabled={editing} value={form.staffId} onChange={(event) => setForm((value) => ({ ...value, staffId: event.target.value }))} /></label>
    <label className="field"><span>Name</span><input required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label>
    <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} /></label>
    <label className="field"><span>Job role</span><select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>{staffRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
    <label className="field"><span>Salary</span><input min="0" step="0.01" type="number" value={form.salary} onChange={(event) => setForm((value) => ({ ...value, salary: event.target.value }))} /></label>
    <label className="field"><span>Join date</span><input type="date" value={form.joinDate} onChange={(event) => setForm((value) => ({ ...value, joinDate: event.target.value }))} /></label>
    <label className="field"><span>Status</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Off Duty</option></select></label>
    <label className="field"><span>Branch assignment</span><select value={form.branch_id} onChange={(event) => setForm((value) => ({ ...value, branch_id: event.target.value }))}><option value="">Unassigned</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></label>
    <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create staff'}</button></div>
  </form>;
}

function AddStaffView({ form, setForm, userForm, setUserForm, branches, saving, saveStaff, createLoginUser }) {
  return <div className="staff-workflow-grid">
    <section className="panel staff-form-panel"><div className="panel-title"><i className="bi bi-person-vcard" /><div><h2>Create staff profile</h2><p>Central/PostgreSQL is authoritative for staff profile data. Login roles and permissions remain a separate access-control concern.</p></div></div><StaffProfileForm form={form} setForm={setForm} branches={branches} saving={saving} onSubmit={saveStaff} /></section>
    <section className="panel staff-form-panel"><div className="panel-title"><i className="bi bi-person-lock" /><div><h2>Create cashier login</h2><p>Cashier POS login depends on this user role and branch assignment.</p></div></div><form onSubmit={createLoginUser} className="form-grid two-col staff-workflow-form">
      <label className="field"><span>Name</span><input required value={userForm.name} onChange={(event) => setUserForm((value) => ({ ...value, name: event.target.value }))} /></label>
      <label className="field"><span>Email</span><input required type="email" value={userForm.email} onChange={(event) => setUserForm((value) => ({ ...value, email: event.target.value }))} /></label>
      <label className="field"><span>Password</span><input required minLength="8" type="password" value={userForm.password} onChange={(event) => setUserForm((value) => ({ ...value, password: event.target.value }))} /></label>
      <label className="field"><span>Login role</span><select value={userForm.role} onChange={(event) => setUserForm((value) => ({ ...value, role: event.target.value, access: event.target.value === 'admin' ? 'all' : value.access }))}>{loginRoles.map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
      <label className="field"><span>Store access</span><select value={userForm.role === 'admin' ? 'all' : userForm.access} disabled={userForm.role === 'admin'} onChange={(event) => setUserForm((value) => ({ ...value, access: event.target.value }))}><option value="branch">Single store</option><option value="all">All stores</option></select></label>
      {userForm.access !== 'all' && userForm.role !== 'admin' && <label className="field"><span>Assigned branch</span><select required value={userForm.branch_id} onChange={(event) => setUserForm((value) => ({ ...value, branch_id: event.target.value }))}>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></label>}
      <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Create login user'}</button></div>
    </form></section>
  </div>;
}

function EditStaffView({ staff, form, setForm, branches, editingId, saving, selectStaff, saveStaff }) {
  return <div className="staff-workflow-grid narrow">
    <section className="panel staff-list-panel"><div className="panel-title"><i className="bi bi-list-check" /><div><h2>Profiles</h2><p>{staff.length} staff profile{staff.length === 1 ? '' : 's'} available.</p></div></div><div className="staff-picker-list">{staff.map((member) => <button key={member.staffId || member.id} className={idsEqual(editingId, member.staffId || member.id) ? 'active' : ''} onClick={() => selectStaff({ ...member, staffId: member.staffId || member.id })}><strong>{member.name}</strong><span>{member.role || 'Staff'} / {member.branchName || member.branch_name || 'Branch'}</span></button>)}</div></section>
    <section className="panel staff-form-panel"><div className="panel-title"><i className="bi bi-pencil-square" /><div><h2>Edit staff profile</h2><p>Update branch assignment, role, salary, and active/off-duty state.</p></div></div>{editingId ? <StaffProfileForm form={form} setForm={setForm} branches={branches} saving={saving} onSubmit={saveStaff} editing /> : <div className="staff-table-state">Select a staff profile to edit.</div>}</section>
  </div>;
}

function BranchAssignmentView({ staff, users, branches, branchNames, saving, updateStaffBranch, updateUserBranch }) {
  return <section className="panel staff-assignment-panel"><div className="panel-title"><i className="bi bi-diagram-3" /><div><h2>Store assignment</h2><p>Cashiers must match the POS branch, otherwise POS login is blocked.</p></div></div><div className="assignment-grid">
    <div><h3>Login users</h3>{users.map((user) => <div className="assignment-row" key={user.id}><div><strong>{user.name || user.email}</strong><span>{user.email} / {titleCase(user.role)}</span></div><select disabled={saving || user.role === 'admin'} value={user.role === 'admin' || user.all_branch_access !== false ? 'all' : String(user.branch_id || '')} onChange={(event) => updateUserBranch(user, event.target.value)}><option value="all">All stores</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></div>)}</div>
    <div><h3>Staff profiles</h3>{staff.map((member) => <div className="assignment-row" key={member.staffId || member.id}><div><strong>{member.name}</strong><span>{member.role || 'Staff'} / {branchNames.get(String(getBranchId(member))) || 'Unassigned'}</span></div><select disabled={saving} value={String(getBranchId(member) || '')} onChange={(event) => updateStaffBranch({ ...member, staffId: member.staffId || member.id }, event.target.value)}><option value="">Unassigned</option>{branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name}</option>)}</select></div>)}</div>
  </div></section>;
}

function RoleStatusView({ staff, users, saving, updateUserRole, toggleStatus }) {
  return <section className="panel staff-assignment-panel"><div className="panel-title"><i className="bi bi-person-gear" /><div><h2>Roles and status</h2><p>Login role controls POS permissions. Staff status controls profile availability.</p></div></div><div className="assignment-grid">
    <div><h3>Login roles</h3>{users.map((user) => <div className="assignment-row" key={user.id}><div><strong>{user.name || user.email}</strong><span>{user.email}</span></div><select disabled={saving} value={user.role || 'staff'} onChange={(event) => updateUserRole(user, event.target.value)}>{loginRoles.map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></div>)}</div>
    <div><h3>Staff status</h3>{staff.map((member) => <div className="assignment-row" key={member.staffId || member.id}><div><strong>{member.name}</strong><span>{member.role || 'Staff'}</span></div><button className={member.status === 'active' ? 'secondary-btn' : 'primary-btn'} disabled={saving} onClick={() => toggleStatus({ ...member, staffId: member.staffId || member.id })}>{member.status === 'active' ? 'Set Off Duty' : 'Activate'}</button></div>)}</div>
  </div></section>;
}

function SalaryTrackingView({ staff, salaries, form, setForm, branches, branchNames, staffNames, month, setMonth, saving, saveSalary, selectSalary, summary }) {
  const netSalary = Number(form.baseSalary || 0) + Number(form.bonus || 0) - Number(form.deductions || 0);
  const pendingAmount = Math.max(netSalary - Number(form.paidAmount || 0), 0);
  return <div className="staff-workflow-grid">
    <section className="panel staff-form-panel">
      <div className="panel-title"><i className="bi bi-wallet2" /><div><h2>Payroll entry</h2><p>Salary records are linked to staff profiles and branch assignment.</p></div></div>
      <form onSubmit={saveSalary} className="form-grid three-col staff-workflow-form">
        <label className="field"><span>Staff profile</span><select required value={form.staffId} onChange={(event) => setForm((value) => ({ ...value, staffId: event.target.value }))}>{staff.map((member) => <option key={member.staffId || member.id} value={member.staffId || member.id}>{member.name}</option>)}</select></label>
        <label className="field"><span>Month</span><input type="month" required value={form.month} onChange={(event) => { setForm((value) => ({ ...value, month: event.target.value })); setMonth(event.target.value); }} /></label>
        <label className="field"><span>Branch</span><select value={form.branch_id} onChange={(event) => setForm((value) => ({ ...value, branch_id: event.target.value }))}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="field"><span>Base salary</span><input min="0" type="number" value={form.baseSalary} onChange={(event) => setForm((value) => ({ ...value, baseSalary: event.target.value }))} /></label>
        <label className="field"><span>Bonus</span><input min="0" type="number" value={form.bonus} onChange={(event) => setForm((value) => ({ ...value, bonus: event.target.value }))} /></label>
        <label className="field"><span>Deductions</span><input min="0" type="number" value={form.deductions} onChange={(event) => setForm((value) => ({ ...value, deductions: event.target.value }))} /></label>
        <label className="field"><span>Paid amount</span><input min="0" type="number" value={form.paidAmount} onChange={(event) => setForm((value) => ({ ...value, paidAmount: event.target.value }))} /></label>
        <div className="staff-payroll-preview"><span>Net</span><strong>{formatSales(netSalary)}</strong><span>Pending</span><strong>{formatSales(pendingAmount)}</strong></div>
        <div className="form-actions"><button className="primary-btn" disabled={saving || !form.staffId}>{saving ? 'Saving...' : form.salaryId ? 'Update salary' : 'Add salary'}</button></div>
      </form>
    </section>
    <section className="panel staff-form-panel">
      <div className="panel-title"><i className="bi bi-cash-stack" /><div><h2>{month} salary ledger</h2><p>{salaries.length} payroll record{salaries.length === 1 ? '' : 's'} loaded.</p></div></div>
      <div className="staff-summary-grid compact">
        <SummaryCard label="Payable" value={formatSales(summary.payable)} />
        <SummaryCard label="Paid" value={formatSales(summary.paid)} />
        <SummaryCard label="Pending" value={formatSales(summary.pending)} />
      </div>
      <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Staff</th><th>Month</th><th>Branch</th><th>Net</th><th>Paid</th><th>Pending</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {salaries.length === 0 ? <tr><td colSpan="8" className="staff-table-state">No salary records for this month.</td></tr> : salaries.map((row) => <tr key={row.salaryId}><td>{staffNames.get(String(row.staffId)) || row.staffId}</td><td>{row.month}</td><td>{branchNames.get(String(row.branchId)) || '-'}</td><td>{formatSales(row.netSalary)}</td><td>{formatSales(row.paidAmount)}</td><td>{formatSales(row.pendingAmount)}</td><td><span className={`status-badge status-${row.paymentStatus === 'paid' ? 'live' : 'partial'} compact`}>{titleCase(row.paymentStatus)}</span></td><td><button className="link-action" onClick={() => selectSalary(row)}>Edit</button></td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}

function StaffExpensesView({ expenses, staffNames, branchNames, summary }) {
  const byStaff = expenses.reduce((acc, row) => {
    const key = String(row.staffId || row.staff_id || 'unassigned');
    const current = acc.get(key) || { staffId: key, total: 0, count: 0 };
    current.total += Number(row.amount || 0);
    current.count += 1;
    acc.set(key, current);
    return acc;
  }, new Map());
  return <div className="staff-workflow-grid">
    <section className="panel staff-form-panel">
      <div className="panel-title"><i className="bi bi-receipt-cutoff" /><div><h2>Staff expense summary</h2><p>Only expenses tagged as staff expenses are shown here.</p></div></div>
      <div className="staff-summary-grid compact">
        <SummaryCard label="Total Staff Expense" value={formatSales(summary.total)} />
        <SummaryCard label="Expense Entries" value={summary.count} />
        <SummaryCard label="Linked Staff" value={byStaff.size} />
      </div>
      <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Staff</th><th>Entries</th><th>Total</th></tr></thead><tbody>{Array.from(byStaff.values()).map((row) => <tr key={row.staffId}><td>{staffNames.get(row.staffId) || 'Unassigned'}</td><td>{row.count}</td><td>{formatSales(row.total)}</td></tr>)}</tbody></table></div>
    </section>
    <section className="panel staff-form-panel">
      <div className="panel-title"><i className="bi bi-list-ul" /><div><h2>Recent staff expenses</h2><p>{expenses.length} Central expense row{expenses.length === 1 ? '' : 's'} loaded.</p></div></div>
      <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Date</th><th>Staff</th><th>Category</th><th>Amount</th><th>Branch</th><th>Payment</th></tr></thead><tbody>
        {expenses.length === 0 ? <tr><td colSpan="6" className="staff-table-state">No staff-linked expenses found.</td></tr> : expenses.map((row) => <tr key={row.expenseId}><td>{String(row.date || '').slice(0, 10)}</td><td>{staffNames.get(String(row.staffId)) || 'Unassigned'}</td><td>{row.category || 'Staff'}</td><td>{formatSales(row.amount)}</td><td>{branchNames.get(String(row.branchId)) || '-'}</td><td>{titleCase(row.paymentMethod || '-')}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}

function StaffPerformanceView({ performance }) {
  const summary = performance.summary || {};
  const rows = performance.rows || [];
  return <section className="panel staff-assignment-panel">
    <div className="panel-title"><i className="bi bi-graph-up-arrow" /><div><h2>Performance dashboard</h2><p>Sales are from login users; payroll and expense values are from staff profile records.</p></div></div>
    <div className="staff-summary-grid compact">
      <SummaryCard label="Sales" value={formatSales(summary.totalSales)} />
      <SummaryCard label="Orders" value={summary.totalOrders || 0} />
      <SummaryCard label="Salary Pending" value={formatSales(summary.totalSalaryPending)} />
      <SummaryCard label="Staff Expenses" value={formatSales(summary.totalStaffExpenses)} />
    </div>
    <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Member</th><th>Source</th><th>Role</th><th>Branch</th><th>Sales</th><th>Orders</th><th>Salary Pending</th><th>Expenses</th></tr></thead><tbody>
      {rows.length === 0 ? <tr><td colSpan="8" className="staff-table-state">No performance data available.</td></tr> : rows.map((row, index) => <tr key={`${row.source}-${row.staffId || row.userId || index}`}><td><div className="staff-member-cell"><span className={`staff-avatar tone-${index % 3}`}>{initials(row.name || row.email)}</span><span><strong>{row.name || row.email}</strong><small>{row.email || row.staffId || row.userId}</small></span></div></td><td>{row.source}</td><td>{titleCase(row.role)}</td><td>{row.allBranchAccess ? 'All stores' : row.branchName || '-'}</td><td>{formatSales(row.salesTotal)}</td><td>{numberFormat.format(row.orderCount || 0)}</td><td>{formatSales(row.pendingAmount)}</td><td>{formatSales(row.expenseTotal)}</td></tr>)}
    </tbody></table></div>
  </section>;
}

function SummaryCard({ label, value, suffix, good = false }) {
  return <div className="staff-summary-card"><span>{label}</span><strong>{value}{suffix && <small className={good ? 'good-text' : ''}> {suffix}</small>}</strong></div>;
}
