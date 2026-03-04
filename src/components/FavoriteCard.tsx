import { useState } from 'react';
import type { FavoriteItem } from '@/types';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Youtube,
  Globe,
  Phone,
  MapPin,
  Type,
  Image,
  MoreVertical,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Pin,
  MapPinned,
  Play,
  PhoneCall,
  MonitorPlay,
  FolderPlus,
} from 'lucide-react';
import { cn, formatRelativeTime, copyToClipboard, truncateText } from '@/lib/utils';
import { toast } from 'sonner';

interface FavoriteCardProps {
  item: FavoriteItem;
  onEdit: (item: FavoriteItem) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  youtube: Youtube,
  website: Globe,
  phone: Phone,
  location: MapPin,
  text: Type,
  image: Image,
};

const typeColors: Record<string, string> = {
  youtube: 'bg-red-500/10 text-red-500 border-red-500/20',
  website: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  phone: 'bg-green-500/10 text-green-500 border-green-500/20',
  location: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  text: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  image: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const typeLabels: Record<string, string> = {
  youtube: 'يوتيوب',
  website: 'موقع',
  phone: 'هاتف',
  location: 'موقع',
  text: 'نص',
  image: 'صورة',
};

export function FavoriteCard({ item, onEdit, isSelectMode, isSelected, onSelect }: FavoriteCardProps) {
  const { state, togglePin, deleteFavorite, setFloatingVideo, updateFavorite } = useApp();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const Icon = typeIcons[item.type] || Type;

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await copyToClipboard(item.content);
      toast.success('تم النسخ إلى الحافظة');
    } catch {
      toast.error('فشل النسخ');
    }
  };

  const openAppropriateLink = () => {
    if (item.url) {
      window.open(item.url, '_blank');
    } else if (item.type === 'phone') {
      window.open(`tel:${item.content.replace(/\s/g, '')}`, '_self');
    } else if (item.type === 'location' && item.metadata.latitude && item.metadata.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.metadata.latitude},${item.metadata.longitude}&travelmode=driving`, '_blank');
    }
  };

  const handleOpen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    openAppropriateLink();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent triggering if clicked on inner buttons/menus/links
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('[role="menuitem"]')) {
      return;
    }

    if (isSelectMode) {
      onSelect?.(item.id);
      return;
    }

    // Default action on click
    if (item.type === 'youtube') {
      const vId = item.metadata.videoId || (item.url?.includes('v=') ? item.url.split('v=')[1].split('&')[0] : '');
      if (vId) setFloatingVideo({ videoId: vId, title: item.title });
    } else if (item.type === 'location' && item.metadata.latitude && item.metadata.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.metadata.latitude},${item.metadata.longitude}&travelmode=driving`, '_blank');
    } else if (item.type === 'image') {
      setImageDialogOpen(true);
    } else if (item.type === 'phone') {
      window.open(`tel:${item.content.replace(/\s/g, '')}`, '_self');
    } else {
      onEdit(item);
    }
  };

  const handleDelete = () => {
    deleteFavorite(item.id);
    setDeleteDialogOpen(false);
  };

  const moveToFolder = async (folderId: string | null) => {
    await updateFavorite({ ...item, folderId: folderId || undefined });
    toast.success(folderId ? 'تم النقل للمجلد' : 'تمت الإزالة من المجلد');
  };

  const renderThumbnail = () => {
    // YouTube videos
    if (item.type === 'youtube' && item.thumbnail) {
      return (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group/thumb">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-all">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full h-10 w-10 hover:scale-105 transition-transform"
              onClick={() => setVideoDialogOpen(true)}
              title="مشاهدة ملئ الشاشة"
            >
              <Play className="h-5 w-5 ml-0.5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-background/80 hover:bg-background h-10 w-10 hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                const vId = item.metadata.videoId || (item.url?.includes('v=') ? item.url.split('v=')[1].split('&')[0] : '');
                if (vId) setFloatingVideo({ videoId: vId, title: item.title });
              }}
              title="مشغل مصغر"
            >
              <MonitorPlay className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Images
    if (item.type === 'image' && (item.thumbnail || item.metadata.imageUrl)) {
      const imageUrl = item.thumbnail || item.metadata.imageUrl;
      return (
        <div
          className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group/thumb"
          onClick={() => setImageDialogOpen(true)}
        >
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
            loading="lazy"
          />
        </div>
      );
    }

    // Locations with map
    if (item.type === 'location') {
      if (item.thumbnail) {
        return (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group/thumb">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
              loading="lazy"
            />
            <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs">
              <MapPin className="h-3 w-3 inline ml-1" />
              {item.metadata.latitude?.toFixed(4)}, {item.metadata.longitude?.toFixed(4)}
            </div>
          </div>
        );
      }
      return (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          <MapPinned className="h-12 w-12 text-muted-foreground/50" />
          {item.metadata.latitude && item.metadata.longitude && (
            <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs">
              {item.metadata.latitude.toFixed(4)}, {item.metadata.longitude.toFixed(4)}
            </div>
          )}
        </div>
      );
    }

    // Websites with screenshot
    if (item.type === 'website' && item.thumbnail) {
      return (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group/thumb">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
            loading="lazy"
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Globe className="h-12 w-12 text-muted-foreground/30" />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Card
        className={cn(
          'group relative overflow-hidden transition-all hover:shadow-lg cursor-pointer',
          item.isPinned && 'ring-2 ring-primary/20',
          isSelected && 'ring-2 ring-primary bg-primary/5',
          isSelectMode && !isSelected && 'hover:bg-accent/50 opacity-90 hover:opacity-100'
        )}
        onClick={handleCardClick}
      >
        {/* Selection Mask / Checkbox Indicator */}
        {isSelectMode && (
          <div className="absolute top-2 right-2 z-20">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center bg-background",
              isSelected ? "border-primary bg-primary" : "border-muted-foreground"
            )}>
              {isSelected && <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full" />}
            </div>
          </div>
        )}

        {/* Pin Indicator */}
        {item.isPinned && (
          <div className="absolute top-2 left-2 z-10">
            <Pin className="h-4 w-4 text-primary fill-primary" />
          </div>
        )}

        {/* Thumbnail */}
        {renderThumbnail()}

        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className={cn('p-1.5 rounded-md', typeColors[item.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground">{typeLabels[item.type]}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="ml-2 h-4 w-4" />
                  نسخ
                </DropdownMenuItem>
                {(item.url || item.type === 'phone' || item.type === 'location') && (
                  <DropdownMenuItem onClick={handleOpen}>
                    <ExternalLink className="ml-2 h-4 w-4" />
                    {item.type === 'location' ? 'اتجاهات' : 'فتح'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="ml-2 h-4 w-4" />
                  تعديل
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => togglePin(item.id)}>
                  <Pin className="ml-2 h-4 w-4" />
                  {item.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderPlus className="ml-2 h-4 w-4" />
                    <span>نقل إلى مجلد</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => moveToFolder(null)}>
                        بدون مجلد
                      </DropdownMenuItem>
                      {state.folders.map(folder => (
                        <DropdownMenuItem key={folder.id} onClick={() => moveToFolder(folder.id)}>
                          <div className="w-2 h-2 rounded-full ml-2" style={{ backgroundColor: folder.color }} />
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm mb-1 line-clamp-2" title={item.title}>
            {item.title}
          </h3>

          {/* Content Preview - Enhanced for different types */}
          {item.type === 'location' && item.metadata.street && (
            <div className="text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3 inline ml-1" />
              {item.metadata.street}
              {item.metadata.buildingNumber && ` ${item.metadata.buildingNumber}`}
              {item.metadata.city && `, ${item.metadata.city}`}
            </div>
          )}
          {item.type === 'youtube' && item.metadata.channelName && (
            <div className="text-xs text-muted-foreground mb-2">
              <Youtube className="h-3 w-3 inline ml-1" />
              {item.metadata.channelName}
            </div>
          )}
          {item.type === 'website' && item.url && (
            <div className="text-xs text-muted-foreground mb-2 truncate">
              <Globe className="h-3 w-3 inline ml-1" />
              {new URL(item.url).hostname}
            </div>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3" dir="auto">
            {truncateText(item.content, 100)}
          </p>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatRelativeTime(item.createdAt)}</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="نسخ"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {(item.url || item.type === 'phone' || item.type === 'location') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleOpen}
                  title="فتح"
                >
                  {item.type === 'phone' ? (
                    <PhoneCall className="h-3.5 w-3.5" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
                title="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
          </DialogHeader>
          {item.metadata.imageUrl && (
            <img
              src={item.metadata.imageUrl}
              alt={item.title}
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
          </DialogHeader>
          {item.metadata.videoId && (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${item.metadata.videoId}`}
                title={item.title}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف "{item.title}" نهائياً من مفضلاتك. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
