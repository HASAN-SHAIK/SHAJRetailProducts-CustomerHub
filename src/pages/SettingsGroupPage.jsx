import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const definitions={
  receipts:{title:'Receipts & Printing',subtitle:'Configure customer receipts and printer defaults.',group:'printer',fields:[['receipt_paper_width_mm','Receipt paper width (mm)','number']],future:['Auto print','Copies','Header logo','QR/UPI block','Branch-specific printers','Email/WhatsApp receipt','Cash drawer trigger','QZ/native bridge']},
  tax:{title:'Tax & GST',subtitle:'Manage GST mode and default tax behavior.',group:'tax',fields:[['gst_mode','GST price mode','select'],['default_tax_percent','Default tax %','number']],future:['Branch GST registration','HSN policy','Tax exemptions','E-invoice','E-way bill defaults','Filing periods','State/place-of-supply rules']}
};

export default function SettingsGroupPage({kind}){
  const def=definitions[kind]; const [settings,setSettings]=useState({}); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  useEffect(()=>{api.applicationSettings().then(r=>{const s=unwrap(r,'settings');setSettings(s?.[def.group]||{});}).catch(()=>setMessage('Unable to load current settings.'));},[kind]);
  const save=async(e)=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await api.updateApplicationSettings({[def.group]:settings});const s=unwrap(r,'settings');setSettings(s?.[def.group]||settings);setMessage('Settings saved.');}catch(err){setMessage(err?.response?.data?.message||'Save failed.');}finally{setBusy(false)}};
  return <div className="page-stack"><PageHeader title={def.title} subtitle={def.subtitle}/><form className="panel form-panel" onSubmit={save}><div className="form-grid">{def.fields.map(([key,label,type])=><label className="field" key={key}><span>{label}</span>{type==='select'?<select value={settings[key]||'INCLUSIVE'} onChange={e=>setSettings({...settings,[key]:e.target.value})}><option>INCLUSIVE</option><option>EXCLUSIVE</option></select>:<input type={type} value={settings[key]??''} onChange={e=>setSettings({...settings,[key]:e.target.value})}/>}</label>)}</div>{message&&<div className="inline-message">{message}</div>}<div className="form-actions"><span>These controls are backed by /settings/application.</span><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Save settings'}</button></div></form><section className="panel"><h2>Planned controls</h2><div className="chip-list">{def.future.map(x=><span className="feature-chip" key={x}>{x}</span>)}</div></section></div>;
}
