import { createClient } from '@supabase/supabase-js';
import type { FavoriteItem, Tag, AppSettings, Folder } from '@/types';

// Get these from your Supabase project settings
// For now, we'll use environment variables
let currentUrl = import.meta.env.VITE_SUPABASE_URL || '';
let currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize with env vars or placeholders
export let supabase = createClient(
  currentUrl || 'https://placeholder.supabase.co',
  currentKey || 'placeholder-key'
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

    if (foldersError) throw foldersError;

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

    return {
      data: {
        favorites: parsedFavorites,
        tags: parsedTags,
        folders: parsedFolders,
        settings: {
          autoSaveClipboard: true,
          showNotifications: true,
          backupEnabled: true,
          backupInterval: 24,
          language: 'ar',
        },
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
