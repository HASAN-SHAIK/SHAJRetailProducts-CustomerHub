import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const code=(value)=>String(value||'').trim().toUpperCase();

export default function DevicesPage(){
  const [params]=useSearchParams();
  const [branches,setBranches]=useState([]);
  const [branchId,setBranchId]=useState(params.get('branch')||'');
  const [devices,setDevices]=useState([]);
  const [requests,setRequests]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');

  useEffect(()=>{api.branches().then(r=>{const b=unwrap(r);const list=Array.isArray(b)?b:(b?.branches||[]);setBranches(list);if(!branchId&&list[0]?.id)setBranchId(String(list[0].id));}).catch(()=>setError('Unable to load stores.'));},[]);
  const loadDevices=async(id)=>{if(!id)return;try{const r=await api.branchDevices(id);const b=unwrap(r);setDevices(Array.isArray(b)?b:(b?.devices||[]));}catch(err){setError(err?.response?.data?.message||'Unable to load POS devices.');}};
  const loadRequests=async()=>{try{const r=await api.posRegistrationRequests('PENDING');const b=unwrap(r);setRequests(Array.isArray(b)?b:(b?.requests||[]));}catch(err){setError(err?.response?.data?.message||'Unable to load POS registration requests.');}};
  useEffect(()=>{loadDevices(branchId);},[branchId]);
  useEffect(()=>{loadRequests();const id=setInterval(loadRequests,15000);return()=>clearInterval(id);},[]);
  const current=useMemo(()=>branches.find(b=>String(b.id)===String(branchId)),[branches,branchId]);
  const deactivate=async(d)=>{if(!branchId||!d?.id)return;try{await api.deactivateDevice(branchId,d.id);await loadDevices(branchId);}catch(err){setError(err?.response?.data?.message||'Unable to update device.');}};
  const approve=async(request)=>{
    if(!request?.branch_id||!request?.store_number||!request?.pos_no||!request?.touchpoint_id){setError('This request is missing Store Number, POS No or Touchpoint ID. Reject it and re-register from the POS.');return;}
    setBusy(request.request_id);setError('');
    try{
      await api.approvePosRegistration(request.request_id,{});
      await loadRequests();
      if(String(request.branch_id)===String(branchId))await loadDevices(branchId);
    }catch(err){setError(err?.response?.data?.message||err?.response?.data?.code||'Unable to approve POS registration.');}finally{setBusy('');}
  };
  const reject=async(request)=>{setBusy(request.request_id);setError('');try{await api.rejectPosRegistration(request.request_id);await loadRequests();}catch(err){setError(err?.response?.data?.message||'Unable to reject POS registration.');}finally{setBusy('');}};

  return <div className="page-stack">
    <PageHeader title="POS & Devices" subtitle="Approve the exact Store Number + POS No + Touchpoint ID requested by each physical POS, then monitor active devices." action={<button className="secondary-btn" onClick={loadRequests}><i className="bi bi-arrow-clockwise"/> Refresh requests</button>}/>

    <section className="panel">
      <div className="section-heading"><div><h2>Pending registration requests</h2><p>The POS declares its business identity. RetailHub validates and approves that exact identity; it does not silently remap the device.</p></div><span className="status-badge status-live compact">{requests.length} pending</span></div>
      {requests.length===0?<div className="empty-state"><i className="bi bi-shield-check"/><strong>No pending POS requests</strong><span>New physical POS devices appear here after entering Store Number, POS No and Touchpoint ID.</span></div>:<div className="device-grid">{requests.map((r)=><article className="device-card" key={r.request_id}><div className="device-icon"><i className="bi bi-pc-display-horizontal"/></div><div className="device-card-head"><div><h3>{r.device_name||'New POS device'}</h3><span className="mono">{r.device_id}</span></div><span className="status-badge status-future compact">Pending</span></div><div className="device-facts"><Fact label="Store Number" value={code(r.store_number)||'Missing'}/><Fact label="POS No" value={code(r.pos_no)||'Missing'}/><Fact label="Touchpoint ID" value={code(r.touchpoint_id)||'Missing'}/><Fact label="Installation" value={r.installation_id||'Not reported'}/><Fact label="Requested" value={r.requested_at?new Date(r.requested_at).toLocaleString():'Now'}/></div><div className="device-actions"><button className="primary-btn" type="button" disabled={busy===r.request_id||!r.store_number||!r.pos_no||!r.touchpoint_id} onClick={()=>approve(r)}><i className="bi bi-check2-circle"/> Approve exact identity</button><button className="danger-btn" type="button" disabled={busy===r.request_id} onClick={()=>reject(r)}>Reject</button></div></article>)}</div>}
    </section>

    <section className="panel filter-bar"><label className="field compact"><span>Registered devices store</span><select value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">Select store</option>{branches.map(b=><option key={b.id} value={b.id}>{b.store_number?`${b.store_number} · `:''}{b.name||b.branch_name||b.id}</option>)}</select></label><div className="filter-summary"><strong>{current?.store_number?`${current.store_number} · `:''}{current?.name||current?.branch_name||'No store selected'}</strong><span>{devices.length} registered device{devices.length===1?'':'s'}</span></div></section>
    {error&&<div className="alert danger">{error}</div>}
    <section className="device-grid">{devices.map((d,i)=><article className="device-card" key={d.id||i}><div className="device-icon"><i className="bi bi-display"/></div><div className="device-card-head"><div><h3>{d.device_name||d.name||d.device_id||`POS ${i+1}`}</h3><span className="mono">{d.device_id||d.id}</span></div><span className={`status-badge ${d.is_active===false||d.active===false?'status-future':'status-live'} compact`}>{d.is_active===false||d.active===false?'Inactive':'Registered'}</span></div><div className="device-facts"><Fact label="Store Number" value={d.store_number||current?.store_number||'—'}/><Fact label="POS No" value={d.pos_no||'—'}/><Fact label="Touchpoint ID" value={d.touchpoint_id||'—'}/><Fact label="Last seen" value={d.last_login_at||d.last_seen_at||d.last_seen||'Telemetry pending'}/></div><div className="device-actions"><button className="secondary-btn" type="button"><i className="bi bi-activity"/> Diagnostics</button>{d.is_active!==false&&d.active!==false&&<button className="danger-btn" type="button" onClick={()=>deactivate(d)}>Deactivate</button>}</div></article>)}{!devices.length&&<div className="panel empty-state full"><i className="bi bi-pc-display"/><strong>No POS devices registered</strong><span>Start a physical POS and register it with Store Number, POS No and Touchpoint ID.</span></div>}</section>
  </div>;
}
function Fact({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}
