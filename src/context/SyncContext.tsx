import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  syncToCloud,
  syncFromCloud,
  getLastSyncTime,
  subscribeToChanges,
  type SyncStatus,
} from '@/lib/supabase';
import { useApp } from './AppContext';
import { toast } from 'sonner';

interface SyncContextType {
  status: SyncStatus;
  isConfigured: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
  enableAutoSync: (intervalMinutes: number) => void;
  disableAutoSync: () => void;
}

const initialStatus: SyncStatus = {
  isConnected: false,
  isSyncing: false,
  lastSync: null,
  error: null,
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { state, refreshData, exportData } = useApp();
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Check auth status on mount
  useEffect(() => {
    if (!isConfigured) return;

    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || null);
        setStatus(prev => ({ ...prev, isConnected: true }));

        // Get last sync time
        const lastSync = await getLastSyncTime();
        setStatus(prev => ({ ...prev, lastSync }));

        // Setup real-time subscriptions
        setupSubscriptions(user.id);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || null);
        setStatus(prev => ({ ...prev, isConnected: true }));
        setupSubscriptions(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserEmail(null);
        setStatus(initialStatus);
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [isConfigured]);

  const setupSubscriptions = (userId: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = subscribeToChanges(
      userId,
      (payload) => {
        console.log('Favorites changed:', payload);
        // Optionally refresh data from cloud
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          toast.info('تم تحديث المفضلات من السحابة');
        }
      },
      (payload) => {
        console.log('Tags changed:', payload);
      }
    );
  };

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (error) {
      toast.error('فشل تسجيل الدخول: ' + error.message);
      throw error;
    }
    toast.success('تم تسجيل الدخول بنجاح');
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { error } = await signUp(email, password);
    if (error) {
      toast.error('فشل إنشاء الحساب: ' + error.message);
      throw error;
    }
    toast.success('تم إنشاء الحساب بنجاح، تحقق من بريدك الإلكتروني');
  }, []);

  const logout = useCallback(async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('فشل تسجيل الخروج');
      throw error;
    }
    disableAutoSync();
    toast.success('تم تسجيل الخروج');
  }, []);

  const syncNow = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // First, sync local data to cloud
      const localData = await exportData();
      const parsedData = JSON.parse(localData);

      const { error: uploadError } = await syncToCloud({
        favorites: parsedData.favorites,
        tags: parsedData.tags,
        folders: parsedData.folders || [],
        settings: parsedData.settings,
        lastSync: Date.now(),
      });

      if (uploadError) throw uploadError;

      // Then, sync from cloud to get any new data
      const { data: cloudData, error: downloadError } = await syncFromCloud();

      if (downloadError) throw downloadError;

      if (cloudData) {
        // Merge cloud data with local data
        // For now, we'll just refresh the local data
        await refreshData();
      }

      const lastSync = Date.now();
      setStatus(prev => ({ ...prev, lastSync, isSyncing: false }));
      toast.success('تمت المزامنة بنجاح');
    } catch (error) {
      console.error('Sync error:', error);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      toast.error('فشلت المزامنة');
    }
  }, [isAuthenticated, exportData, refreshData]);

  const enableAutoSync = useCallback((intervalMinutes: number) => {
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
    }

    autoSyncIntervalRef.current = setInterval(() => {
      if (isAuthenticated) {
        syncNow();
      }
    }, intervalMinutes * 60 * 1000);

    toast.info(`تم تفعيل المزامنة التلقائية كل ${intervalMinutes} دقيقة`);
  }, [isAuthenticated, syncNow]);

  const disableAutoSync = useCallback(() => {
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }
  }, []);

  // Auto-sync on login if enabled in settings
  useEffect(() => {
    if (isAuthenticated && state.settings.backupEnabled) {
      enableAutoSync(state.settings.backupInterval);
    }
    return () => disableAutoSync();
  }, [isAuthenticated, state.settings.backupEnabled, state.settings.backupInterval]);

  return (
    <SyncContext.Provider
      value={{
        status,
        isConfigured,
        isAuthenticated,
        userEmail,
        login,
        register,
        logout,
        syncNow,
        enableAutoSync,
        disableAutoSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
