import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { findV1Section, v1Sections } from '../config/v1Navigation';
import { api, unwrap } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('shaj_hub_theme') || 'light');
  const [settingsTenantName, setSettingsTenantName] = useState('');

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('shaj_hub_theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    api.applicationSettings()
      .then((response) => {
        if (!active) return;
        const settings = unwrap(response, 'settings');
        setSettingsTenantName(settings?.company?.shop_name || settings?.company?.business_name || '');
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const currentSection = useMemo(() => findV1Section(location.pathname), [location.pathname]);
  const tenantName = user?.tenant_name || user?.tenantName || user?.business_name || user?.businessName || user?.shop_name || settingsTenantName || 'Tenant';

  return <div className="customerhub-shell customerhub-top-shell">
    <main className="hub-main">
      <header className="hub-topbar customerhub-topbar">
        <div className="customerhub-primary-row">
          <Link to="/" className="brand-row topbar-brand-link" aria-label={`${tenantName} home`}>
            <div className="brand-mark" />
            <div><strong>{tenantName}</strong></div>
          </Link>
          <nav className="v1-top-nav" aria-label="CustomerHub V1 sections">
            {v1Sections.map((section) => (
              <NavLink
                key={section.key}
                to={section.path}
                end={section.path === '/'}
                className={() => `v1-top-nav-item ${currentSection.key === section.key ? 'active' : ''}`}
              >
                <i className={`bi ${section.icon}`} />
                <span>{section.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <nav className="v1-section-nav" aria-label={`${currentSection.label} navigation`}>
          {currentSection.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) => `v1-section-nav-item ${isActive ? 'active' : ''}`}
            >
              <span>{item.label}</span>
              {item.status !== 'live' && <small>{item.status}</small>}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="hub-content"><Outlet /></div>
    </main>
  </div>;
}
