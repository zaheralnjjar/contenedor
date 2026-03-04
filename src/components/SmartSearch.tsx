import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Command as CommandPrimitive } from 'cmdk';
import {
    Youtube,
    Globe,
    Phone,
    Type,
    Image as ImageIcon,
    Search,
    SearchX,
    MapPin,
    Loader2,
    Plus,
    Play as PlayIcon,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyToClipboard, searchYouTube } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SmartSearch() {
    const { state, setFloatingVideo, addFavorite } = useApp();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [globalResults, setGlobalResults] = useState<any[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle focus with Cmd+K or Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global YouTube search with debounce
    useEffect(() => {
        if (!search.trim() || search.length < 2) {
            setGlobalResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingGlobal(true);
            try {
                const results = await searchYouTube(search, 50);
                setGlobalResults(results);
            } catch (error) {
                console.error('Global search error:', error);
            } finally {
                setIsSearchingGlobal(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const handleSelect = useCallback((item: any) => {
        setOpen(false);
        setSearch('');

        if (item.type === 'youtube') {
            const vId = item.metadata?.videoId || (item.url?.includes('v=') ? item.url.split('v=')[1].split('&')[0] : '');
            if (vId) {
                setFloatingVideo({ videoId: vId, title: item.title });
            } else if (item.url) {
                window.open(item.url, '_blank');
            }
        } else if (item.url && item.type !== 'location') {
            window.open(item.url, '_blank');
        } else if (item.type === 'phone') {
            window.open(`tel:${item.content.replace(/\s/g, '')}`);
        } else if (item.type === 'location' && item.metadata?.latitude && item.metadata?.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.metadata.latitude},${item.metadata.longitude}&travelmode=driving`, '_blank');
        } else if (item.type === 'text' || item.type === 'location') {
            copyToClipboard(item.content).then(() => {
                toast.success('تم النسخ إلى الحافظة');
            }).catch(() => {
                toast.error('فشل النسخ');
            });
        }
    }, [setFloatingVideo]);

    const filteredFavorites = state.favorites.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    const groupedFavorites = filteredFavorites.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
    }, {} as Record<string, typeof state.favorites>);

    const typeIcons: Record<string, any> = {
        youtube: Youtube,
        website: Globe,
        phone: Phone,
        location: MapPin,
        text: Type,
        image: ImageIcon,
    };

    const typeLabels: Record<string, string> = {
        youtube: 'يوتيوب',
        website: 'مواقع',
        phone: 'أرقام هواتف',
        location: 'مواقع جغرافية',
        text: 'نصوص وملاحظات',
        image: 'صور',
    };

    const hasResults = filteredFavorites.length > 0 || globalResults.length > 0 || isSearchingGlobal;

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl group mx-auto">
            <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/30 transition-all duration-300",
                open && "bg-background ring-2 ring-primary/20 border-primary/30"
            )} dir="rtl">
                <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                <input
                    ref={inputRef}
                    placeholder="ابحث في المفضلات أو يوتيوب..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60 h-8 text-right"
                    dir="rtl"
                />
                {search && (
                    <button onClick={() => { setSearch(''); setOpen(false); }} className="p-1 hover:text-primary transition-colors">
                        <X className="h-4 w-4 opacity-50" />
                    </button>
                )}
            </div>

            {open && search.length > 0 && (
                <div className="absolute top-full w-full left-1/2 -translate-x-1/2 mt-3 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-300 md:w-[120%] lg:w-[140%] max-w-4xl">
                    <CommandPrimitive shouldFilter={false} className="flex flex-col h-[70vh] max-h-[800px]">
                        <CommandPrimitive.List className="overflow-y-auto p-2 w-full h-full scroll-smooth" dir="rtl">
                            {/* Loading State for Global Search */}
                            {isSearchingGlobal && (
                                <div className="flex items-center justify-center py-6 text-muted-foreground gap-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-xs font-medium">جاري البحث في يوتيوب...</span>
                                </div>
                            )}

                            {!hasResults && !isSearchingGlobal && (
                                <div className="flex flex-col items-center justify-center gap-3 py-10">
                                    <div className="bg-muted/30 p-4 rounded-full">
                                        <SearchX className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm text-foreground/70 font-medium">لا توجد نتائج مطابقة لـ "{search}"</p>
                                </div>
                            )}

                            {/* Local Favorites */}
                            {Object.entries(groupedFavorites).map(([type, items]) => (
                                <CommandPrimitive.Group key={type} className="mb-2">
                                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                                        <div className="h-px flex-1 bg-border/40" />
                                        {typeLabels[type] || type}
                                        <div className="h-px flex-1 bg-border/40" />
                                    </div>
                                    {items.map((item) => {
                                        const Icon = typeIcons[type] || Type;
                                        return (
                                            <CommandPrimitive.Item
                                                key={item.id}
                                                onSelect={() => handleSelect(item)}
                                                className="flex items-center gap-4 cursor-pointer py-3 px-4 rounded-xl transition-all duration-200 hover:bg-primary/5 group/item aria-selected:bg-primary/5"
                                            >
                                                <div className="flex-shrink-0 bg-primary/10 text-primary p-2.5 rounded-xl group-hover/item:scale-110 transition-transform">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="truncate font-semibold text-sm">{item.title}</span>
                                                    <span className="truncate text-[11px] text-muted-foreground/80 mt-0.5">
                                                        {item.type === 'phone' || item.type === 'text' || item.type === 'location'
                                                            ? item.content
                                                            : (item.url || item.content)
                                                        }
                                                    </span>
                                                </div>
                                            </CommandPrimitive.Item>
                                        );
                                    })}
                                </CommandPrimitive.Group>
                            ))}

                            {/* YouTube Global Search Results */}
                            {globalResults.length > 0 && (
                                <CommandPrimitive.Group className="mt-4">
                                    <div className="px-3 py-2 text-[10px] font-bold text-red-500/80 uppercase tracking-widest flex items-center gap-2">
                                        <div className="h-px flex-1 bg-red-500/20" />
                                        <span>نتائج يوتيوب العالمية</span>
                                        <div className="h-px flex-1 bg-red-500/20" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2">
                                        {globalResults.map((video) => (
                                            <CommandPrimitive.Item
                                                key={video.videoId}
                                                onSelect={() => {
                                                    setFloatingVideo({ videoId: video.videoId, title: video.title });
                                                    setOpen(false);
                                                    setSearch('');
                                                }}
                                                className="flex flex-col gap-2 cursor-pointer p-2 rounded-xl border border-transparent transition-all duration-200 hover:bg-red-500/5 hover:border-red-500/20 group/yt aria-selected:bg-red-500/5 relative"
                                            >
                                                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border group-hover/yt:border-red-500/40 transition-colors">
                                                    <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/yt:opacity-100 transition-opacity">
                                                        <PlayIcon className="h-6 w-6 text-white fill-white shadow-sm" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full min-w-0 flex flex-col">
                                                    <h4 className="font-semibold text-xs line-clamp-2 leading-tight flex-1">{video.title}</h4>
                                                    <p className="text-[10px] text-muted-foreground mt-1 truncate group-hover/yt:text-primary transition-colors">
                                                        {video.channelTitle}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="absolute top-3 right-3 h-8 w-8 rounded-full opacity-0 group-hover/yt:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground shadow-md z-10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addFavorite({
                                                            type: 'youtube',
                                                            title: video.title,
                                                            content: video.title,
                                                            url: `https://youtube.com/watch?v=${video.videoId}`,
                                                            thumbnail: video.thumbnail,
                                                            tags: ['بحث عالمي'],
                                                            isPinned: false,
                                                            metadata: {
                                                                videoId: video.videoId,
                                                                channelName: video.channelTitle
                                                            }
                                                        });
                                                        toast.success('تمت الإضافة للمفضلات');
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </CommandPrimitive.Item>
                                        ))}
                                    </div>
                                </CommandPrimitive.Group>
                            )}
                        </CommandPrimitive.List>
                    </CommandPrimitive>
                </div>
            )}
        </div>
    );
}
