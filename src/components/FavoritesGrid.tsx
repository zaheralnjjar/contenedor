import { useMemo, useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { FavoriteCard } from './FavoriteCard';
import type { FavoriteItem } from '@/types';
import { EmptyState } from './EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { searchYouTube, searchYouTubeChannels } from '@/lib/utils';
import {
  Youtube,
  Play,
  Plus,
  Loader2,
  Users,
  Eye,
  Clock,
  ExternalLink,
  CheckSquare,
  Share2,
  Trash2,
  X as XIcon,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface FavoritesGridProps {
  onEdit: (item: FavoriteItem) => void;
}

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description: string;
  channelUrl?: string;
  duration?: string;
  views?: number;
  uploadedDate?: string;
}

interface ChannelResult {
  channelId: string;
  name: string;
  thumbnail: string;
  description: string;
  subscribers?: string;
  videos?: number;
  url: string;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
  return views.toString();
}

export function FavoritesGrid({ onEdit }: FavoritesGridProps) {
  const { state, addFavorite, deleteFavorite, emptyTrash, hardDeleteFavorite, restoreFavorite } = useApp();
  const [ytVideos, setYtVideos] = useState<VideoResult[]>([]);
  const [ytChannels, setYtChannels] = useState<ChannelResult[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytSearched, setYtSearched] = useState(false);

  // Selection mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Debounced YouTube search when query changes
  const searchQuery = state.searchQuery.trim();

  const performYouTubeSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setYtVideos([]);
      setYtChannels([]);
      setYtSearched(false);
      return;
    }

    setYtLoading(true);
    setYtSearched(true);
    try {
      const [videos, channels] = await Promise.all([
        searchYouTube(query, 50), // Changed from 8 to 50
        searchYouTubeChannels(query, 5), // Changed from 3 to 5
      ]);
      setYtVideos(videos);
      setYtChannels(channels);
    } catch (error) {
      console.error('YouTube search failed:', error);
    } finally {
      setYtLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performYouTubeSearch(searchQuery);
    }, 600); // Debounce 600ms

    return () => clearTimeout(timer);
  }, [searchQuery, performYouTubeSearch]);

  const handleAddVideo = async (video: VideoResult) => {
    await addFavorite({
      type: 'youtube',
      title: video.title,
      content: video.description || video.title,
      url: `https://youtube.com/watch?v=${video.videoId}`,
      thumbnail: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
      tags: [],
      isPinned: false,
      metadata: {
        videoId: video.videoId,
        channelName: video.channelTitle,
        duration: video.duration,
      },
    });
    toast.success('تمت إضافة الفيديو إلى المفضلات 🎬');
  };

  const filteredAndSortedFavorites = useMemo(() => {
    let result = [...state.favorites];

    // Handle soft delete properly
    if (state.filter === 'trash') {
      result = result.filter(item => item.isDeleted);
    } else {
      result = result.filter(item => !item.isDeleted);

      // Filter by folder
      if (state.selectedFolder !== null) {
        result = result.filter(item => item.folderId === state.selectedFolder);
      }

      // Filter by type
      if (state.filter !== 'all') {
        result = result.filter(item => item.type === state.filter);
      }
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (state.selectedTags.length > 0) {
      result = result.filter(item =>
        state.selectedTags.some(tag => item.tags.includes(tag))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      switch (state.sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'alphabetical':
          return a.title.localeCompare(b.title, 'ar');
        case 'size':
          return ((b.content?.length || 0) + (b.url?.length || 0)) - ((a.content?.length || 0) + (a.url?.length || 0));
        case 'subject':
          return a.type.localeCompare(b.type, 'ar');
        case 'pinned':
          return b.createdAt - a.createdAt;
        default:
          return 0;
      }
    });

    return result;
  }, [state.favorites, state.filter, state.searchQuery, state.selectedTags, state.sortBy, state.selectedFolder]);

  const toggleSelectionMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedItems(new Set());
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredAndSortedFavorites.length && filteredAndSortedFavorites.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedFavorites.map(item => item.id)));
    }
  }, [filteredAndSortedFavorites, selectedItems.size]);

  const executeBulkDelete = useCallback(() => {
    if (selectedItems.size === 0) return;
    const isTrashMode = state.filter === 'trash';
    const msg = isTrashMode ? `هل أنت متأكد من الحذف النهائي لـ ${selectedItems.size} عنصر؟` : `هل أنت متأكد من نقل ${selectedItems.size} عنصر إلى المهملات؟`;

    if (window.confirm(msg)) {
      selectedItems.forEach(id => {
        if (isTrashMode) {
          hardDeleteFavorite(id);
        } else {
          deleteFavorite(id);
        }
      });
      setIsSelectMode(false);
      setSelectedItems(new Set());
      toast.success(isTrashMode ? `تم الحذف النهائي لـ ${selectedItems.size} عنصر` : `تم نقل ${selectedItems.size} عنصر إلى المهملات!`);
    }
  }, [selectedItems, state.filter, hardDeleteFavorite, deleteFavorite]);

  const executeBulkRestore = useCallback(() => {
    if (selectedItems.size === 0) return;
    selectedItems.forEach(id => restoreFavorite(id));
    setIsSelectMode(false);
    setSelectedItems(new Set());
    toast.success(`تم استعادة ${selectedItems.size} عنصر بنجاح`);
  }, [selectedItems, restoreFavorite]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block if focused inside input/textarea to not break normal typing
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        if (!isSelectMode) setIsSelectMode(true);
        handleSelectAll();
      } else if (e.key === 'Escape' && isSelectMode) {
        e.preventDefault();
        setIsSelectMode(false);
        setSelectedItems(new Set());
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && isSelectMode) {
        e.preventDefault();
        executeBulkDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode, handleSelectAll, executeBulkDelete]);

  const executeBulkShare = async () => {
    if (selectedItems.size === 0) return;
    const itemsToShare = filteredAndSortedFavorites.filter(item => selectedItems.has(item.id));
    const textToShare = itemsToShare.map(item => {
      let text = `${item.title}\n`;
      if (item.url) text += `${item.url}\n`;
      if (item.content) text += `${item.content}\n`;
      return text;
    }).join('\n---\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'مشاركة مفضلات',
          text: textToShare,
        });
        toast.success('تمت المشاركة بنجاح');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      toast.success('تم نسخ المحتوى للمشاركة');
    }
    setIsSelectMode(false);
    setSelectedItems(new Set());
  };

  if (state.isLoading) {
    return (
      <div className="container px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasLocalResults = filteredAndSortedFavorites.length > 0;
  const hasYtResults = ytVideos.length > 0 || ytChannels.length > 0;
  const showYtSection = searchQuery.length >= 2 && (ytLoading || ytSearched);

  if (!hasLocalResults && !showYtSection) {
    return (
      <EmptyState
        hasFilters={state.filter !== 'all' || state.searchQuery !== '' || state.selectedTags.length > 0}
      />
    );
  }

  return (
    <div className="container px-4 py-6 space-y-8 relative">
      {/* Selection Action Bar */}
      {isSelectMode && (
        <div className="sticky top-16 z-40 mb-6 bg-card border shadow-lg rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>
              <XIcon className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
            <span className="font-semibold text-sm">
              تم تحديد {selectedItems.size}
            </span>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              <CheckSquare className="h-4 w-4 ml-2" />
              تحديد الكل
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {state.filter === 'trash' && selectedItems.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={executeBulkRestore}
              >
                <RotateCcw className="h-4 w-4 ml-2" />
                استعادة
              </Button>
            )}
            {state.filter !== 'trash' && (
              <Button
                variant="default"
                size="sm"
                onClick={executeBulkShare}
                disabled={selectedItems.size === 0}
              >
                <Share2 className="h-4 w-4 ml-2" />
                مشاركة
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={executeBulkDelete}
              disabled={selectedItems.size === 0}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              {state.filter === 'trash' ? 'حذف نهائي' : 'حذف'}
            </Button>
          </div>
        </div>
      )}

      {/* Main Header with Actions */}
      {!isSelectMode && hasLocalResults && (
        <div className="flex justify-end mb-4 gap-2">
          {state.filter === 'trash' && (
            <Button variant="destructive" size="sm" onClick={() => {
              if (window.confirm('هل أنت متأكد من تفريغ سلة المهملات بالكامل؟ لا يمكن التراجع عن هذه الخطوة.')) {
                emptyTrash();
              }
            }}>
              <Trash2 className="h-4 w-4 ml-2" />
              إفراغ السلة
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
            <CheckSquare className="h-4 w-4 ml-2" />
            تحديد عناصر
          </Button>
        </div>
      )}

      {/* YouTube Search Results Section */}
      {showYtSection && (
        <div className="space-y-4">
          {/* YouTube Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full">
              <Youtube className="h-4 w-4" />
              <span className="text-sm font-medium">نتائج يوتيوب</span>
            </div>
            {ytLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!ytLoading && ytSearched && ytVideos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {ytVideos.length} فيديو
                {ytChannels.length > 0 && ` • ${ytChannels.length} قناة`}
              </span>
            )}
          </div>

          {/* Loading State */}
          {ytLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Channels Row */}
          {!ytLoading && ytChannels.length > 0 && (
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {ytChannels.map((channel) => (
                  <a
                    key={channel.channelId}
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 min-w-[240px] p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {channel.thumbnail ? (
                        <img src={channel.thumbnail} alt={channel.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{channel.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {channel.subscribers && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {channel.subscribers}
                          </span>
                        )}
                        {channel.videos && (
                          <span>{channel.videos} فيديو</span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {/* Videos Grid */}
          {!ytLoading && ytVideos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ytVideos.map((video) => (
                <div
                  key={video.videoId}
                  className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Duration Badge */}
                    {video.duration && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        {video.duration}
                      </span>
                    )}
                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={`https://youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play className="h-5 w-5 text-white ml-0.5" />
                      </a>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full shadow-lg"
                        onClick={() => handleAddVideo(video)}
                        title="إضافة للمفضلات"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* YouTube Badge */}
                    <Badge className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] px-1.5 py-0 gap-1 border-0">
                      <Youtube className="h-3 w-3" />
                    </Badge>
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="font-medium text-sm line-clamp-2 leading-tight">{video.title}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <a
                        href={video.channelUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors truncate"
                      >
                        {video.channelTitle}
                      </a>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {video.views !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            {formatViews(video.views)}
                          </span>
                        )}
                      </div>
                    </div>
                    {video.uploadedDate && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {video.uploadedDate}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No YouTube results */}
          {!ytLoading && ytSearched && !hasYtResults && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              لم يتم العثور على نتائج في يوتيوب
            </div>
          )}
        </div>
      )}

      {/* Divider between YouTube and local results */}
      {showYtSection && hasYtResults && hasLocalResults && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground px-2">المفضلات المحفوظة</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Local Favorites Grid */}
      {hasLocalResults && (() => {
        const isInFolder = state.selectedFolder !== null;

        // If inside a folder: flat list (no grouping)
        if (isInFolder) {
          return (
            <div>
              <div className={state.viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"}>
                {filteredAndSortedFavorites.map((item) => (
                  <FavoriteCard
                    key={item.id}
                    item={item}
                    onEdit={onEdit}
                    isSelectMode={isSelectMode}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={handleSelectItem}
                    viewMode={state.viewMode}
                  />
                ))}
              </div>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {filteredAndSortedFavorites.length} عنصر
              </div>
            </div>
          );
        }

        // In "all" view: group by type/category
        const typeLabels: Record<string, string> = {
          youtube: '🎬 يوتيوب',
          video: '🎥 فيديو',
          audio: '🎵 صوت',
          document: '📄 مستندات',
          website: '🌐 مواقع ويب',
          phone: '📞 أرقام هواتف',
          location: '📍 مواقع',
          image: '🖼️ صور',
          text: '📝 نصوص وملاحظات',
        };

        const typeOrder = ['youtube', 'video', 'audio', 'document', 'image', 'website', 'location', 'phone', 'text'];

        const grouped = filteredAndSortedFavorites.reduce((acc, item) => {
          if (!acc[item.type]) acc[item.type] = [];
          acc[item.type].push(item);
          return acc;
        }, {} as Record<string, typeof filteredAndSortedFavorites>);

        const sortedGroups = typeOrder
          .filter(type => grouped[type] && grouped[type].length > 0)
          .map(type => ({ type, items: grouped[type] }));

        // Add any types not in typeOrder
        Object.keys(grouped).forEach(type => {
          if (!typeOrder.includes(type)) {
            sortedGroups.push({ type, items: grouped[type] });
          }
        });

        return (
          <div className="space-y-8">
            {sortedGroups.map(({ type, items }) => (
              <div key={type}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold whitespace-nowrap">
                    {typeLabels[type] || type}
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                {/* Items Grid */}
                <div className={state.viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"}>
                  {items.map((item) => (
                    <FavoriteCard
                      key={item.id}
                      item={item}
                      onEdit={onEdit}
                      isSelectMode={isSelectMode}
                      isSelected={selectedItems.has(item.id)}
                      onSelect={handleSelectItem}
                      viewMode={state.viewMode}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {filteredAndSortedFavorites.length} عنصر
              {state.filter !== 'all' && ` - ${state.filter}`}
              {state.searchQuery && ` - البحث: "${state.searchQuery}"`}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
