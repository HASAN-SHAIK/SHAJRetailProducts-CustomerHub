import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAccessToken(null);
    api.session()
      .then((response) => setUser(response?.data?.user || response?.data?.data?.user || null))
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password }) => {
    setAccessToken(null);
    const response = await api.login({ email, password });
    const body = response?.data?.data ?? response?.data ?? {};
    setAccessToken(body.token || null);
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
