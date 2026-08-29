import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const getBranchId = (branch) => branch.id || branch.branch_id || '';
const getStoreNumber = (branch) => branch.store_number || branch.storeNumber || branch.code || '';
const getBranchName = (branch, index) => branch.name || branch.branch_name || branch.store_name || `Branch ${index + 1}`;

export default function StoresPage() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ store_number: '', name: '', location: '' });
  const [error, setError] = useState('');

  const load = () => api.branches()
    .then((response) => {
      const body = unwrap(response);
      setBranches(Array.isArray(body) ? body : (body?.branches || []));
    })
    .catch(() => setError('Unable to load branches.'));

  useEffect(() => { load(); }, []);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const create = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api.createBranch({
        store_number: form.store_number,
        name: form.name,
        location: form.location || undefined,
      });
      setForm({ store_number: '', name: '', location: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to create branch.');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Stores & Branches"
        subtitle="Manage physical stores and the hierarchy POS terminals inherit from."
        action={<button className="primary-btn" onClick={() => setShowForm(!showForm)}><i className="bi bi-plus-lg" /> Add store</button>}
      />

      {showForm && (
        <form className="panel inline-form" onSubmit={create}>
          <label className="field">
            <span>Store Number</span>
            <input value={form.store_number} onChange={(event) => updateForm('store_number', event.target.value)} required placeholder="STORE-001" />
          </label>
          <label className="field">
            <span>Store / branch name</span>
            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} required placeholder="Main Store" />
          </label>
          <label className="field">
            <span>Location</span>
            <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Hyderabad" />
          </label>
          <button className="primary-btn">Create</button>
        </form>
      )}

      {error && <div className="alert danger">{error}</div>}

      <section className="panel">
        <div className="table-head">
          <div>
            <h2>Store fleet</h2>
            <p>{branches.length} configured branch{branches.length === 1 ? '' : 'es'}</p>
          </div>
        </div>
        <div className="data-table store-fleet-table">
          <div className="data-row header">
            <span>Store</span>
            <span>Store Number</span>
            <span>Branch ID</span>
            <span>Status</span>
            <span>POS management</span>
          </div>
          {branches.map((branch, index) => {
            const branchId = getBranchId(branch);
            const storeNumber = getStoreNumber(branch);
            return (
              <div className="data-row" key={branchId || index}>
                <span>
                  <strong>{getBranchName(branch, index)}</strong>
                  <small>{branch.location || branch.city || branch.address || 'Address not configured'}</small>
                </span>
                <span className="mono">{storeNumber || 'Not configured'}</span>
                <span className="mono">{branchId || '-'}</span>
                <span><span className={`status-badge ${branch.is_active === false ? 'status-future' : 'status-live'} compact`}>{branch.is_active === false ? 'Inactive' : 'Active'}</span></span>
                <span><Link to={`/stores-pos/registered-devices?branch=${encodeURIComponent(branchId)}`} className="text-link">Manage POS setup <i className="bi bi-arrow-right" /></Link></span>
              </div>
            );
          })}
          {!branches.length && (
            <div className="empty-state">
              <i className="bi bi-shop" />
              <strong>No stores yet</strong>
              <span>Create a branch to start registering POS terminals.</span>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Future store controls</h2>
        <div className="chip-list">
          {['Business hours', 'Store-specific tax registration', 'Warehouse mode', 'Regional pricing', 'Transfer rules', 'Opening/closing policy', 'Geo/device restrictions', 'Store-level overrides'].map((item) => <span className="feature-chip" key={item}>{item}</span>)}
        </div>
      </section>
    </div>
  );
}
