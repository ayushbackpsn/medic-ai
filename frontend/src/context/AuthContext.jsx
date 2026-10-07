import React, { createContext, useContext, useState, useEffect } from 'react';
import { cacheUserSession, getCachedUserSession } from '../services/db';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = localStorage.getItem('asha_token');
        const storedUser = localStorage.getItem('asha_user');
        
        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // Fallback to offline cached IndexedDB session
          const cachedSession = await getCachedUserSession();
          if (cachedSession) {
            setUser(cachedSession.user);
          }
        }
      } catch (err) {
        console.error("Failed to restore session:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (tokenData) => {
    const userData = {
      user_id: tokenData.user_id,
      username: tokenData.username,
      full_name: tokenData.full_name,
      role: tokenData.role,
      token: tokenData.access_token
    };

    localStorage.setItem('asha_token', tokenData.access_token);
    localStorage.setItem('asha_user', JSON.stringify(userData));
    await cacheUserSession({ token: tokenData.access_token, user: userData });
    
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('asha_token');
    localStorage.removeItem('asha_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
