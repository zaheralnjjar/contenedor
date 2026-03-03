import { useState, useEffect } from 'react';
import type { FavoriteItem, ContentType } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Youtube,
  Globe,
  Phone,
  MapPin,
  Type,
  Image,
  Plus,
  X,
  Link,
  MapPinned,
  User,
  FolderOpen,
} from 'lucide-react';
import { detectContentType, extractYouTubeInfo, getRandomColor } from '@/lib/utils';
import { toast } from 'sonner';

interface AddEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: FavoriteItem | null;
}

const typeOptions: { value: ContentType; label: string; icon: React.ElementType }[] = [
  { value: 'youtube', label: 'يوتيوب', icon: Youtube },
  { value: 'website', label: 'موقع', icon: Globe },
  { value: 'phone', label: 'هاتف', icon: Phone },
  { value: 'location', label: 'موقع', icon: MapPin },
  { value: 'text', label: 'نص', icon: Type },
  { value: 'image', label: 'صورة', icon: Image },
];

export function AddEditDialog({ open, onOpenChange, item }: AddEditDialogProps) {
  const { addFavorite, updateFavorite, createTag, state } = useApp();
  const isEditing = !!item;

  const [type, setType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [metadata, setMetadata] = useState<FavoriteItem['metadata']>({});
  const [folderId, setFolderId] = useState<string>('none');

  // Location fields
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');

  // Phone fields
  const [contactName, setContactName] = useState('');

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        setType(item.type);
        setTitle(item.title);
        setContent(item.content);
        setUrl(item.url || '');
        setThumbnail(item.thumbnail || '');
        setTags(item.tags);
        setIsPinned(item.isPinned);
        setMetadata(item.metadata);
        setFolderId(item.folderId || 'none');
        setLatitude(item.metadata.latitude?.toString() || '');
        setLongitude(item.metadata.longitude?.toString() || '');
        setAddress(item.metadata.address || '');
        setContactName(item.metadata.contactName || '');
      } else {
        resetForm();
      }
    }
  }, [open, item]);

  // Auto-detect type when content changes (only for new items)
  useEffect(() => {
    if (!isEditing && content) {
      const detected = detectContentType(content);
      setType(detected);

      // Auto-extract info for YouTube
      if (detected === 'youtube') {
        const ytInfo = extractYouTubeInfo(content);
        if (ytInfo) {
          setTitle(ytInfo.title);
          setUrl(content);
          setThumbnail(ytInfo.thumbnail);
          setMetadata({ videoId: ytInfo.videoId });
        }
      } else if (detected === 'website') {
        try {
          const urlObj = new URL(content);
          setTitle(urlObj.hostname);
          setUrl(content);
        } catch {
          setTitle(content.slice(0, 50));
        }
      }
    }
  }, [content, isEditing]);

  const resetForm = () => {
    setType('text');
    setTitle('');
    setContent('');
    setUrl('');
    setThumbnail('');
    setTags([]);
    setIsPinned(false);
    setNewTag('');
    setMetadata({});
    setFolderId('none');
    setLatitude('');
    setLongitude('');
    setAddress('');
    setContactName('');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      // Create tag in database if it doesn't exist
      if (!state.tags.some(t => t.name === newTag.trim())) {
        createTag(newTag.trim(), getRandomColor());
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('العنوان والمحتوى مطلوبان');
      return;
    }

    const itemData = {
      type,
      title: title.trim(),
      content: content.trim(),
      url: url.trim() || undefined,
      thumbnail: thumbnail.trim() || undefined,
      tags,
      isPinned,
      folderId: folderId === 'none' ? undefined : folderId,
      metadata: {
        ...metadata,
        ...(type === 'location' && {
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          address: address || undefined,
        }),
        ...(type === 'phone' && {
          contactName: contactName || undefined,
        }),
      },
    };

    try {
      if (isEditing && item) {
        await updateFavorite({ ...item, ...itemData });
      } else {
        await addFavorite(itemData);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل العنصر' : 'إضافة جديد'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>نوع المحتوى</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Folder Selection */}
          {state.folders.length > 0 && (
            <div className="space-y-2">
              <Label>المجلد</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المجلد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">بدون مجلد</span>
                  </SelectItem>
                  {state.folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">المحتوى *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="أدخل المحتوى هنا..."
              rows={3}
              dir="auto"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">العنوان *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان العنصر"
            />
          </div>

          {/* URL (for website and youtube) */}
          {(type === 'website' || type === 'youtube' || type === 'image') && (
            <div className="space-y-2">
              <Label htmlFor="url">الرابط</Label>
              <div className="relative">
                <Link className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="pr-10"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Thumbnail */}
          {(type === 'youtube' || type === 'image') && (
            <div className="space-y-2">
              <Label htmlFor="thumbnail">رابط الصورة المصغرة</Label>
              <Input
                id="thumbnail"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
          )}

          {/* Location Fields */}
          {type === 'location' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPinned className="h-4 w-4" />
                إحداثيات الموقع
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lat">خط العرض</Label>
                  <Input
                    id="lat"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="24.7136"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">خط الطول</Label>
                  <Input
                    id="lng"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="46.6753"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="العنوان الكامل..."
                />
              </div>
            </div>
          )}

          {/* Phone Fields */}
          {type === 'phone' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                معلومات جهة الاتصال
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">اسم جهة الاتصال</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="اسم الشخص أو الشركة"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>الوسوم</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="أضف وسم..."
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Pin */}
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div className="space-y-0.5">
              <Label htmlFor="pin">تثبيت العنصر</Label>
              <p className="text-sm text-muted-foreground">إظهار في الأعلى دائماً</p>
            </div>
            <Switch
              id="pin"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'حفظ التغييرات' : 'إضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
