import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Copy, Clock, History, Trash2 } from 'lucide-react';
import { formatRelativeTime, truncateText, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ClipboardSidebar() {
  const { state, addToClipboard, clearClipboard } = useApp();
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const handleCopy = async (content: string) => {
    try {
      await copyToClipboard(content);
      toast.success('تم النسخ إلى الحافظة');
    } catch {
      toast.error('فشل النسخ');
    }
  };

  const handleAddToFavorites = async (content: string) => {
    await addToClipboard(content);
    toast.success('تمت الإضافة إلى المفضلات');
  };

  const handleClearAll = () => {
    clearClipboard();
    toast.success('تم مسح سجل الحافظة');
    setAlertOpen(false);
  };

  const handleSaveAll = async () => {
    const unsavedItems = state.clipboardHistory.filter(item => !item.sourceItemId);
    if (unsavedItems.length === 0) {
      toast.info('جميع العناصر محفوظة مسبقاً');
      return;
    }

    try {
      // Create a sequential save to prevent duplicates if any race conditions
      for (const item of unsavedItems.reverse()) { // Reversing to keep order
        await addToClipboard(item.content);
      }
      toast.success(`تم حفظ ${unsavedItems.length} عنصر`);
    } catch {
      toast.error('حدث خطأ أثناء حفظ بعض العناصر');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <span className="text-red-500">▶</span>;
      case 'website':
        return <span className="text-blue-500">🌐</span>;
      case 'phone':
        return <span className="text-green-500">📞</span>;
      case 'location':
        return <span className="text-orange-500">📍</span>;
      case 'image':
        return <span className="text-purple-500">🖼</span>;
      default:
        return <span className="text-gray-500">📝</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      youtube: 'يوتيوب',
      website: 'موقع',
      phone: 'هاتف',
      location: 'موقع',
      image: 'صورة',
      text: 'نص',
    };
    return labels[type] || 'نص';
  };

  return (
    <>
      {/* Floating Button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="fixed left-4 bottom-24 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-40"
          >
            <div className="relative">
              <History className="h-6 w-6" />
              {state.clipboardHistory.length > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {state.clipboardHistory.length > 9 ? '9+' : state.clipboardHistory.length}
                </span>
              )}
            </div>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader className="space-y-4">
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              سجل الحافظة
            </SheetTitle>
            {state.clipboardHistory.length > 0 && (
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveAll}>
                  <ClipboardList className="h-4 w-4 ml-1.5" />
                  حفظ الكل
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setAlertOpen(true)}>
                  <Trash2 className="h-4 w-4 ml-1.5" />
                  مسح الكل
                </Button>
              </div>
            )}
          </SheetHeader>

          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم مسح جميع العناصر غير المحفوظة في الحافظة بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  مسح دائم
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="mt-6">
            {state.clipboardHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  سجل الحافظة فارغ
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  سيتم حفظ كل ما تنسخه هنا
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="space-y-3 pr-4">
                  {state.clipboardHistory.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'group relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                        item.sourceItemId && 'border-primary/30'
                      )}
                    >
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          {getTypeIcon(item.type)}
                          {getTypeLabel(item.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Content */}
                      <p
                        className="text-sm mb-3 break-all line-clamp-3"
                        dir="auto"
                      >
                        {truncateText(item.content, 150)}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => handleCopy(item.content)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          نسخ
                        </Button>
                        {!item.sourceItemId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => handleAddToFavorites(item.content)}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            حفظ
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
