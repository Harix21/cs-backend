import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getCoordinatorClient } from '../config/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Admin Auth State
  const [adminSession, setAdminSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // Coordinator Auth State
  const [coordinatorSession, setCoordinatorSession] = useState(() => {
    try {
      const stored = localStorage.getItem('coordinatorSession');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Verify Admin Profile
  async function fetchAdminProfile(userId) {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, active')
        .eq('id', userId)
        .single();

      if (error || !data || data.role !== 'ADMIN' || !data.active) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  // Monitor Supabase auth state for Admin
  useEffect(() => {
    let mounted = true;

    async function initAdminAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && mounted) {
          const profile = await fetchAdminProfile(session.user.id);
          if (profile) {
            setAdminSession(session);
            setAdminProfile(profile);
          } else {
            await supabase.auth.signOut();
            setAdminSession(null);
            setAdminProfile(null);
          }
        }
      } catch (err) {
        console.error('Admin auth check failed:', err);
      } finally {
        if (mounted) setIsAdminLoading(false);
      }
    }

    initAdminAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAdminSession(null);
        setAdminProfile(null);
        setIsAdminLoading(false);
        return;
      }

      const profile = await fetchAdminProfile(session.user.id);
      if (profile) {
        setAdminSession(session);
        setAdminProfile(profile);
      } else {
        await supabase.auth.signOut();
        setAdminSession(null);
        setAdminProfile(null);
      }
      setIsAdminLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Admin Login Action
  async function adminLogin(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!error && data?.user) {
        const profile = await fetchAdminProfile(data.user.id);
        if (profile) {
          setAdminSession(data.session);
          setAdminProfile(profile);
          return profile;
        }
      }
    } catch (authErr) {
      console.warn('Supabase Auth error, checking demo credentials:', authErr);
    }

    // Demo admin fallback for immediate development / review testing
    if (
      email.trim().toLowerCase() === 'admin@cybersentinel.in' &&
      (password === 'admin123' || password === 'password123' || password === 'admin')
    ) {
      const mockProfile = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Super Administrator',
        email: 'admin@cybersentinel.in',
        role: 'ADMIN',
        active: true,
      };
      const mockSession = {
        user: { id: mockProfile.id, email: mockProfile.email },
        access_token: 'mock-admin-token',
      };
      setAdminSession(mockSession);
      setAdminProfile(mockProfile);
      return mockProfile;
    }

    throw new Error('Invalid administrator credentials.');
  }

  // Admin Logout Action
  async function adminLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setAdminSession(null);
    setAdminProfile(null);
  }

  // Coordinator Login Action
  async function coordinatorLogin(email, password) {
    try {
      // Create an ephemeral client for auth to prevent triggering the Admin onAuthStateChange listener
      const coordAuthClient = getCoordinatorClient('');
      
      // 1. Log in via standard Supabase Auth
      const { data, error } = await coordAuthClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.user) {
        // 2. Fetch profile to ensure they are a COORDINATOR
        const { data: profile, error: profileErr } = await coordAuthClient
          .from('profiles')
          .select('id, name, email, role, active')
          .eq('id', data.user.id)
          .single();

        if (profileErr) {
          throw new Error('Profile error: ' + profileErr.message);
        }

        if (profile && profile.role === 'COORDINATOR' && profile.active) {
          // 3. Set the session specifically for the coordinator
          const sessionData = {
            token: data.session.access_token,
            profile: profile
          };
          localStorage.setItem('coordinatorSession', JSON.stringify(sessionData));
          setCoordinatorSession(sessionData);
          return sessionData;
        } else {
          // If they aren't a coordinator, log them out
          await coordAuthClient.auth.signOut();
          throw new Error('User does not have coordinator privileges.');
        }
      }
    } catch (authErr) {
      console.warn('Supabase Auth error, checking fallback:', authErr);
      
      // If it's a direct Supabase error we intentionally threw, pass it up
      if (authErr.message !== 'Invalid coordinator credentials.' && !authErr.message.includes('fallback')) {
         throw authErr;
      }
    }

    // Demo coordinator fallback for testing / offline
    if (
      (email.trim().toLowerCase() === 'coordinator@cybersentinel.in' ||
       email.trim().toLowerCase() === 'coord@cybersentinel.in') &&
      (password === 'coordinator123' || password === 'password123' || password === 'coordinator')
    ) {
      const mockData = {
        token: '00000000-0000-0000-0000-000000000001',
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Lead Coordinator',
          email: email.trim().toLowerCase(),
          role: 'COORDINATOR',
          active: true,
        },
      };
      localStorage.setItem('coordinatorSession', JSON.stringify(mockData));
      setCoordinatorSession(mockData);
      return mockData;
    }

    throw new Error('Invalid coordinator credentials.');
  }

  // Coordinator Logout Action
  function coordinatorLogout() {
    localStorage.removeItem('coordinatorSession');
    setCoordinatorSession(null);
  }

  // Coordinator Client Factory
  function getCoordinatorClientInstance() {
    return getCoordinatorClient(coordinatorSession?.token);
  }

  const coordinatorProfile = coordinatorSession?.profile || null;
  const user = coordinatorProfile || adminProfile || (adminSession?.user ? { ...adminProfile, id: adminSession.user.id } : null);

  return (
    <AuthContext.Provider
      value={{
        // Admin
        adminSession,
        adminProfile,
        isAdminLoading,
        adminLogin,
        loginAdmin: adminLogin,
        adminLogout,
        logoutAdmin: adminLogout,

        // Coordinator
        coordinatorSession,
        coordinatorProfile,
        isCoordinatorLoading: false,
        coordinatorLogin,
        loginCoordinator: coordinatorLogin,
        coordinatorLogout,
        logoutCoordinator: coordinatorLogout,
        getCoordinatorClientInstance,

        // Universal user context for coordinator sub-pages
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
