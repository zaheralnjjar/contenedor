import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Loader2, Save, X, Plus } from 'lucide-react';
import {
  getCurrentPosition,
  reverseGeocode,
  getStaticMapUrl,
  getRandomColor
} from '@/lib/utils';
import { toast } from 'sonner';

interface QuickLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickLocationDialog({ open, onOpenChange }: QuickLocationDialogProps) {
  const { addFavorite, createTag } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [mapUrl, setMapUrl] = useState('');

  // Auto-get location when dialog opens
  useEffect(() => {
    if (open) {
      handleGetCurrentLocation();
    }
  }, [open]);

  const handleGetCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));

      // Generate map preview
      setMapUrl(getStaticMapUrl(lat, lng));

      // Reverse geocode to get address
      const locationInfo = await reverseGeocode(lat, lng);

      if (locationInfo) {
        setAddress(locationInfo.address || '');
        setStreet(locationInfo.street || '');
        setBuildingNumber(locationInfo.buildingNumber || '');
        setCity(locationInfo.city || '');

        // Auto-generate title
        const autoTitle = locationInfo.street
          ? `${locationInfo.street}${locationInfo.buildingNumber ? ' ' + locationInfo.buildingNumber : ''}`
          : locationInfo.address?.split(',')[0] || 'موقعي الحالي';
        setTitle(autoTitle);
      } else {
        setTitle('موقعي الحالي');
      }

      toast.success('تم تحديد الموقع بنجاح');
    } catch (error) {
      console.error('Location error:', error);
      toast.error('فشل تحديد الموقع، تأكد من تفعيل خدمة الموقع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      createTag(newTag.trim(), getRandomColor());
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!latitude || !longitude) {
      toast.error('الرجاء تحديد الموقع أولاً');
      return;
    }

    const fullAddress = address || [street, buildingNumber, city].filter(Boolean).join(', ');

    await addFavorite({
      type: 'location',
      title: title || 'موقع محفوظ',
      content: fullAddress || `الموقع: ${latitude}, ${longitude}`,
      url: `https://maps.google.com/?q=${latitude},${longitude}`,
      thumbnail: mapUrl || getStaticMapUrl(parseFloat(latitude), parseFloat(longitude)),
      tags,
      isPinned: false,
      metadata: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: fullAddress,
        street,
        buildingNumber,
        city,
      },
    });

    toast.success('تم حفظ الموقع بنجاح');
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setLatitude('');
    setLongitude('');
    setAddress('');
    setStreet('');
    setBuildingNumber('');
    setCity('');
    setTitle('');
    setNotes('');
    setTags([]);
    setNewTag('');
    setMapUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            حفظ موقع سريع
          </DialogTitle>
          <DialogDescription>
            سيتم تحديد موقعك الحالي تلقائياً مع تفاصيل العنوان
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Map Preview - Interactive OpenStreetMap */}
          {latitude && longitude && (
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(longitude) - 0.005},${parseFloat(latitude) - 0.003},${parseFloat(longitude) + 0.005},${parseFloat(latitude) + 0.003}&layer=mapnik&marker=${latitude},${longitude}`}
                className="w-full h-full border-0"
                title="خريطة الموقع"
              />
              <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs">
                {latitude}, {longitude}
              </div>
            </div>
          )}

          {/* Get Location Button */}
          <Button
            onClick={handleGetCurrentLocation}
            disabled={isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {isLoading ? 'جاري التحديد...' : 'إعادة تحديد الموقع'}
          </Button>

          {/* Coordinates */}
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

          {/* Address Details */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <h4 className="text-sm font-medium text-muted-foreground">تفاصيل العنوان</h4>

            <div className="space-y-2">
              <Label htmlFor="street">الشارع</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="اسم الشارع"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="building">رقم المبنى</Label>
                <Input
                  id="building"
                  value={buildingNumber}
                  onChange={(e) => setBuildingNumber(e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="الرياض"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullAddress">العنوان الكامل</Label>
              <Textarea
                id="fullAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="العنوان الكامل..."
                rows={2}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">العنوان *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اسم الموقع"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>الوسوم</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
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
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            إلغاء
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            حفظ الموقع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
