import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../lib/api';
import UserCreateForm from './UserCreateForm';
import UserAccessList from './UserAccessList';

export default function UserDirectory() {
  const [users,setUsers]=useState([]), [branches,setBranches]=useState([]), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const load=async()=>{setBusy(true);try{const [ur,br]=await Promise.all([api.users(),api.branches()]);const ub=unwrap(ur),bb=unwrap(br),bl=bb?.branches||bb?.data?.branches||bb?.data||bb||[];setUsers(Array.isArray(ub?.users)?ub.users:[]);setBranches(Array.isArray(bl)?bl:[]);}catch(error){setMessage(error?.response?.data?.message||error?.response?.data?.error||'Unable to load users.');}finally{setBusy(false)}};
  useEffect(()=>{load();},[]);
  return <><UserCreateForm branches={branches} onCreated={load} busy={busy} setBusy={setBusy} setMessage={setMessage}/>{message&&<div className="inline-message">{message}</div>}<section className="panel"><div className="panel-title"><i className="bi bi-people"/><div><h2>Tenant users</h2><p>{users.length} login user{users.length===1?'':'s'}.</p></div></div><UserAccessList users={users} branches={branches} reload={load} busy={busy} setBusy={setBusy} setMessage={setMessage}/></section></>;
}
