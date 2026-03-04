import { createClient } from '@supabase/supabase-js';
import type { FavoriteItem, Tag, AppSettings, Folder, ClipboardHistoryItem } from '@/types';

// Get these from your Supabase project settings
// For now, we'll use environment variables or hardcoded values
let currentUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wwqhyykbzcdrxjasbwzw.supabase.co';
let currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cWh5eWtiemNkcnhqYXNid3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTkxMjYsImV4cCI6MjA4ODEzNTEyNn0.yP3C4ij09L-oiG5RVbJj2SDbGcSPSLOPSzYmS2kbIn8';

// Initialize with env vars or placeholders
export let supabase = createClient(
  currentUrl,
  currentKey
);

export function configureSupabase(url: string, key: string) {
  if (url && key && (url !== currentUrl || key !== currentKey)) {
    currentUrl = url;
    currentKey = key;
    supabase = createClient(url, key);
  }
}

export interface SyncData {
  favorites: FavoriteItem[];
  tags: Tag[];
  folders: Folder[];
  clipboardHistory: ClipboardHistoryItem[];
  settings: AppSettings;
  lastSync: number;
}

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(currentUrl && currentKey);
}

// Auth functions
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Sync functions
export async function syncToCloud(data: SyncData): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: new Error('User not authenticated') };
  }

  try {
    // Sync favorites
    const { error: favoritesError } = await supabase
      .from('favorites')
      .upsert(
        data.favorites.map(item => ({
          id: item.id,
          user_id: user.id,
          type: item.type,
          title: item.title,
          content: item.content,
          url: item.url || null,
          thumbnail: item.thumbnail || null,
          tags: item.tags || [],
          folder_id: item.folderId || null,
          is_pinned: item.isPinned || false,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          metadata: item.metadata || {},
        })),
        { onConflict: 'id' }
      );

    if (favoritesError) {
      console.error('Favorites sync error:', favoritesError);
      throw new Error(`خطأ في مزامنة المفضلات: ${favoritesError.message}`);
    }

    // Sync tags — delete existing and re-insert to avoid unique constraint conflicts
    if (data.tags && data.tags.length > 0) {
      // First delete all user tags
      await supabase
        .from('tags')
        .delete()
        .eq('user_id', user.id);

      // Then insert fresh
      const { error: tagsError } = await supabase
        .from('tags')
        .insert(
          data.tags.map(tag => ({
            id: tag.id,
            user_id: user.id,
            name: tag.name,
            color: tag.color,
            count: tag.count || 0,
          }))
        );

      if (tagsError) {
        console.error('Tags sync error:', tagsError);
        throw new Error(`خطأ في مزامنة الوسوم: ${tagsError.message}`);
      }
    }

    // Sync folders (optional - table may not exist yet)
    if (data.folders && data.folders.length > 0) {
      const { error: foldersError } = await supabase
        .from('folders')
        .upsert(
          data.folders.map(folder => ({
            id: folder.id,
            user_id: user.id,
            name: folder.name,
            color: folder.color || '#64748b',
            icon: folder.icon || 'Folder',
            created_at: folder.createdAt,
          })),
          { onConflict: 'id' }
        );

      if (foldersError) {
        // Don't break sync if folders table doesn't exist
        console.warn('Folders sync warning:', foldersError);
      }
    }

    // Sync clipboard history
    if (data.clipboardHistory && data.clipboardHistory.length > 0) {
      await supabase
        .from('clipboard_history')
        .delete()
        .eq('user_id', user.id);

      const { error: clipboardError } = await supabase
        .from('clipboard_history')
        .insert(
          data.clipboardHistory.map(item => ({
            id: item.id,
            user_id: user.id,
            type: item.type,
            content: item.content,
            timestamp: item.timestamp,
            source_item_id: item.sourceItemId || null,
          }))
        );

      if (clipboardError && clipboardError.code !== '42P01') {
        console.warn('Clipboard sync warning:', clipboardError);
      }
    }

    // Sync settings
    if (data.settings) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: data.settings,
        }, { onConflict: 'user_id' });

      if (settingsError && settingsError.code !== '42P01') {
        console.warn('Settings sync warning:', settingsError);
      }
    }

    // Update last sync timestamp
    const { error: syncError } = await supabase
      .from('sync_metadata')
      .upsert({
        user_id: user.id,
        last_sync: Date.now(),
        device_info: navigator.userAgent,
      }, { onConflict: 'user_id' });

    if (syncError) {
      console.warn('Sync metadata warning:', syncError);
    }

    return { error: null };
  } catch (error) {
    console.error('Sync to cloud error:', error);
    return { error: error as Error };
  }
}

export async function syncFromCloud(): Promise<{ data: SyncData | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  try {
    // Fetch favorites
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id);

    if (favoritesError) throw favoritesError;

    // Fetch tags
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id);

    if (tagsError) throw tagsError;

    // Fetch folders
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id);

    if (foldersError && foldersError.code !== '42P01') throw foldersError;

    // Fetch clipboard history
    const { data: clipboardData, error: clipboardError } = await supabase
      .from('clipboard_history')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (clipboardError && clipboardError.code !== '42P01') {
      console.warn('Clipboard fetch warning:', clipboardError);
    }

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116' && settingsError.code !== '42P01') {
      console.warn('Settings fetch warning:', settingsError);
    }

    // Fetch last sync
    const { data: syncMeta, error: syncError } = await supabase
      .from('sync_metadata')
      .select('last_sync')
      .eq('user_id', user.id)
      .single();

    if (syncError && syncError.code !== 'PGRST116') throw syncError;

    // Parse the data
    const parsedFavorites: FavoriteItem[] = (favorites || []).map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content,
      url: item.url,
      thumbnail: item.thumbnail,
      tags: item.tags || [],
      folderId: item.folder_id,
      isPinned: item.is_pinned,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      metadata: item.metadata || {},
    }));

    const parsedTags: Tag[] = (tags || []).map(tag => ({
      ...tag,
    }));

    const parsedFolders: Folder[] = (folders || []).map(folder => ({
      ...folder,
    }));

    const parsedClipboard: ClipboardHistoryItem[] = (clipboardData || []).map(item => ({
      id: item.id,
      type: item.type,
      content: item.content,
      timestamp: item.timestamp,
      sourceItemId: item.source_item_id || undefined,
    }));

    const defaultSettings: AppSettings = {
      autoSaveClipboard: true,
      showNotifications: true,
      backupEnabled: true,
      backupInterval: 24,
      language: 'ar',
      sequentialCopyMode: false,
      sequentialCopySeparator: '\n---\n',
    };

    const parsedSettings: AppSettings = settingsData ? { ...defaultSettings, ...settingsData.settings } : defaultSettings;

    return {
      data: {
        favorites: parsedFavorites,
        tags: parsedTags,
        folders: parsedFolders,
        clipboardHistory: parsedClipboard,
        settings: parsedSettings,
        lastSync: syncMeta?.last_sync || Date.now(),
      },
      error: null,
    };
  } catch (error) {
    console.error('Sync from cloud error:', error);
    return { data: null, error: error as Error };
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('sync_metadata')
    .select('last_sync')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  return data.last_sync;
}

// Real-time subscriptions
export function subscribeToChanges(
  userId: string,
  onFavoritesChange: (payload: any) => void,
  onTagsChange: (payload: any) => void
) {
  if (!isSupabaseConfigured()) return null;

  const favoritesSubscription = supabase
    .channel('favorites_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'favorites',
        filter: `user_id=eq.${userId}`,
      },
      onFavoritesChange
    )
    .subscribe();

  const tagsSubscription = supabase
    .channel('tags_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tags',
        filter: `user_id=eq.${userId}`,
      },
      onTagsChange
    )
    .subscribe();

  return {
    unsubscribe: () => {
      favoritesSubscription.unsubscribe();
      tagsSubscription.unsubscribe();
    },
  };
}
