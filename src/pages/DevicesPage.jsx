import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const getBranchId = (branch) => branch.id || branch.branch_id || '';
const getStoreNumber = (branch) => branch.store_number || branch.storeNumber || branch.code || '';
const getBranchName = (branch) => branch.name || branch.branch_name || branch.store_name || getBranchId(branch);
const getBranchLabel = (branch) => {
  const storeNumber = getStoreNumber(branch);
  const name = getBranchName(branch);
  return storeNumber ? `${storeNumber} - ${name}` : name;
};
const apiMessage = (err, fallback) => {
  const status = err?.response?.status;
  const body = err?.response?.data || {};
  const message = body.message || body.error || body.code || err?.message || fallback;
  return status ? `${message} (${status})` : message;
};

export default function DevicesPage() {
  const [params] = useSearchParams();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(params.get('branch') || '');
  const [devices, setDevices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [assignments, setAssignments] = useState({});
  const [setup, setSetup] = useState({ branch_id: '', terminal_id: '', touchpoint_id: '' });
  const [setupCode, setSetupCode] = useState(null);

  const loadBranches = async () => {
    try {
      const response = await api.branches();
      const body = unwrap(response);
      const list = Array.isArray(body) ? body : (body?.branches || []);
      setBranches(list);
      setError((current) => current === 'Unable to load branches.' ? '' : current);
      if (!branchId && list[0]?.id) setBranchId(String(list[0].id));
      return list;
    } catch (err) {
      setBranches([]);
      setError(apiMessage(err, 'Unable to load branches.'));
      return [];
    }
  };

  const loadDevices = async (id) => {
    if (!id) return;
    try {
      const response = await api.branchDevices(id);
      const body = unwrap(response);
      setDevices(Array.isArray(body) ? body : (body?.devices || []));
    } catch (err) {
      setError(apiMessage(err, 'Unable to load POS devices.'));
    }
  };

  const loadRequests = async () => {
    try {
      const response = await api.posRegistrationRequests('PENDING');
      const body = unwrap(response);
      setRequests(Array.isArray(body) ? body : (body?.requests || []));
    } catch (err) {
      setError(apiMessage(err, 'Unable to load POS registration requests.'));
    }
  };

  const refreshSetup = async () => {
    await Promise.all([loadBranches(), loadRequests()]);
  };

  useEffect(() => { loadBranches(); }, []);
  useEffect(() => { loadDevices(branchId); }, [branchId]);
  useEffect(() => {
    loadRequests();
    const id = setInterval(loadRequests, 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    window.addEventListener('customerhub:refresh-pos-requests', loadRequests);
    return () => window.removeEventListener('customerhub:refresh-pos-requests', loadRequests);
  }, []);

  const current = useMemo(() => branches.find((branch) => String(getBranchId(branch)) === String(branchId)), [branches, branchId]);

  const deactivate = async (device) => {
    if (!branchId || !device?.id) return;
    try {
      await api.deactivateDevice(branchId, device.id);
      await loadDevices(branchId);
    } catch (err) {
      setError(apiMessage(err, 'Unable to update device.'));
    }
  };

  const updateAssignment = (requestId, patch) => setAssignments((current) => ({
    ...current,
    [requestId]: {
      branch_id: current[requestId]?.branch_id || branchId || '',
      terminal_id: current[requestId]?.terminal_id || '',
      touchpoint_id: current[requestId]?.touchpoint_id || '',
      ...patch,
    },
  }));

  const approve = async (request) => {
    const values = assignments[request.request_id] || { branch_id: branchId, terminal_id: '', touchpoint_id: '' };
    const terminalId = String(values.terminal_id || request.pos_no || request.terminal_id || '').trim();
    const touchpointId = String(values.touchpoint_id || request.touchpoint_id || '').trim();
    if (!values.branch_id || !terminalId || !touchpointId) {
      setError('Choose a store, POS No and Touchpoint ID before approval.');
      return;
    }
    setBusy(request.request_id);
    setError('');
    try {
      await api.approvePosRegistration(request.request_id, {
        branch_id: String(values.branch_id),
        terminal_id: terminalId,
        pos_no: terminalId,
        touchpoint_id: touchpointId,
      });
      await loadRequests();
      if (String(values.branch_id) === String(branchId)) await loadDevices(branchId);
    } catch (err) {
      setError(apiMessage(err, 'Unable to approve POS registration.'));
    } finally {
      setBusy('');
    }
  };

  const reject = async (request) => {
    setBusy(request.request_id);
    setError('');
    try {
      await api.rejectPosRegistration(request.request_id);
      await loadRequests();
    } catch (err) {
      setError(apiMessage(err, 'Unable to reject POS registration.'));
    } finally {
      setBusy('');
    }
  };

  const createSetup = async (event) => {
    event.preventDefault();
    const branch_id = String(setup.branch_id || branchId || '').trim();
    const terminal_id = String(setup.terminal_id || '').trim();
    const touchpoint_id = String(setup.touchpoint_id || '').trim();
    if (!branch_id || !terminal_id || !touchpoint_id) {
      setError('Choose a store, POS No and Touchpoint ID to generate a setup code.');
      return;
    }
    setBusy('setup-code');
    setError('');
    try {
      const response = await api.createPosSetupCode({ branch_id, terminal_id, pos_no: terminal_id, touchpoint_id });
      const body = unwrap(response);
      setSetupCode(body);
      setSetup({ branch_id, terminal_id: '', touchpoint_id: '' });
      await loadRequests();
    } catch (err) {
      setError(apiMessage(err, 'Unable to create POS setup code.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="POS Setup & Approvals" subtitle="Approve physical POS registration requests, assign stores and monitor active terminals." action={<button className="secondary-btn" onClick={refreshSetup}><i className="bi bi-arrow-clockwise" /> Refresh setup</button>} />

      <section className="panel">
        <div className="section-heading"><div><h2>Generate POS setup code</h2><p>Create a short one-time code for a new physical POS. The POS enters this code once and stores its approved device identity locally.</p></div><span className="status-badge status-live compact">15 min</span></div>
        <form className="form-grid three-col" onSubmit={createSetup}>
          <label className="field"><span>Store</span><select value={setup.branch_id || branchId} onChange={(event) => setSetup((current) => ({ ...current, branch_id: event.target.value }))}><option value="">Select branch</option>{branches.map((branch) => <option key={getBranchId(branch)} value={getBranchId(branch)}>{getBranchLabel(branch)}</option>)}</select></label>
          <label className="field"><span>POS No</span><input value={setup.terminal_id} onChange={(event) => setSetup((current) => ({ ...current, terminal_id: event.target.value }))} placeholder="POS-01" /></label>
          <label className="field"><span>Touchpoint ID</span><input value={setup.touchpoint_id} onChange={(event) => setSetup((current) => ({ ...current, touchpoint_id: event.target.value }))} placeholder="TP-01" /></label>
          <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy === 'setup-code'}><i className="bi bi-key" /> {busy === 'setup-code' ? 'Generating...' : 'Generate setup code'}</button></div>
        </form>
        {branches.length === 0 && <div className="inline-message">No stores loaded yet. Sign in as a tenant admin and use Refresh setup.</div>}
        {setupCode && <div className="state-card good"><div><strong>Setup code</strong><span>Enter this on the new POS. It expires at {setupCode.expires_at ? new Date(setupCode.expires_at).toLocaleTimeString() : 'soon'}.</span></div><code className="setup-code">{setupCode.setup_code}</code></div>}
      </section>

      <section className="panel">
        <div className="section-heading"><div><h2>Pending registration requests</h2><p>A POS can request access, but only a tenant admin can choose its store and terminal identity.</p></div><span className="status-badge status-live compact">{requests.length} pending</span></div>
        {requests.length === 0 ? <div className="empty-state"><i className="bi bi-shield-check" /><strong>No pending POS requests</strong><span>New physical terminals will appear here after they select Register this POS.</span></div> : (
          <div className="device-grid">{requests.map((request) => {
            const assignment = assignments[request.request_id] || { branch_id: request.branch_id || branchId || '', terminal_id: request.pos_no || request.terminal_id || '', touchpoint_id: request.touchpoint_id || '' };
            return (
              <article className="device-card" key={request.request_id}>
                <div className="device-icon"><i className="bi bi-pc-display-horizontal" /></div>
                <div className="device-card-head"><div><h3>{request.device_name || 'New POS terminal'}</h3><span className="mono">{request.device_id}</span></div><span className="status-badge status-future compact">Pending</span></div>
                <div className="device-facts"><Fact label="Store Number" value={request.store_number || 'Not reported'} /><Fact label="POS No" value={request.pos_no || request.terminal_id || 'Not reported'} /><Fact label="Touchpoint" value={request.touchpoint_id || 'Not reported'} /></div>
                <div className="device-facts"><Fact label="Installation" value={request.installation_id || 'Not reported'} /><Fact label="OS" value={request.os_info || 'Not reported'} /><Fact label="Requested" value={request.requested_at ? new Date(request.requested_at).toLocaleString() : 'Now'} /></div>
                <div className="form-grid">
                  <label className="field"><span>Assign store</span><select value={assignment.branch_id} onChange={(event) => updateAssignment(request.request_id, { branch_id: event.target.value })}><option value="">Select branch</option>{branches.map((branch) => <option key={getBranchId(branch)} value={getBranchId(branch)}>{getBranchLabel(branch)}</option>)}</select></label>
                  <label className="field"><span>POS No</span><input value={assignment.terminal_id} onChange={(event) => updateAssignment(request.request_id, { terminal_id: event.target.value })} placeholder="POS-01" /></label>
                  <label className="field"><span>Touchpoint ID</span><input value={assignment.touchpoint_id} onChange={(event) => updateAssignment(request.request_id, { touchpoint_id: event.target.value })} placeholder="TP-01" /></label>
                </div>
                <div className="device-actions"><button className="primary-btn" type="button" disabled={busy === request.request_id} onClick={() => approve(request)}><i className="bi bi-check2-circle" /> Approve</button><button className="danger-btn" type="button" disabled={busy === request.request_id} onClick={() => reject(request)}>Reject</button></div>
              </article>
            );
          })}</div>
        )}
      </section>

      <section className="panel filter-bar">
        <label className="field compact"><span>Registered devices store</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Select branch</option>{branches.map((branch) => <option key={getBranchId(branch)} value={getBranchId(branch)}>{getBranchLabel(branch)}</option>)}</select></label>
        <div className="filter-summary"><strong>{current ? getBranchName(current) : 'No store selected'}</strong><span>{current ? `${getStoreNumber(current) || 'Store number not configured'} - ` : ''}{devices.length} registered device{devices.length === 1 ? '' : 's'}</span></div>
      </section>
      {error && <div className="alert danger">{error}</div>}
      <section className="device-grid">
        {devices.map((device, index) => <article className="device-card" key={device.id || index}><div className="device-icon"><i className="bi bi-display" /></div><div className="device-card-head"><div><h3>{device.device_name || device.name || device.device_id || `POS ${index + 1}`}</h3><span className="mono">{device.device_id || device.id}</span></div><span className={`status-badge ${device.is_active === false || device.active === false ? 'status-future' : 'status-live'} compact`}>{device.is_active === false || device.active === false ? 'Inactive' : 'Registered'}</span></div><div className="device-facts"><Fact label="Store Number" value={device.store_number || getStoreNumber(current) || '-'} /><Fact label="POS No" value={device.pos_no || device.terminal_id || '-'} /><Fact label="Touchpoint" value={device.touchpoint_id || '-'} /></div><div className="device-facts"><Fact label="Branch" value={current ? getBranchName(current) : '-'} /><Fact label="Last seen" value={device.last_login_at || device.last_seen_at || device.last_seen || 'Telemetry pending'} /><Fact label="Version" value={device.app_version || device.version || 'Not reported'} /></div><div className="device-actions"><button className="secondary-btn" type="button"><i className="bi bi-activity" /> Diagnostics</button>{device.is_active !== false && device.active !== false && <button className="danger-btn" type="button" onClick={() => deactivate(device)}>Deactivate</button>}</div></article>)}
        {!devices.length && <div className="panel empty-state full"><i className="bi bi-pc-display" /><strong>No POS devices registered</strong><span>Start a physical POS and send a registration request. Approve it above to attach it to a store.</span></div>}
      </section>
    </div>
  );
}

function Fact({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
