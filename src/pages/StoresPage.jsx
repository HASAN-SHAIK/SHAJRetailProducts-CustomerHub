import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

export default function StoresPage() {
  const [branches,setBranches]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [name,setName]=useState('');
  const [error,setError]=useState('');
  const load=()=>api.branches().then(r=>{const b=unwrap(r);setBranches(Array.isArray(b)?b:(b?.branches||[]));}).catch(()=>setError('Unable to load branches.'));
  useEffect(()=>{load();},[]);
  const create=async(e)=>{e.preventDefault();setError('');try{await api.createBranch({name});setName('');setShowForm(false);await load();}catch(err){setError(err?.response?.data?.message||'Unable to create branch.');}};
  return <div className="page-stack"><PageHeader title="Stores & Branches" subtitle="Manage physical stores and the hierarchy POS terminals inherit from." action={<button className="primary-btn" onClick={()=>setShowForm(!showForm)}><i className="bi bi-plus-lg"/> Add store</button>}/>{showForm&&<form className="panel inline-form" onSubmit={create}><label className="field"><span>Store / branch name</span><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Main Store"/></label><button className="primary-btn">Create</button></form>}{error&&<div className="alert danger">{error}</div>}<section className="panel"><div className="table-head"><div><h2>Store fleet</h2><p>{branches.length} configured branch{branches.length===1?'':'es'}</p></div></div><div className="data-table"><div className="data-row header"><span>Store</span><span>Code / ID</span><span>Status</span><span>POS management</span></div>{branches.map((b,i)=><div className="data-row" key={b.id||i}><span><strong>{b.name||b.branch_name||`Branch ${i+1}`}</strong><small>{b.city||b.address||'Address not configured'}</small></span><span className="mono">{b.code||b.id||'—'}</span><span><span className="status-badge status-live compact">Active</span></span><span><Link to={`/pos-setup?branch=${encodeURIComponent(b.id||'')}`} className="text-link">Manage POS setup <i className="bi bi-arrow-right"/></Link></span></div>)}{!branches.length&&<div className="empty-state"><i className="bi bi-shop"/><strong>No stores yet</strong><span>Create a branch to start registering POS terminals.</span></div>}</div></section><section className="panel"><h2>Future store controls</h2><div className="chip-list">{['Business hours','Store-specific tax registration','Warehouse mode','Regional pricing','Transfer rules','Opening/closing policy','Geo/device restrictions','Store-level overrides'].map(x=><span className="feature-chip" key={x}>{x}</span>)}</div></section></div>;
}
