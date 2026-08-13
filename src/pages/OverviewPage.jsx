import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

export default function OverviewPage() {
  const [state, setState] = useState({ settings:null, branches:[], pos:null, central:false });
  const refresh = async () => {
    const [settingsRes, branchesRes, posRes] = await Promise.allSettled([api.applicationSettings(), api.branches(), api.posHealth()]);
    const settings = settingsRes.status === 'fulfilled' ? unwrap(settingsRes.value,'settings') : null;
    const branchBody = branchesRes.status === 'fulfilled' ? unwrap(branchesRes.value) : {};
    const branches = Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []);
    const pos = posRes.status === 'fulfilled' ? posRes.value?.data : null;
    setState({ settings, branches, pos, central: settingsRes.status === 'fulfilled' || branchesRes.status === 'fulfilled' });
  };
  useEffect(() => { refresh(); }, []);
  const company = state.settings?.company || {};
  const setupScore = useMemo(() => { const checks=[company.shop_name,company.mobile_number,state.branches.length>0,state.settings?.tax,state.settings?.printer]; return Math.round(checks.filter(Boolean).length/checks.length*100); }, [company,state]);
  return <div className="page-stack">
    <section className="hero-panel"><div><span className="eyebrow">Retail operating system</span><h1>{company.shop_name || 'Your retail business'}</h1><p>One place to configure stores, POS terminals, policies, offline operations and future retail capabilities.</p></div><div className="hero-actions"><button className="secondary-btn" onClick={refresh}><i className="bi bi-arrow-clockwise"/> Refresh health</button><Link className="primary-btn link-btn" to="/business"><i className="bi bi-sliders"/> Configure business</Link></div></section>
    <div className="metric-grid"><Metric icon="bi-building-check" label="Business setup" value={`${setupScore}%`} tone={setupScore===100?'good':'warn'}/><Metric icon="bi-shop" label="Stores & branches" value={state.branches.length} tone="info"/><Metric icon="bi-cloud-check" label="Central backend" value={state.central?'Connected':'Unavailable'} tone={state.central?'good':'bad'}/><Metric icon="bi-hdd-network" label="Local POS service" value={state.pos?.status==='ok'?'Healthy':'Not detected'} tone={state.pos?.status==='ok'?'good':'warn'}/></div>
    <div className="content-grid two-one"><section className="panel"><PanelTitle icon="bi-diagram-3" title="Control-plane health" subtitle="What each runtime currently reports"/><div className="health-list"><Health name="Customer Hub" detail="Configuration and fleet management" status="good" text="Online"/><Health name="Central Backend" detail="Tenant data and policy authority" status={state.central?'good':'bad'} text={state.central?'Connected':'Check API'}/><Health name="POS Service" detail="SQLite, local transactions and synchronization" status={state.pos?.status==='ok'?'good':'warn'} text={state.pos?.status==='ok'?'Healthy':'Endpoint not available'}/><Health name="POS Frontend" detail="Cashier runtime consumes effective configuration" status="info" text="Managed externally"/></div></section><section className="panel"><PanelTitle icon="bi-lightning-charge" title="Next actions" subtitle="Highest-value setup tasks"/><div className="action-list">{!company.shop_name&&<Action to="/business" title="Complete business profile"/>}{state.branches.length===0&&<Action to="/stores" title="Create your first store"/>}<Action to="/devices" title="Register POS terminals"/><Action to="/offline-sync" title="Verify offline readiness"/></div></section></div>
    <section className="panel"><PanelTitle icon="bi-stack" title="Configuration inheritance" subtitle="System defaults → business → store → POS → effective local config"/><div className="inheritance"><Node title="SHAJ defaults" meta="Platform"/><Arrow/><Node title="Business" meta="Tenant"/><Arrow/><Node title="Store" meta="Branch override"/><Arrow/><Node title="POS terminal" meta="Device override"/><Arrow/><Node title="Effective config" meta="Cached locally" accent/></div></section>
    <section className="panel"><PanelTitle icon="bi-compass" title="Capability map" subtitle="Current APIs plus future-ready customer controls"/><div className="capability-grid">{[['Business & tax','live'],['Stores & devices','live'],['Receipts & printing','live'],['Offline diagnostics','partial'],['Billing policies','partial'],['Inventory policies','partial'],['Users & access','contract'],['Payments','contract'],['Integrations','contract'],['Security & audit','contract'],['Automation','future'],['AI & insights','future']].map(([name,status])=><div className="capability-card" key={name}><strong>{name}</strong><StatusBadge status={status}/></div>)}</div></section>
  </div>;
}
function Metric({icon,label,value,tone}){return <div className={`metric-card tone-${tone}`}><i className={`bi ${icon}`}/><div><span>{label}</span><strong>{value}</strong></div></div>}
function PanelTitle({icon,title,subtitle}){return <div className="panel-title"><i className={`bi ${icon}`}/><div><h2>{title}</h2><p>{subtitle}</p></div></div>}
function Health({name,detail,status,text}){return <div className="health-row"><span className={`health-dot ${status}`}/><div><strong>{name}</strong><span>{detail}</span></div><b>{text}</b></div>}
function Action({to,title}){return <Link to={to} className="action-row"><span>{title}</span><i className="bi bi-arrow-right"/></Link>}
function Node({title,meta,accent}){return <div className={`inherit-node ${accent?'accent':''}`}><strong>{title}</strong><span>{meta}</span></div>}
function Arrow(){return <i className="bi bi-chevron-right inherit-arrow"/>}
