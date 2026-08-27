import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

export default function DevicesPage(){
  const [params]=useSearchParams();
  const [branches,setBranches]=useState([]);
  const [branchId,setBranchId]=useState(params.get('branch')||'');
  const [devices,setDevices]=useState([]);
  const [requests,setRequests]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');
  const [assignments,setAssignments]=useState({});
  const [setup,setSetup]=useState({branch_id:'',terminal_id:''});
  const [setupCode,setSetupCode]=useState(null);

  useEffect(()=>{api.branches().then(r=>{const b=unwrap(r);const list=Array.isArray(b)?b:(b?.branches||[]);setBranches(list);if(!branchId&&list[0]?.id)setBranchId(String(list[0].id));}).catch(()=>setError('Unable to load branches.'));},[]);
  const loadDevices=async(id)=>{if(!id)return;try{const r=await api.branchDevices(id);const b=unwrap(r);setDevices(Array.isArray(b)?b:(b?.devices||[]));}catch(err){setError(err?.response?.data?.message||'Unable to load POS devices.');}};
  const loadRequests=async()=>{try{const r=await api.posRegistrationRequests('PENDING');const b=unwrap(r);setRequests(Array.isArray(b)?b:(b?.requests||[]));}catch(err){setError(err?.response?.data?.message||'Unable to load POS registration requests.');}};
  useEffect(()=>{loadDevices(branchId);},[branchId]);
  useEffect(()=>{loadRequests();const id=setInterval(loadRequests,15000);return()=>clearInterval(id);},[]);
  useEffect(()=>{window.addEventListener('customerhub:refresh-pos-requests',loadRequests);return()=>window.removeEventListener('customerhub:refresh-pos-requests',loadRequests);},[]);
  const current=useMemo(()=>branches.find(b=>String(b.id)===String(branchId)),[branches,branchId]);
  const deactivate=async(d)=>{if(!branchId||!d?.id)return;try{await api.deactivateDevice(branchId,d.id);await loadDevices(branchId);}catch(err){setError(err?.response?.data?.message||'Unable to update device.');}};
  const updateAssignment=(requestId,patch)=>setAssignments(prev=>({...prev,[requestId]:{branch_id:prev[requestId]?.branch_id||branchId||'',terminal_id:prev[requestId]?.terminal_id||'',...patch}}));
  const approve=async(request)=>{
    const values=assignments[request.request_id]||{branch_id:branchId,terminal_id:''};
    if(!values.branch_id||!String(values.terminal_id||'').trim()){setError('Choose a branch and enter a terminal ID before approval.');return;}
    setBusy(request.request_id);setError('');
    try{await api.approvePosRegistration(request.request_id,{branch_id:String(values.branch_id),terminal_id:String(values.terminal_id).trim()});await loadRequests();if(String(values.branch_id)===String(branchId))await loadDevices(branchId);}catch(err){setError(err?.response?.data?.message||err?.response?.data?.code||'Unable to approve POS registration.');}finally{setBusy('');}
  };
  const reject=async(request)=>{setBusy(request.request_id);setError('');try{await api.rejectPosRegistration(request.request_id);await loadRequests();}catch(err){setError(err?.response?.data?.message||'Unable to reject POS registration.');}finally{setBusy('');}};
  const createSetup=async(event)=>{
    event.preventDefault();
    const branch_id=String(setup.branch_id||branchId||'').trim();
    const terminal_id=String(setup.terminal_id||'').trim();
    if(!branch_id||!terminal_id){setError('Choose a store and enter a terminal ID to generate a setup code.');return;}
    setBusy('setup-code');setError('');
    try{
      const r=await api.createPosSetupCode({branch_id,terminal_id});
      const body=unwrap(r);
      setSetupCode(body);
      setSetup({branch_id,terminal_id:''});
      await loadRequests();
    }catch(err){setError(err?.response?.data?.message||err?.response?.data?.code||'Unable to create POS setup code.');}
    finally{setBusy('');}
  };

  return <div className="page-stack">
    <PageHeader title="POS Setup & Approvals" subtitle="Approve physical POS registration requests, assign stores and monitor active terminals." action={<button className="secondary-btn" onClick={loadRequests}><i className="bi bi-arrow-clockwise"/> Refresh requests</button>}/>

    <section className="panel">
      <div className="section-heading"><div><h2>Generate POS setup code</h2><p>Create a short one-time code for a new physical POS. The POS enters this code once and stores its approved device identity locally.</p></div><span className="status-badge status-live compact">15 min</span></div>
      <form className="form-grid three-col" onSubmit={createSetup}>
        <label className="field"><span>Store</span><select value={setup.branch_id||branchId} onChange={e=>setSetup(prev=>({...prev,branch_id:e.target.value}))}><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name||b.branch_name||b.id}</option>)}</select></label>
        <label className="field"><span>Terminal ID</span><input value={setup.terminal_id} onChange={e=>setSetup(prev=>({...prev,terminal_id:e.target.value}))} placeholder="POS-01"/></label>
        <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy==='setup-code'}><i className="bi bi-key"/> {busy==='setup-code'?'Generating...':'Generate setup code'}</button></div>
      </form>
      {setupCode&&<div className="state-card good"><div><strong>Setup code</strong><span>Enter this on the new POS. It expires at {setupCode.expires_at?new Date(setupCode.expires_at).toLocaleTimeString():'soon'}.</span></div><code className="setup-code">{setupCode.setup_code}</code></div>}
    </section>

    <section className="panel">
      <div className="section-heading"><div><h2>Pending registration requests</h2><p>A POS can request access, but only a tenant admin can choose its store and terminal identity.</p></div><span className="status-badge status-live compact">{requests.length} pending</span></div>
      {requests.length===0?<div className="empty-state"><i className="bi bi-shield-check"/><strong>No pending POS requests</strong><span>New physical terminals will appear here after they select “Register this POS”.</span></div>:<div className="device-grid">{requests.map((r)=>{const a=assignments[r.request_id]||{branch_id:branchId||'',terminal_id:''};return <article className="device-card" key={r.request_id}><div className="device-icon"><i className="bi bi-pc-display-horizontal"/></div><div className="device-card-head"><div><h3>{r.device_name||'New POS terminal'}</h3><span className="mono">{r.device_id}</span></div><span className="status-badge status-future compact">Pending</span></div><div className="device-facts"><Fact label="Installation" value={r.installation_id||'Not reported'}/><Fact label="OS" value={r.os_info||'Not reported'}/><Fact label="Requested" value={r.requested_at?new Date(r.requested_at).toLocaleString():'Now'}/></div><div className="form-grid"><label className="field"><span>Assign store</span><select value={a.branch_id} onChange={e=>updateAssignment(r.request_id,{branch_id:e.target.value})}><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name||b.branch_name||b.id}</option>)}</select></label><label className="field"><span>Terminal ID</span><input value={a.terminal_id} onChange={e=>updateAssignment(r.request_id,{terminal_id:e.target.value})} placeholder="POS-01"/></label></div><div className="device-actions"><button className="primary-btn" type="button" disabled={busy===r.request_id} onClick={()=>approve(r)}><i className="bi bi-check2-circle"/> Approve</button><button className="danger-btn" type="button" disabled={busy===r.request_id} onClick={()=>reject(r)}>Reject</button></div></article>})}</div>}
    </section>

    <section className="panel filter-bar"><label className="field compact"><span>Registered devices store</span><select value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name||b.branch_name||b.id}</option>)}</select></label><div className="filter-summary"><strong>{current?.name||current?.branch_name||'No store selected'}</strong><span>{devices.length} registered device{devices.length===1?'':'s'}</span></div></section>
    {error&&<div className="alert danger">{error}</div>}
    <section className="device-grid">{devices.map((d,i)=><article className="device-card" key={d.id||i}><div className="device-icon"><i className="bi bi-display"/></div><div className="device-card-head"><div><h3>{d.device_name||d.name||d.device_id||`POS ${i+1}`}</h3><span className="mono">{d.device_id||d.id}</span></div><span className={`status-badge ${d.is_active===false||d.active===false?'status-future':'status-live'} compact`}>{d.is_active===false||d.active===false?'Inactive':'Registered'}</span></div><div className="device-facts"><Fact label="Branch" value={current?.name||current?.branch_name||'—'}/><Fact label="Last seen" value={d.last_login_at||d.last_seen_at||d.last_seen||'Telemetry pending'}/><Fact label="Version" value={d.app_version||d.version||'Not reported'}/></div><div className="device-actions"><button className="secondary-btn" type="button"><i className="bi bi-activity"/> Diagnostics</button>{d.is_active!==false&&d.active!==false&&<button className="danger-btn" type="button" onClick={()=>deactivate(d)}>Deactivate</button>}</div></article>)}{!devices.length&&<div className="panel empty-state full"><i className="bi bi-pc-display"/><strong>No POS devices registered</strong><span>Start a physical POS and send a registration request. Approve it above to attach it to a store.</span></div>}</section>
  </div>;
}
function Fact({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}
