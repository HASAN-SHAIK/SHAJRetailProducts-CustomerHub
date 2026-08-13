import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';
import '../styles/configuration.css';

const GROUPS = {
  billing: { title: 'Billing & Checkout', subtitle: 'Control checkout behavior with tenant, store, and POS-level inheritance.', groups: ['billing'] },
  inventory: { title: 'Inventory Policies', subtitle: 'Manage product, quantity, batch, expiry, and stock rules across stores.', groups: ['inventory'] },
  receipts: { title: 'Receipts & Printing', subtitle: 'Configure receipt defaults and POS printing behavior.', groups: ['receipt'] },
  tax: { title: 'Tax & GST', subtitle: 'Manage GST mode and tax defaults with controlled store overrides.', groups: ['tax'] },
  security: { title: 'Security & Approvals', subtitle: 'Define manager approval and session policies for retail operations.', groups: ['security'] },
  offline: { title: 'Offline Policies', subtitle: 'Control offline selling, configuration freshness, and synchronization cadence.', groups: ['offline'] },
  hardware: { title: 'POS Hardware Policies', subtitle: 'Enable or restrict scanner, weighing-scale, and cash-drawer capabilities by scope.', groups: ['hardware'] },
};

const labelFor = (key) => key.split('.').slice(1).join(' ').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const inputValue = (meta, value) => {
  if (meta.type === 'string_array') return Array.isArray(value) ? value.join(', ') : '';
  return value ?? '';
};

const payloadValue = (meta, value) => {
  if (meta.type === 'boolean') return value === true || value === 'true';
  if (meta.type === 'integer' || meta.type === 'number' || meta.type === 'enum_number') return Number(value);
  if (meta.type === 'string_array') return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  return value;
};

export default function ConfigurationPage({ kind }) {
  const definition = GROUPS[kind];
  const [catalog, setCatalog] = useState([]);
  const [branches, setBranches] = useState([]);
  const [devices, setDevices] = useState([]);
  const [scopeType, setScopeType] = useState('tenant');
  const [branchId, setBranchId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [scopeData, setScopeData] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const fields = useMemo(
    () => catalog.filter((item) => definition.groups.includes(item.group) && item.scopes.includes(scopeType)),
    [catalog, definition, scopeType]
  );

  const scopeId = scopeType === 'tenant' ? 'current' : scopeType === 'branch' ? branchId : deviceId;

  useEffect(() => {
    Promise.all([api.configurationCatalog(), api.branches()])
      .then(([catalogResponse, branchResponse]) => {
        const catalogBody = unwrap(catalogResponse);
        const branchBody = unwrap(branchResponse);
        const branchList = branchBody?.branches || branchBody?.data?.branches || branchBody?.data || branchBody || [];
        setCatalog(Array.isArray(catalogBody?.settings) ? catalogBody.settings : []);
        setBranches(Array.isArray(branchList) ? branchList : []);
        if (Array.isArray(branchList) && branchList.length) setBranchId(String(branchList[0].id));
      })
      .catch((error) => setMessage(error?.response?.data?.message || 'Unable to load configuration catalog. Admin access is required.'));
  }, []);

  useEffect(() => {
    if (!branchId || scopeType !== 'device') { setDevices([]); setDeviceId(''); return; }
    api.branchDevices(branchId)
      .then((response) => {
        const body = unwrap(response);
        const list = body?.devices || body?.data?.devices || body?.data || body || [];
        const normalized = Array.isArray(list) ? list : [];
        setDevices(normalized);
        if (normalized.length) setDeviceId(String(normalized[0].device_id || normalized[0].id));
      })
      .catch(() => { setDevices([]); setDeviceId(''); });
  }, [branchId, scopeType]);

  useEffect(() => {
    if (!scopeId || !fields.length) { setScopeData(null); return; }
    setBusy(true);
    setMessage('');
    api.scopeConfiguration(scopeType, scopeId)
      .then((response) => {
        const body = unwrap(response);
        setScopeData(body);
        const next = {};
        fields.forEach((meta) => {
          const raw = hasOwn(body?.overrides, meta.key) ? body.overrides[meta.key] : body?.effective?.values?.[meta.key];
          next[meta.key] = inputValue(meta, raw);
        });
        setForm(next);
      })
      .catch((error) => setMessage(error?.response?.data?.message || 'Unable to load this configuration scope.'))
      .finally(() => setBusy(false));
  }, [scopeType, scopeId, fields.length, kind]);

  const save = async (event) => {
    event.preventDefault();
    if (!scopeId) return;
    setBusy(true); setMessage('');
    try {
      const values = Object.fromEntries(fields.map((meta) => [meta.key, payloadValue(meta, form[meta.key])]));
      const response = await api.updateScopeConfiguration(scopeType, scopeId, values);
      const body = unwrap(response);
      setScopeData(body);
      setMessage('Configuration saved. Effective values were recalculated.');
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Configuration save failed.');
    } finally { setBusy(false); }
  };

  const reset = async (meta) => {
    if (!scopeId || !hasOwn(scopeData?.overrides, meta.key)) return;
    setBusy(true); setMessage('');
    try {
      const response = await api.resetScopeConfiguration(scopeType, scopeId, meta.key);
      const body = unwrap(response);
      setScopeData(body);
      setForm((current) => ({ ...current, [meta.key]: inputValue(meta, body?.effective?.values?.[meta.key]) }));
      setMessage(`${labelFor(meta.key)} now inherits from its parent scope.`);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to reset this override.');
    } finally { setBusy(false); }
  };

  const renderField = (meta) => {
    const value = form[meta.key];
    if (meta.type === 'boolean') {
      return <select value={String(value)} onChange={(e) => setForm({ ...form, [meta.key]: e.target.value === 'true' })}><option value="true">Enabled</option><option value="false">Disabled</option></select>;
    }
    if (meta.values?.length) {
      return <select value={value} onChange={(e) => setForm({ ...form, [meta.key]: e.target.value })}>{meta.values.map((option) => <option value={option} key={option}>{String(option)}</option>)}</select>;
    }
    const numeric = meta.type === 'integer' || meta.type === 'number' || meta.type === 'enum_number';
    return <input type={numeric ? 'number' : 'text'} min={meta.min ?? undefined} max={meta.max ?? undefined} value={value} onChange={(e) => setForm({ ...form, [meta.key]: e.target.value })} />;
  };

  return <div className="page-stack">
    <PageHeader title={definition.title} subtitle={definition.subtitle} />
    <section className="panel config-scope-panel">
      <div className="panel-title"><i className="bi bi-diagram-3"/><div><h2>Configuration scope</h2><p>System defaults → Business → Store → POS. The most specific configured value wins.</p></div></div>
      <div className="scope-selector-grid">
        <label className="field"><span>Scope</span><select value={scopeType} onChange={(e) => setScopeType(e.target.value)}><option value="tenant">Business / Tenant</option><option value="branch">Store / Branch</option><option value="device">POS / Device</option></select></label>
        {scopeType !== 'tenant' && <label className="field"><span>Store</span><select value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || branch.branch_name || branch.id}</option>)}</select></label>}
        {scopeType === 'device' && <label className="field"><span>POS terminal</span><select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>{devices.length ? devices.map((device) => <option key={device.id || device.device_id} value={device.device_id || device.id}>{device.device_name || device.name || device.device_id || device.id}</option>) : <option value="">No registered devices</option>}</select></label>}
      </div>
    </section>

    <form className="panel" onSubmit={save}>
      <div className="config-list">
        {fields.map((meta) => {
          const overridden = hasOwn(scopeData?.overrides, meta.key);
          const source = scopeData?.effective?.sources?.[meta.key];
          return <div className="config-row" key={meta.key}>
            <div className="config-copy"><strong>{labelFor(meta.key)}</strong><code>{meta.key}</code><span>{overridden ? `Override at ${scopeType} scope` : `Inherited from ${source?.scope_type || 'system'}`}</span></div>
            <label className="field config-input"><span>{meta.type.replaceAll('_', ' ')}</span>{renderField(meta)}</label>
            <div className="config-source"><span className={`source-pill ${overridden ? 'override' : ''}`}>{overridden ? 'Override' : 'Inherited'}</span>{overridden && <button type="button" className="text-reset" onClick={() => reset(meta)} disabled={busy}>Reset</button>}</div>
          </div>;
        })}
        {!fields.length && <div className="empty-state"><i className="bi bi-sliders"/><strong>No settings at this scope</strong><span>These controls are intentionally managed at another configuration level.</span></div>}
      </div>
      {message && <div className="inline-message">{message}</div>}
      <div className="form-actions"><span>Effective config hash: {scopeData?.effective?.etag?.slice(0, 12) || '—'} · Changes are audited.</span><button className="primary-btn" disabled={busy || !fields.length || !scopeId}>{busy ? 'Working…' : 'Save configuration'}</button></div>
    </form>
  </div>;
}
