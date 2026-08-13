import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { moduleGroups } from '../config/modules';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('shaj_hub_theme') || 'dark');
  useEffect(() => { document.body.dataset.theme = theme; localStorage.setItem('shaj_hub_theme', theme); }, [theme]);
  return <div className={`hub-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="hub-sidebar">
      <div className="brand-row"><div className="brand-mark">S</div>{!collapsed && <div><strong>SHAJ Retail Hub</strong><span>Business control plane</span></div>}<button className="icon-btn collapse-btn" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar"><i className="bi bi-layout-sidebar-inset" /></button></div>
      <nav className="hub-nav">{moduleGroups.map(group => <div className="nav-group" key={group.label}>{!collapsed && <div className="nav-group-label">{group.label}</div>}{group.items.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} title={item.label}><i className={`bi ${item.icon}`} />{!collapsed && <><span>{item.label}</span>{item.status !== 'live' && <span className={`nav-dot dot-${item.status}`} />}</>}</NavLink>)}</div>)}</nav>
      {!collapsed && <div className="sidebar-footer"><StatusBadge status="live" /><small>Hub v0.1 · V1 foundation</small></div>}
    </aside>
    <main className="hub-main"><header className="hub-topbar"><div><span className="eyebrow">Customer administration</span><strong>{location.pathname === '/' ? 'Overview' : location.pathname.split('/')[1].replaceAll('-', ' ')}</strong></div><div className="topbar-actions"><span className="connection-pill"><span className="pulse-dot" /> Central control plane</span><button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} /></button><div className="user-chip"><div className="avatar">{String(user?.user_name || user?.name || 'O').slice(0,1).toUpperCase()}</div><div><strong>{user?.user_name || user?.name || 'Owner'}</strong><span>{user?.role || 'admin'}</span></div></div><button className="icon-btn" onClick={logout}><i className="bi bi-box-arrow-right" /></button></div></header><div className="hub-content"><Outlet /></div></main>
  </div>;
}
