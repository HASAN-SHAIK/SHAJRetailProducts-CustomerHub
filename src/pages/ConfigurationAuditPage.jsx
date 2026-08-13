import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const fmt = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function ConfigurationAuditPage() {
  const [scopeType, setScopeType] = useState('tenant');
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const scopeId = useMemo(() => scopeType === 'tenant' ? 'current' : scopeType === 'branch' ? branchId : deviceId, [scopeType, branchId, deviceId]);

  useEffect(() => {
    api.branches().then((response) => {
      const body = unwrap(response);
      const list = body?.branches || body?.data?.branches || body?.data || body || [];
      const normalized = Array.isArray(list) ? list : [];
      setBranches(normalized);
      if (normalized.length) setBranchId(String(normalized[0].id));
    }).catch(() => setMessage('Unable to load stores.'));
  }, []);

  useEffect(() => {
    if (scopeType !== 'device' || !branchId) { setDevices([]); setDeviceId(''); return; }
    api.branchDevices(branchId).then((response) => {
      const body = unwrap(response);
      const list = body?.devices || body?.data?.devices || body?.data || body || [];
      const normalized = Array.isArray(list) ? list : [];
      setDevices(normalized);
      setDeviceId(normalized.length ? String(normalized[0].device_id || normalized[0].id) : '');
    }).catch(() => { setDevices([]); setDeviceId(''); });
  }, [scopeType, branchId]);

  useEffect(() => {
    if (!scopeId) { setRows([]); return; }
    setBusy(true); setMessage('');
    api.configurationAudit(scopeType, scopeId, 100).then((response) => {
      const body = unwrap(response);
      setRows(Array.isArray(body?.audit) ? body.audit : []);
    }).catch((error) => setMessage(error?.response?.data?.message || 'Unable to load configuration history.'))
      .finally(() => setBusy(false));
  }, [scopeType, scopeId]);

  return <div className="page-stack">
    <PageHeader title="Configuration Audit" subtitle="See who changed business, store and POS policies and what changed." />
    <section className="panel">
      <div className="scope-selector-grid">
        <label className="field"><span>Scope</span><select value={scopeType} onChange={(e) => setScopeType(e.target.value)}><option value="tenant">Business / Tenant</option><option value="branch">Store / Branch</option><option value="device">POS / Device</option></select></label>
        {scopeType !== 'tenant' && <label className="field"><span>Store</span><select value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || branch.branch_name || branch.id}</option>)}</select></label>}
        {scopeType === 'device' && <label className="field"><span>POS terminal</span><select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>{devices.length ? devices.map((device) => <option key={device.id || device.device_id} value={device.device_id || device.id}>{device.device_name || device.name || device.device_id || device.id}</option>) : <option value="">No registered devices</option>}</select></label>}
      </div>
    </section>
    <section className="panel">
      <div className="panel-title"><i className="bi bi-clock-history"/><div><h2>Recent changes</h2><p>Newest changes first. Up to 100 entries are shown for the selected scope.</p></div></div>
      {message && <div className="inline-message">{message}</div>}
      {busy ? <div className="empty-state"><span>Loading audit history…</span></div> : rows.length ? <div className="data-table">
        <div className="data-row header"><span>Setting</span><span>Change</span><span>Changed by</span><span>Time</span></div>
        {rows.map((row) => <div className="data-row" key={row.id}><span><strong>{row.setting_key}</strong><small>Revision {row.revision}</small></span><span><small>{fmt(row.old_value_json)} → {fmt(row.new_value_json)}</small></span><span>{row.changed_by || 'system'}</span><span>{row.changed_at ? new Date(row.changed_at).toLocaleString() : '—'}</span></div>)}
      </div> : <div className="empty-state"><i className="bi bi-clock-history"/><strong>No configuration changes yet</strong><span>Changes made through Retail Hub will appear here.</span></div>}
    </section>
  </div>;
}
