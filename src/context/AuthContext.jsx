import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getAccessToken, setAccessToken } from '../lib/api';

const AuthContext = createContext(null);
const DEMO = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true';
const demoUser = { id: 'demo-owner', user_name: 'Retail Owner', role: 'admin', tenant_id: 'demo-tenant' };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEMO ? demoUser : null);
  const [loading, setLoading] = useState(!DEMO && Boolean(getAccessToken()));

  useEffect(() => {
    if (DEMO || !getAccessToken()) return;
    api.session()
      .then((response) => setUser(response?.data?.user || response?.data?.data?.user || null))
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password }) => {
    if (DEMO) { setUser(demoUser); return demoUser; }
    const response = await api.login({ email, password });
    const body = response?.data?.data ?? response?.data ?? {};
    if (body.token) setAccessToken(body.token);
    const nextUser = body.user || null;
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    if (!DEMO) await api.logout().catch(() => {});
    setAccessToken(null);
    setUser(DEMO ? demoUser : null);
  };

  const value = useMemo(() => ({ user, loading, login, logout, demo: DEMO }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
