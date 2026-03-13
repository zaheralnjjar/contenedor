import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FavoriteItem, ClipboardHistoryItem, AppSettings, Tag, Folder } from '@/types';

interface FavoritesDB extends DBSchema {
  favorites: {
    key: string;
    value: FavoriteItem;
    indexes: {
      'by-type': string;
      'by-pinned': number;
      'by-date': number;
    };
  };
  clipboard: {
    key: string;
    value: ClipboardHistoryItem;
    indexes: {
      'by-date': number;
    };
  };
  tags: {
    key: string;
    value: Tag;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  folders: {
    key: string;
    value: Folder;
  };
  deleted_items: {
    key: string;
    value: { id: string; deletedAt: number };
  };
}

const DB_NAME = 'favorites-manager-db';
const DB_VERSION = 3;

let db: IDBPDatabase<FavoritesDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<FavoritesDB>> {
  if (db) return db;

  db = await openDB<FavoritesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Favorites store
      if (!db.objectStoreNames.contains('favorites')) {
        const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' });
        favoritesStore.createIndex('by-type', 'type');
        favoritesStore.createIndex('by-pinned', 'isPinned');
        favoritesStore.createIndex('by-date', 'createdAt');
      }

      // Clipboard history store
      if (!db.objectStoreNames.contains('clipboard')) {
        const clipboardStore = db.createObjectStore('clipboard', { keyPath: 'id' });
        clipboardStore.createIndex('by-date', 'timestamp');
      }

      // Tags store
      if (!db.objectStoreNames.contains('tags')) {
        db.createObjectStore('tags', { keyPath: 'id' });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }

      // Deleted items store (for sync)
      if (!db.objectStoreNames.contains('deleted_items')) {
        db.createObjectStore('deleted_items', { keyPath: 'id' });
      }
    },
  });

  return db;
}

// Favorites Operations
export async function getAllFavorites(): Promise<FavoriteItem[]> {
  const database = await initDB();
  return database.getAll('favorites');
}

export async function getFavoritesByType(type: string): Promise<FavoriteItem[]> {
  const database = await initDB();
  const index = database.transaction('favorites').store.index('by-type');
  return index.getAll(type);
}

export async function getPinnedFavorites(): Promise<FavoriteItem[]> {
  const database = await initDB();
  const index = database.transaction('favorites').store.index('by-pinned');
  return index.getAll(1);
}

export async function addFavorite(item: FavoriteItem): Promise<void> {
  const database = await initDB();
  await database.put('favorites', item);
}

export async function updateFavorite(item: FavoriteItem): Promise<void> {
  const database = await initDB();
  item.updatedAt = Date.now();
  await database.put('favorites', item);
}

export async function deleteFavorite(id: string): Promise<void> {
  // Real database deletion
  const database = await initDB();
  await database.delete('favorites', id);
  await database.put('deleted_items', { id, deletedAt: Date.now() });
}

export async function cleanupTrash(): Promise<number> {
  const database = await initDB();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - thirtyDaysMs;

  const all = await database.getAll('favorites');
  let deletedCount = 0;

  for (const item of all) {
    if (item.isDeleted && item.deletedAt && item.deletedAt < cutoff) {
      await database.delete('favorites', item.id);
      await database.put('deleted_items', { id: item.id, deletedAt: Date.now() });
      deletedCount++;
    }
  }

  return deletedCount;
}

export async function getFavoriteById(id: string): Promise<FavoriteItem | undefined> {
  const database = await initDB();
  return database.get('favorites', id);
}

// Clipboard Operations
export async function getClipboardHistory(limit: number = 50): Promise<ClipboardHistoryItem[]> {
  const database = await initDB();
  const index = database.transaction('clipboard').store.index('by-date');
  const all = await index.getAll();
  return all.reverse().slice(0, limit);
}

export async function addToClipboardHistory(item: ClipboardHistoryItem): Promise<void> {
  const database = await initDB();
  await database.put('clipboard', item);
}

export async function clearClipboardHistory(): Promise<void> {
  const database = await initDB();
  const all = await database.getAll('clipboard');
  await Promise.all(all.map(item => database.delete('clipboard', item.id)));
}

export async function deleteClipboardItem(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('clipboard', id);
}

// Deleted Items Operations (for Sync)
export async function getDeletedItemIds(): Promise<string[]> {
  const database = await initDB();
  const items = await database.getAll('deleted_items');
  return items.map(item => item.id);
}

export async function clearDeletedItemIds(ids: string[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('deleted_items', 'readwrite');
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

// Tags Operations
export async function getAllTags(): Promise<Tag[]> {
  const database = await initDB();
  return database.getAll('tags');
}

export async function addTag(tag: Tag): Promise<void> {
  const database = await initDB();
  await database.put('tags', tag);
}

export async function deleteTag(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('tags', id);
}

export async function updateTagCount(tagName: string, increment: number): Promise<void> {
  const database = await initDB();
  const tags = await database.getAll('tags');
  const tag = tags.find(t => t.name === tagName);
  if (tag) {
    tag.count = Math.max(0, tag.count + increment);
    await database.put('tags', tag);
  }
}

// Folders Operations
export async function getAllFolders(): Promise<Folder[]> {
  const database = await initDB();
  return database.getAll('folders');
}

export async function addFolder(folder: Folder): Promise<void> {
  const database = await initDB();
  await database.put('folders', folder);
}

export async function updateFolder(folder: Folder): Promise<void> {
  const database = await initDB();
  await database.put('folders', folder);
}

export async function deleteFolder(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('folders', id);
}

// Settings Operations
export async function getSettings(): Promise<AppSettings> {
  const database = await initDB();
  const settings = await database.get('settings', 'app-settings');
  return settings || {
    autoSaveClipboard: true,
    showNotifications: true,
    backupEnabled: false,
    backupInterval: 24,
    language: 'ar',
    id: 'app-settings'
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await initDB();
  await database.put('settings', { ...settings, id: 'app-settings' });
}

// Export/Import Operations
export async function exportData(): Promise<{
  favorites: FavoriteItem[];
  clipboard: ClipboardHistoryItem[];
  tags: Tag[];
  folders: Folder[];
  settings: AppSettings;
  deletedItems: string[];
}> {
  const database = await initDB();
  const favorites = await database.getAll('favorites');
  const clipboard = await database.getAll('clipboard');
  const tags = await database.getAll('tags');
  const folders = await database.getAll('folders');
  const deletedItemsRecords = await database.getAll('deleted_items');
  const deletedItems = deletedItemsRecords.map(item => item.id);
  const settings = await getSettings();

  return { favorites, clipboard, tags, folders, deletedItems, settings };
}

export async function importData(data: {
  favorites?: FavoriteItem[];
  clipboard?: ClipboardHistoryItem[];
  tags?: Tag[];
  folders?: Folder[];
  settings?: AppSettings;
}): Promise<void> {
  const database = await initDB();

  if (data.favorites) {
    await Promise.all(data.favorites.map(item => database.put('favorites', item)));
  }

  if (data.clipboard) {
    await Promise.all(data.clipboard.map(item => database.put('clipboard', item)));
  }

  if (data.tags) {
    await Promise.all(data.tags.map(tag => database.put('tags', tag)));
  }

  if (data.folders) {
    await Promise.all(data.folders.map(folder => database.put('folders', folder)));
  }

  if (data.settings) {
    await saveSettings(data.settings);
  }
}

// Search Operations
export async function searchFavorites(query: string): Promise<FavoriteItem[]> {
  const database = await initDB();
  const all = await database.getAll('favorites');
  const lowerQuery = query.toLowerCase();

  return all.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.content.toLowerCase().includes(lowerQuery) ||
    item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    (item.metadata.description && item.metadata.description.toLowerCase().includes(lowerQuery)) ||
    (item.metadata.contactName && item.metadata.contactName.toLowerCase().includes(lowerQuery))
  );
}

// Clear all data
export async function clearAllData(): Promise<void> {
  const database = await initDB();
  await Promise.all([
    database.clear('favorites'),
    database.clear('clipboard'),
    database.clear('tags'),
    database.clear('folders'),
  ]);
}
