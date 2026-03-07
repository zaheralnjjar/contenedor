import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { FavoriteItem, ClipboardHistoryItem, AppSettings, Tag, ContentType, FilterType, Folder, SortOption } from '@/types';
import * as db from '@/lib/db';
import { configureSupabase } from '@/lib/supabase';
import { sampleFavorites, sampleTags } from '@/lib/seedData';
import {
  detectContentType,
  extractYouTubeInfo,
  extractGoogleMapsInfo,
  isGoogleMapsUrl,
  getStaticMapUrl,
  getWebsiteScreenshot,
  reverseGeocode
} from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export interface FloatingVideo {
  videoId: string;
  title: string;
}

interface AppState {
  favorites: FavoriteItem[];
  clipboardHistory: ClipboardHistoryItem[];
  tags: Tag[];
  folders: Folder[];
  settings: AppSettings;
  filter: FilterType;
  searchQuery: string;
  sortBy: SortOption;
  isLoading: boolean;
  selectedTags: string[];
  selectedFolder: string | null;
  floatingVideo: FloatingVideo | null;
  activeSequentialItemId: string | null;
  viewMode: 'grid' | 'list';
}

type Action =
  | { type: 'SET_FAVORITES'; payload: FavoriteItem[] }
  | { type: 'ADD_FAVORITE'; payload: FavoriteItem }
  | { type: 'UPDATE_FAVORITE'; payload: FavoriteItem }
  | { type: 'DELETE_FAVORITE'; payload: string }
  | { type: 'SET_CLIPBOARD_HISTORY'; payload: ClipboardHistoryItem[] }
  | { type: 'ADD_CLIPBOARD_ITEM'; payload: ClipboardHistoryItem }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_FILTER'; payload: FilterType }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SORT_BY'; payload: SortOption }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SELECTED_TAGS'; payload: string[] }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'SET_SELECTED_FOLDER'; payload: string | null }
  | { type: 'SET_FLOATING_VIDEO'; payload: FloatingVideo | null }
  | { type: 'SET_ACTIVE_SEQUENTIAL_ITEM_ID'; payload: string | null }
  | { type: 'UPDATE_CLIPBOARD_ITEM_SOURCE'; payload: { id: string; sourceId: string } }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' };

const initialState: AppState = {
  favorites: [],
  clipboardHistory: [],
  tags: [],
  folders: [],
  settings: {
    autoSaveClipboard: true,
    showNotifications: true,
    backupEnabled: false,
    backupInterval: 24,
    language: 'ar',
  },
  filter: 'all',
  searchQuery: '',
  sortBy: 'newest',
  isLoading: true,
  selectedTags: [],
  selectedFolder: null,
  floatingVideo: null,
  activeSequentialItemId: null,
  viewMode: 'grid',
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload };
    case 'ADD_FAVORITE':
      return { ...state, favorites: [action.payload, ...state.favorites] };
    case 'UPDATE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.map(f => f.id === action.payload.id ? action.payload : f),
      };
    case 'DELETE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.filter(f => f.id !== action.payload),
      };
    case 'SET_CLIPBOARD_HISTORY':
      return { ...state, clipboardHistory: action.payload };
    case 'ADD_CLIPBOARD_ITEM':
      return {
        ...state,
        clipboardHistory: [action.payload, ...state.clipboardHistory].slice(0, 50),
      };
    case 'UPDATE_CLIPBOARD_ITEM_SOURCE':
      return {
        ...state,
        clipboardHistory: state.clipboardHistory.map(item =>
          item.id === action.payload.id ? { ...item, sourceItemId: action.payload.sourceId } : item
        ),
      };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTags: action.payload };
    case 'TOGGLE_TAG':
      return {
        ...state,
        selectedTags: state.selectedTags.includes(action.payload)
          ? state.selectedTags.filter(t => t !== action.payload)
          : [...state.selectedTags, action.payload],
      };
    case 'SET_SELECTED_FOLDER':
      return { ...state, selectedFolder: action.payload };
    case 'SET_FLOATING_VIDEO':
      return { ...state, floatingVideo: action.payload };
    case 'SET_ACTIVE_SEQUENTIAL_ITEM_ID':
      return { ...state, activeSequentialItemId: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFavorite: (item: FavoriteItem) => Promise<void>;
  deleteFavorite: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  addToClipboard: (content: string, type?: ContentType) => Promise<void>;
  clearClipboard: () => Promise<void>;
  importData: (data: string) => Promise<void>;
  exportData: () => Promise<string>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  createTag: (name: string, color?: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  createFolder: (name: string, color?: string, icon?: string) => Promise<void>;
  updateFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setSelectedFolder: (id: string | null) => void;
  refreshData: () => Promise<void>;
  setFloatingVideo: (video: FloatingVideo | null) => void;
  toggleSequentialCopy: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        let [favorites, clipboardHistory, tags, folders, settings] = await Promise.all([
          db.getAllFavorites(),
          db.getClipboardHistory(50),
          db.getAllTags(),
          db.getAllFolders(),
          db.getSettings(),
        ]);

        // Seed sample data on first launch when database is empty
        if (favorites.length === 0 && tags.length === 0) {
          console.log('First launch detected, seeding sample data...');
          await Promise.all(sampleFavorites.map(item => db.addFavorite(item)));
          await Promise.all(sampleTags.map(tag => db.addTag(tag)));
          favorites = sampleFavorites;
          tags = sampleTags;
        }

        dispatch({ type: 'SET_FAVORITES', payload: favorites });
        dispatch({ type: 'SET_CLIPBOARD_HISTORY', payload: clipboardHistory });
        dispatch({ type: 'SET_TAGS', payload: tags });
        dispatch({ type: 'SET_FOLDERS', payload: folders });
        dispatch({ type: 'SET_SETTINGS', payload: settings });

        if (settings.supabaseUrl && settings.supabaseAnonKey) {
          configureSupabase(settings.supabaseUrl, settings.supabaseAnonKey);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('فشل تحميل البيانات');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    loadData();
  }, []);

  const setFloatingVideo = useCallback((video: FloatingVideo | null) => {
    dispatch({ type: 'SET_FLOATING_VIDEO', payload: video });
  }, []);

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const setSelectedFolder = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_FOLDER', payload: id });
  }, []);

  const addFavorite = useCallback(async (item: Omit<FavoriteItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newItem: FavoriteItem = {
        ...item,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.addFavorite(newItem);
      dispatch({ type: 'ADD_FAVORITE', payload: newItem });

      // Update tag counts
      for (const tagName of item.tags) {
        await db.updateTagCount(tagName, 1);
      }

      if (state.settings.showNotifications) {
        toast.success('تم الإضافة إلى المفضلات');
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast.error('فشل الإضافة');
    }
  }, [state.settings.showNotifications]);

  const updateFavorite = useCallback(async (item: FavoriteItem) => {
    try {
      await db.updateFavorite(item);
      dispatch({ type: 'UPDATE_FAVORITE', payload: item });
      toast.success('تم التحديث بنجاح');
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error('فشل التحديث');
    }
  }, []);

  const deleteFavorite = useCallback(async (id: string) => {
    try {
      const item = state.favorites.find(f => f.id === id);
      if (item) {
        for (const tagName of item.tags) {
          await db.updateTagCount(tagName, -1);
        }
      }
      await db.deleteFavorite(id);
      dispatch({ type: 'DELETE_FAVORITE', payload: id });
      toast.success('تم الحذف بنجاح');
    } catch (error) {
      console.error('Error deleting favorite:', error);
      toast.error('فشل الحذف');
    }
  }, [state.favorites]);

  const togglePin = useCallback(async (id: string) => {
    try {
      const item = state.favorites.find(f => f.id === id);
      if (item) {
        const updated = { ...item, isPinned: !item.isPinned };
        await db.updateFavorite(updated);
        dispatch({ type: 'UPDATE_FAVORITE', payload: updated });
        toast.success(updated.isPinned ? 'تم التثبيت' : 'تم إلغاء التثبيت');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('فشل التثبيت');
    }
  }, [state.favorites]);

  const addToClipboard = useCallback(async (content: string, type?: ContentType) => {
    try {
      const detectedType = type || detectContentType(content);
      const clipboardItem: ClipboardHistoryItem = {
        id: uuidv4(),
        content,
        type: detectedType,
        timestamp: Date.now(),
      };
      await db.addToClipboardHistory(clipboardItem);
      dispatch({ type: 'ADD_CLIPBOARD_ITEM', payload: clipboardItem });

      // Handle Sequential Copy
      if (state.settings.sequentialCopyMode) {
        if (state.activeSequentialItemId) {
          const activeItem = state.favorites.find(f => f.id === state.activeSequentialItemId);
          if (activeItem) {
            const separator = typeof state.settings.sequentialCopySeparator === 'string'
              ? state.settings.sequentialCopySeparator.replace(/\\n/g, '\n')
              : '\n---\n';
            const updatedItem = {
              ...activeItem,
              content: activeItem.content + separator + content,
              updatedAt: Date.now()
            };
            await db.updateFavorite(updatedItem);
            dispatch({ type: 'UPDATE_FAVORITE', payload: updatedItem });

            // Link clipboard item
            const updatedClipboardItem = { ...clipboardItem, sourceItemId: activeItem.id };
            await db.addToClipboardHistory(updatedClipboardItem);
            dispatch({ type: 'UPDATE_CLIPBOARD_ITEM_SOURCE', payload: { id: clipboardItem.id, sourceId: activeItem.id } });

            if (state.settings.showNotifications) {
              toast.success('تمت الإضافة للملف المتتابع');
            }
            return;
          }
        }
      }

      // Auto-save to favorites if enabled or sequential copy is active but no active item yet
      if (state.settings.autoSaveClipboard || state.settings.sequentialCopyMode) {
        // Run asynchronously
        (async () => {
          try {
            let title = content.slice(0, 50);
            let url: string | undefined;
            let thumbnail: string | undefined;
            let metadata: FavoriteItem['metadata'] = {};

            if (detectedType === 'youtube') {
              const ytInfo = extractYouTubeInfo(content);
              if (ytInfo) {
                title = ytInfo.title;
                url = content;
                thumbnail = ytInfo.thumbnail;
                metadata = { videoId: ytInfo.videoId, channelName: ytInfo.channelName };
              }
              toast.success('تم حفظ فيديو يوتيوب 📺');
            } else if (detectedType === 'location' || isGoogleMapsUrl(content)) {
              // Handle Google Maps URLs
              const mapsInfo = extractGoogleMapsInfo(content);
              if (mapsInfo) {
                const locationInfo = await reverseGeocode(mapsInfo.latitude, mapsInfo.longitude);
                title = locationInfo?.street
                  ? `${locationInfo.street}${locationInfo.buildingNumber ? ' ' + locationInfo.buildingNumber : ''}`
                  : 'موقع محفوظ';
                url = content;
                thumbnail = getStaticMapUrl(mapsInfo.latitude, mapsInfo.longitude);
                metadata = {
                  latitude: mapsInfo.latitude,
                  longitude: mapsInfo.longitude,
                  address: locationInfo?.address,
                  street: locationInfo?.street,
                  buildingNumber: locationInfo?.buildingNumber,
                  city: locationInfo?.city,
                };
              } else {
                title = 'موقع على الخريطة';
                url = content;
              }
              toast.success('تم حفظ الموقع 📍');
            } else if (detectedType === 'website') {
              try {
                const urlObj = new URL(content);
                title = urlObj.hostname;
                url = content;
                // Try to get website screenshot
                thumbnail = getWebsiteScreenshot(content, 400, 300);
              } catch {
                title = content.slice(0, 50);
              }
              toast.success('تم حفظ الموقع 🌐');
            } else if (detectedType === 'phone') {
              title = `رقم: ${content}`;
              toast.success('تم حفظ رقم الهاتف 📞');
            } else if (detectedType === 'image') {
              title = 'صورة';
              url = content;
              thumbnail = content;
              toast.success('تم حفظ الصورة 🖼️');
            } else {
              toast.success('تم حفظ النص 📝');
            }

            const newFavorite: FavoriteItem = {
              id: uuidv4(),
              type: detectedType,
              title,
              content,
              url,
              thumbnail,
              tags: [],
              isPinned: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              metadata,
            };

            await db.addFavorite(newFavorite);
            dispatch({ type: 'ADD_FAVORITE', payload: newFavorite });

            // Set as active sequential item if mode is active
            if (state.settings.sequentialCopyMode) {
              dispatch({ type: 'SET_ACTIVE_SEQUENTIAL_ITEM_ID', payload: newFavorite.id });
            }

            // Link clipboard item to the new favorite
            const updatedClipboardItem = { ...clipboardItem, sourceItemId: newFavorite.id };
            await db.addToClipboardHistory(updatedClipboardItem);
            dispatch({ type: 'UPDATE_CLIPBOARD_ITEM_SOURCE', payload: { id: clipboardItem.id, sourceId: newFavorite.id } });

          } catch (e) {
            console.error('Error in auto-saving clipboard item to favorites:', e);
          }
        })();
      }
    } catch (error) {
      console.error('Error adding to clipboard:', error);
    }
  }, [state.settings, state.activeSequentialItemId, state.favorites]);

  const clearClipboard = useCallback(async () => {
    try {
      await db.clearClipboardHistory();
      dispatch({ type: 'SET_CLIPBOARD_HISTORY', payload: [] });
      toast.success('تم مسح السجل');
    } catch (error) {
      console.error('Error clearing clipboard:', error);
      toast.error('فشل المسح');
    }
  }, []);

  const importData = useCallback(async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      await db.importData(data);
      await refreshData();
      toast.success('تم الاستيراد بنجاح');
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('فشل الاستيراد');
      throw error;
    }
  }, []);

  const exportData = useCallback(async (): Promise<string> => {
    try {
      const data = await db.exportData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('فشل التصدير');
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...state.settings, ...newSettings };
      await db.saveSettings(updated);
      dispatch({ type: 'SET_SETTINGS', payload: updated });

      if (updated.supabaseUrl && updated.supabaseAnonKey) {
        configureSupabase(updated.supabaseUrl, updated.supabaseAnonKey);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('فشل حفظ الإعدادات');
    }
  }, [state.settings]);

  const toggleSequentialCopy = useCallback(() => {
    const newMode = !state.settings.sequentialCopyMode;
    updateSettings({ sequentialCopyMode: newMode });

    if (newMode) {
      toast.success('تم تفعيل وضع النسخ المتتابع');
    } else {
      toast.info('تم إيقاف وضع النسخ المتتابع');
      // Clear active sequential item
      dispatch({ type: 'SET_ACTIVE_SEQUENTIAL_ITEM_ID', payload: null });
    }
  }, [state.settings.sequentialCopyMode, updateSettings]);

  const createTag = useCallback(async (name: string, color: string = '#3b82f6') => {
    try {
      const newTag: Tag = {
        id: uuidv4(),
        name,
        color,
        count: 0,
      };
      await db.addTag(newTag);
      const tags = await db.getAllTags();
      dispatch({ type: 'SET_TAGS', payload: tags });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('فشل إنشاء الوسم');
    }
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    try {
      await db.deleteTag(id);
      const tags = await db.getAllTags();
      dispatch({ type: 'SET_TAGS', payload: tags });
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('فشل حذف الوسم');
    }
  }, []);

  const createFolder = useCallback(async (name: string, color: string = '#64748b', icon: string = 'Folder') => {
    try {
      const newFolder: Folder = {
        id: uuidv4(),
        name,
        color,
        icon,
        createdAt: Date.now(),
      };
      await db.addFolder(newFolder);
      const folders = await db.getAllFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('فشل إنشاء المجلد');
    }
  }, []);

  const updateFolder = useCallback(async (folder: Folder) => {
    try {
      await db.updateFolder(folder);
      const folders = await db.getAllFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('فشل تحديث المجلد');
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await db.deleteFolder(id);
      const folders = await db.getAllFolders();
      dispatch({ type: 'SET_FOLDERS', payload: folders });
      // Remove folderId from all favorites that were in this folder
      const affectdedFavorites = state.favorites.filter(f => f.folderId === id);
      for (const fav of affectdedFavorites) {
        await updateFavorite({ ...fav, folderId: undefined });
      }
      if (state.selectedFolder === id) {
        setSelectedFolder(null);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('فشل حذف المجلد');
    }
  }, [state.favorites, state.selectedFolder, updateFavorite, setSelectedFolder]);

  const refreshData = useCallback(async () => {
    try {
      const [favorites, clipboardHistory, tags, folders] = await Promise.all([
        db.getAllFavorites(),
        db.getClipboardHistory(50),
        db.getAllTags(),
        db.getAllFolders(),
      ]);
      dispatch({ type: 'SET_FAVORITES', payload: favorites });
      dispatch({ type: 'SET_CLIPBOARD_HISTORY', payload: clipboardHistory });
      dispatch({ type: 'SET_TAGS', payload: tags });
      dispatch({ type: 'SET_FOLDERS', payload: folders });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addFavorite,
        updateFavorite,
        deleteFavorite,
        togglePin,
        addToClipboard,
        clearClipboard,
        importData,
        exportData,
        updateSettings,
        createTag,
        deleteTag,
        createFolder,
        updateFolder,
        deleteFolder,
        setSelectedFolder,
        refreshData,
        setFloatingVideo,
        toggleSequentialCopy,
        setViewMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
