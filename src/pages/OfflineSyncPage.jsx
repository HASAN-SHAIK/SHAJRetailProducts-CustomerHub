import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { PageHeader } from './BusinessPage';
import StatusBadge from '../components/StatusBadge';

const emptyCounts = { pending: 0, processing: 0, published: 0, failed: 0, dead_letter: 0 };

export default function OfflineSyncPage() {
  const [pos, setPos] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [syncDiagnostics, setSyncDiagnostics] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const check = async () => {
    setChecking(true);
    setMessage('');
    try {
      const local = await firstSuccessful([
        () => api.posStatus(),
        () => api.posReady(),
        () => api.posHealth(),
      ]);
      setPos({ ok: isReady(local?.data), data: local?.data || {}, source: local?.source });

      const [configRes, diagnosticsRes, syncDiagnosticsRes, syncStatusRes] = await Promise.allSettled([
        api.posConfiguration(),
        api.posDiagnostics(),
        api.posSyncDiagnostics(),
        api.posSyncStatus(),
      ]);
      setConfiguration(valueOrNull(configRes));
      setDiagnostics(valueOrNull(diagnosticsRes));
      setSyncDiagnostics(valueOrNull(syncDiagnosticsRes));
      setSyncStatus(valueOrNull(syncStatusRes));
    } catch {
      setPos({ ok: false, data: {} });
      setConfiguration(null);
      setDiagnostics(null);
      setSyncDiagnostics(null);
      setSyncStatus(null);
    } finally {
      setChecking(false);
    }
  };

  const refreshConfig = async () => {
    setRefreshing(true);
    setMessage('');
    try {
      const r = await api.refreshPosConfiguration();
      setMessage(Boolean(r?.data?.changed) ? 'POS configuration updated from Central.' : 'POS configuration is already current.');
      await check();
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data?.code || 'Configuration refresh is not available from this local POS runtime.');
    } finally {
      setRefreshing(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const r = await api.runPosSync();
      const published = r?.data?.published ?? r?.data?.synced ?? 0;
      setMessage(published ? `${published} local transaction event${published === 1 ? '' : 's'} sent to Central.` : 'Manual sync completed. No pending local transaction events were ready.');
      await check();
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data?.code || 'Manual transaction sync is not available from this local POS runtime yet.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { check(); }, []);

  const model = useMemo(() => buildReadinessModel({ pos, configuration, diagnostics, syncDiagnostics, syncStatus }), [pos, configuration, diagnostics, syncDiagnostics, syncStatus]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Offline & Sync"
        subtitle="See whether stores can keep selling when the internet or central Backend is unavailable."
        action={<div className="hero-actions"><button className="secondary-btn" onClick={check} disabled={checking}><i className="bi bi-arrow-clockwise" /> {checking ? 'Checking...' : 'Check local POS'}</button><button className="secondary-btn" onClick={runSync} disabled={syncing || !pos?.ok}><i className="bi bi-arrow-repeat" /> {syncing ? 'Syncing...' : 'Sync now'}</button><button className="primary-btn" onClick={refreshConfig} disabled={refreshing || !pos?.ok}><i className="bi bi-cloud-download" /> {refreshing ? 'Refreshing...' : 'Refresh configuration'}</button></div>}
      />
      {message && <div className="inline-message">{message}</div>}

      <div className="metric-grid">
        <SyncMetric icon="bi-hdd" title="SQLite durability" value={model.databaseHealthy ? 'Healthy' : pos?.ok ? 'Checking' : 'Not detected'} status={model.databaseHealthy ? 'live' : 'partial'} />
        <SyncMetric icon="bi-sliders" title="Config snapshot" value={model.configCached ? 'Available' : 'Not cached'} status={model.configCached ? 'live' : 'partial'} />
        <SyncMetric icon="bi-clock-history" title="Last config sync" value={model.configSyncLabel} status={model.configSyncHealthy ? 'live' : 'partial'} />
        <SyncMetric icon="bi-heart-pulse" title="Local service" value={pos?.ok ? 'Healthy' : 'Not detected'} status={pos?.ok ? 'live' : 'partial'} />
      </div>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-shield-check" /><div><h2>Offline readiness</h2><p>The last known-good effective configuration is stored in SQLite and survives Central outages and POS restarts.</p></div></div>
        <div className="check-list">
          <Check ok={Boolean(pos?.ok)} title="Local POS service reachable" detail="Local runtime responds on the configured loopback address." />
          <Check ok={model.databaseHealthy} title="SQLite database healthy" detail={model.databaseHealthy ? 'SQLite is reachable and ready.' : 'Status, ready, or diagnostics endpoints have not confirmed SQLite readiness.'} />
          <Check ok={model.configCached} title="Effective configuration cached" detail={model.configCached ? model.configDetail : 'POS can refresh this after device registration and Central connectivity.'} />
          <Check ok={model.configSyncHealthy} title="Configuration sync healthy" detail={model.configSyncDetail} />
          <Check ok={model.outboxHealthy} status={model.outboxHealthy == null ? 'neutral' : undefined} title="Transaction outbox within threshold" detail={model.outboxDetail} />
          <Check ok={model.inboxHealthy} status={model.inboxHealthy == null ? 'neutral' : undefined} title="Central inbox applying cleanly" detail={model.inboxDetail} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-arrow-left-right" /><div><h2>POSService management contract</h2><p>Live endpoints are checked directly against the local POS runtime.</p></div></div>
        <div className="contract-grid">
          {model.contracts.map((x) => <div className="contract-row" key={x.path + x.method}><code>{x.method}</code><strong>{x.path}</strong><span>{x.status}</span></div>)}
        </div>
      </section>

      <section className="panel subtle">
        <StatusBadge status={model.allReady ? 'live' : 'partial'} />
        <p className="mb0">Outbox and inbox counts come from local POS diagnostics when the full runtime is running. The compact runtime can still report health, readiness, and cached configuration.</p>
      </section>
    </div>
  );
}

async function firstSuccessful(requests) {
  let lastError;
  for (const request of requests) {
    try {
      const response = await request();
      return { data: response?.data, source: response?.config?.url };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function valueOrNull(result) {
  return result.status === 'fulfilled' ? result.value?.data || null : null;
}

function isReady(data = {}) {
  return ['ok', 'ready'].includes(String(data.status || '').toLowerCase());
}

function buildReadinessModel({ pos, configuration, diagnostics, syncDiagnostics, syncStatus }) {
  const status = pos?.data || {};
  const statusConfig = status.configuration || {};
  const sync = status.configuration_sync || syncDiagnostics?.effective_config || {};
  const configCached = Boolean(statusConfig.available || configuration?.etag || configuration?.schema_version);
  const fetchedAt = statusConfig.fetched_at || configuration?.fetched_at;
  const etag = statusConfig.etag || configuration?.etag || sync.last_etag || sync.lastETag;
  const lastSuccess = sync.last_success_at || sync.lastSuccessAt;
  const lastError = sync.last_error || sync.lastError;
  const databaseHealthy = status.database === 'healthy' || diagnostics?.database_ok === true || status.status === 'ready';
  const outbox = normalizeOutbox(syncStatus?.outbox || diagnostics?.outbox, syncDiagnostics?.outbox);
  const inbox = normalizeInbox(syncStatus?.inbox || diagnostics, syncDiagnostics?.inbox);
  const outboxHealthy = hasTelemetry(outbox) ? outbox.dead_letter === 0 && outbox.failed === 0 && outbox.pending <= 100 : null;
  const inboxHealthy = hasTelemetry(inbox) ? inbox.failed === 0 : null;
  const configSyncHealthy = Boolean(lastSuccess) && !lastError;

  return {
    databaseHealthy,
    configCached,
    configSyncHealthy,
    configSyncLabel: lastSuccess ? new Date(lastSuccess).toLocaleString() : 'No successful sync',
    configDetail: etag ? `Snapshot ${String(etag).slice(0, 12)}... fetched ${fetchedAt ? new Date(fetchedAt).toLocaleString() : 'recently'}.` : 'Effective configuration snapshot is available locally.',
    configSyncDetail: lastError || (lastSuccess ? 'Last configuration sync completed successfully.' : 'No successful configuration sync has completed yet.'),
    outboxHealthy,
    outboxDetail: hasTelemetry(outbox) ? `${outbox.pending} pending, ${outbox.failed} failed, ${outbox.dead_letter} dead-letter, ${outbox.published} published.` : 'Outbox telemetry is not available from this POS runtime.',
    inboxHealthy,
    inboxDetail: hasTelemetry(inbox) ? `${inbox.received} received, ${inbox.processing} processing, ${inbox.failed} failed.` : 'Inbox telemetry is not available from this POS runtime.',
    allReady: Boolean(pos?.ok) && databaseHealthy && configCached && configSyncHealthy && outboxHealthy !== false && inboxHealthy !== false,
    contracts: [
      ['GET', '/api/v1/health', pos?.ok ? 'Live' : 'Check local service'],
      ['GET', '/api/v1/ready', databaseHealthy ? 'Live' : 'Not confirmed'],
      ['GET', '/api/v1/status', status.database ? 'Live' : 'Optional compact-runtime status'],
      ['GET', '/api/v1/config', configCached ? 'Live' : 'Not cached'],
      ['POST', '/api/v1/config/refresh', pos?.ok ? 'Available when Central sync is configured' : 'Local POS unavailable'],
      ['GET', '/api/v1/diagnostics', diagnostics ? 'Live' : 'Full runtime only'],
      ['GET', '/api/v1/diagnostics/sync-events', syncDiagnostics ? 'Live' : 'Full runtime only'],
      ['POST', '/api/v1/sync/now', syncStatus ? 'Available when implemented by POSService' : 'Not confirmed'],
    ].map(([method, path, statusText]) => ({ method, path, status: statusText })),
  };
}

function normalizeOutbox(summary, items = []) {
  const counts = { ...emptyCounts, ...(summary || {}) };
  for (const item of Array.isArray(items) ? items : []) {
    const key = item.status === 'dead_letter' ? 'dead_letter' : item.status;
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function normalizeInbox(summary, items = []) {
  const counts = { received: Number(summary?.inbox_received || 0), processing: 0, failed: Number(summary?.inbox_failed || 0) };
  for (const item of Array.isArray(items) ? items : []) {
    if (item.status === 'received') counts.received += 1;
    if (item.status === 'processing') counts.processing += 1;
    if (item.status === 'failed') counts.failed += 1;
  }
  return counts;
}

function hasTelemetry(counts) {
  return Object.values(counts).some((value) => Number(value) > 0);
}

function SyncMetric({ icon, title, value, status }) {
  return <div className="metric-card"><i className={`bi ${icon}`} /><div><span>{title}</span><strong>{value}</strong><StatusBadge status={status} compact /></div></div>;
}

function Check({ ok, status, title, detail }) {
  const neutral = status === 'neutral';
  return <div className="check-row"><i className={`bi ${neutral ? 'bi-info-circle contract-text' : ok ? 'bi-check-circle-fill good-text' : 'bi-circle contract-text'}`} /><div><strong>{title}</strong><span>{detail}</span></div></div>;
}
