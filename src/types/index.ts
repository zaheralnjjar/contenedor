export type ContentType = 'youtube' | 'website' | 'phone' | 'location' | 'text' | 'image';

export interface FavoriteItem {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  url?: string;
  thumbnail?: string;
  tags: string[];
  folderId?: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  metadata: {
    // YouTube specific
    videoId?: string;
    channelName?: string;
    duration?: string;
    // Website specific
    description?: string;
    favicon?: string;
    // Phone specific
    contactName?: string;
    // Location specific
    latitude?: number;
    longitude?: number;
    address?: string;
    street?: string;
    buildingNumber?: string;
    city?: string;
    country?: string;
    // Image specific
    imageUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
}

export interface ClipboardHistoryItem {
  id: string;
  content: string;
  type: ContentType;
  timestamp: number;
  sourceItemId?: string;
}

export type FilterType = 'all' | ContentType;

export type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'pinned';

export interface AppSettings {
  autoSaveClipboard: boolean;
  showNotifications: boolean;
  backupEnabled: boolean;
  backupInterval: number;
  language: 'ar' | 'es';
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sequentialCopyMode?: boolean;
  sequentialCopySeparator?: string;
  id?: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}
