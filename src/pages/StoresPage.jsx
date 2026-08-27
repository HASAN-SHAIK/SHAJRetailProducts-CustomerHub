import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const normalizeStoreNumber = (value) => String(value || '').trim().toUpperCase();

export default function StoresPage() {
  const [branches,setBranches]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [storeNumber,setStoreNumber]=useState('');
  const [name,setName]=useState('');
  const [error,setError]=useState('');
  const load=()=>api.branches().then(r=>{const b=unwrap(r);setBranches(Array.isArray(b)?b:(b?.branches||[]));}).catch(()=>setError('Unable to load stores.'));
  useEffect(()=>{load();},[]);
  const create=async(e)=>{
    e.preventDefault();
    setError('');
    const normalizedStoreNumber=normalizeStoreNumber(storeNumber);
    if(!normalizedStoreNumber){setError('Store Number is required.');return;}
    try{
      await api.createBranch({store_number:normalizedStoreNumber,name:String(name||'').trim()});
      setStoreNumber('');setName('');setShowForm(false);await load();
    }catch(err){setError(err?.response?.data?.message||err?.response?.data?.error||'Unable to create store.');}
  };
  return <div className="page-stack">
    <PageHeader title="Stores & Branches" subtitle="Manage physical stores. Store Number is the business-facing identifier inherited by every POS and touchpoint." action={<button className="primary-btn" onClick={()=>setShowForm(!showForm)}><i className="bi bi-plus-lg"/> Add store</button>}/>
    {showForm&&<form className="panel inline-form" onSubmit={create}>
      <label className="field"><span>Store Number</span><input value={storeNumber} onChange={e=>setStoreNumber(e.target.value.toUpperCase())} required placeholder="STORE-001"/></label>
      <label className="field"><span>Store / branch name</span><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Main Store"/></label>
      <button className="primary-btn">Create</button>
    </form>}
    {error&&<div className="alert danger">{error}</div>}
    <section className="panel"><div className="table-head"><div><h2>Store fleet</h2><p>{branches.length} configured store{branches.length===1?'':'s'}</p></div></div><div className="data-table">
      <div className="data-row header"><span>Store</span><span>Store Number</span><span>Status</span><span>POS management</span></div>
      {branches.map((b,i)=><div className="data-row" key={b.id||i}><span><strong>{b.name||b.branch_name||`Store ${i+1}`}</strong><small>{b.city||b.address||b.location||'Address not configured'}</small></span><span className="mono">{b.store_number||b.storeNumber||'Not configured'}</span><span><span className={`status-badge ${b.is_active===false?'status-future':'status-live'} compact`}>{b.is_active===false?'Inactive':'Active'}</span></span><span><Link to={`/devices?branch=${encodeURIComponent(b.id||'')}`} className="text-link">Manage POS & touchpoints <i className="bi bi-arrow-right"/></Link></span></div>)}
      {!branches.length&&<div className="empty-state"><i className="bi bi-shop"/><strong>No stores yet</strong><span>Create a store with a Store Number before registering POS terminals.</span></div>}
    </div></section>
    <section className="panel"><h2>Future store controls</h2><div className="chip-list">{['Business hours','Store-specific tax registration','Warehouse mode','Regional pricing','Transfer rules','Opening/closing policy','Geo/device restrictions','Store-level overrides'].map(x=><span className="feature-chip" key={x}>{x}</span>)}</div></section>
  </div>;
}
