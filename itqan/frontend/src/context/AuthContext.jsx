import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { apiErr } from "@/lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("itqan_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setCompany(data.company);
    } catch (e) {
      localStorage.removeItem("itqan_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const persist = (data) => {
    localStorage.setItem("itqan_token", data.access_token);
    setUser(data.user);
    setCompany(data.company);
  };

  const login = async (identifier, password, role) => {
    try {
      const { data } = await api.post("/auth/login", { identifier, password, role });
      persist(data);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: apiErr(e.response?.data?.detail) };
    }
  };

  const registerManager = async (payload) => {
    try {
      const { data } = await api.post("/auth/register-manager", payload);
      persist(data);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: apiErr(e.response?.data?.detail) };
    }
  };

  const logout = () => {
    localStorage.removeItem("itqan_token");
    setUser(null);
    setCompany(null);
  };

  const refreshCompany = useCallback(async () => {
    try {
      const { data } = await api.get("/company");
      setCompany((c) => ({ ...c, ...data }));
      return data;
    } catch (e) {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, company, setCompany, loading, login, registerManager, logout, refreshCompany, loadMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
