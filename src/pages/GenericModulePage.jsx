import React from 'react';
import { genericModules } from '../config/capabilities';
import StatusBadge from '../components/StatusBadge';
import { PageHeader } from './BusinessPage';

export default function GenericModulePage({ moduleKey, status='contract' }){
  const mod=genericModules[moduleKey];
  return <div className="page-stack"><PageHeader title={mod.title} subtitle={mod.subtitle} action={<StatusBadge status={status}/>}/><div className="module-section-grid">{mod.sections.map(([title,items])=><section className="panel module-card" key={title}><h2>{title}</h2><div className="module-items">{items.map(item=><div className="module-item" key={item}><i className="bi bi-check2-circle"/><span>{item}</span><small>{status==='future'?'Future roadmap':'Contract/design ready'}</small></div>)}</div></section>)}</div><section className="panel subtle"><div className="panel-title"><i className="bi bi-info-circle"/><div><h2>No fake controls</h2><p>This capability is represented in the Hub architecture now, but actions stay disabled until Backend or POSService contracts exist. That keeps the UI future-ready without pretending an operation succeeded.</p></div></div></section></div>;
}
