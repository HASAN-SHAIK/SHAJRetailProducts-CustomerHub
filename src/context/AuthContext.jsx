import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getAccessToken, setAccessToken } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) return;
    api.session()
      .then((response) => setUser(response?.data?.user || response?.data?.data?.user || null))
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password }) => {
    const response = await api.login({ email, password });
    const body = response?.data?.data ?? response?.data ?? {};
    if (body.token) setAccessToken(body.token);
    const nextUser = body.user || null;
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
