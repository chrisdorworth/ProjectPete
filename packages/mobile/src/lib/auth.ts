import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "./api.js";

const TOKEN_KEY = "meridian_auth_token";
const REFRESH_TOKEN_KEY = "meridian_refresh_token";

interface AuthState {
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    void loadStoredToken();
  }, []);

  async function loadStoredToken(): Promise<void> {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        setState({
          token: storedToken,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", { email, password });

    await SecureStore.setItemAsync(TOKEN_KEY, response.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refreshToken);

    setState({
      token: response.accessToken,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

    setState({
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!storedRefresh) {
        await logout();
        return;
      }

      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/refresh", { refreshToken: storedRefresh });

      await SecureStore.setItemAsync(TOKEN_KEY, response.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refreshToken);

      setState({
        token: response.accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      await logout();
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refreshToken,
    }),
    [state, login, logout, refreshToken],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}
