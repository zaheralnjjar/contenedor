import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Clipboard,
  MapPin,
  Youtube,
  LayoutDashboard,
  X,
  PenLine,
} from 'lucide-react';
import { AddEditDialog } from './AddEditDialog';
import { QuickLocationDialog } from './QuickLocationDialog';
import { Dashboard } from './Dashboard';
import { useApp } from '@/context/AppContext';
import { readFromClipboard, detectContentType } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function FloatingActionButton() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { addToClipboard } = useApp();

  const handleQuickAdd = async () => {
    try {
      const content = await readFromClipboard();
      if (content) {
        const type = detectContentType(content);
        setClipboardContent(content);
        setQuickAddOpen(true);

        // Show type detection notification
        const typeNames: Record<string, string> = {
          youtube: 'يوتيوب',
          website: 'موقع ويب',
          location: 'موقع جغرافي',
          phone: 'رقم هاتف',
          image: 'صورة',
          text: 'نص',
        };
        toast.info(`تم التعرف على: ${typeNames[type] || 'نص'}`);
      } else {
        toast.error('الحافظة فارغة');
      }
    } catch {
      toast.error('لا يمكن الوصول إلى الحافظة');
    }
  };

  const confirmQuickAdd = async () => {
    if (clipboardContent) {
      await addToClipboard(clipboardContent);
      setQuickAddOpen(false);
      setClipboardContent('');
    }
  };

  const menuItems = [
    {
      icon: PenLine,
      label: 'إضافة يدوية',
      color: 'bg-emerald-500 hover:bg-emerald-600',
      onClick: () => {
        setAddDialogOpen(true);
        setMenuOpen(false);
      },
    },
    {
      icon: MapPin,
      label: 'موقع سريع',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => {
        setLocationDialogOpen(true);
        setMenuOpen(false);
      },
    },
    {
      icon: Youtube,
      label: 'بحث يوتيوب',
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => {
        const searchInput = document.querySelector('input[placeholder*="بحث"]') as HTMLInputElement;
        searchInput?.focus();
        setMenuOpen(false);
      },
    },
    {
      icon: Clipboard,
      label: 'من الحافظة',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => {
        handleQuickAdd();
        setMenuOpen(false);
      },
    },
    {
      icon: LayoutDashboard,
      label: 'لوحة التحكم',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => {
        setDashboardOpen(true);
        setMenuOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Expanded Menu */}
      {menuOpen && (
        <div className="fixed right-4 bottom-24 flex flex-col gap-3 z-50 animate-slide-in">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="text-sm font-medium text-white bg-black/70 px-2 py-1 rounded">
                  {item.label}
                </span>
                <Button
                  onClick={item.onClick}
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-xl shadow-lg transition-all hover:scale-110',
                    item.color
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <div className="fixed right-4 bottom-6 flex flex-col gap-3 z-50">
        <Button
          onClick={() => setMenuOpen(!menuOpen)}
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-primary to-primary/80',
            menuOpen && 'rotate-45'
          )}
        >
          {menuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Dialogs */}
      <AddEditDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <QuickLocationDialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen} />
      <Dashboard open={dashboardOpen} onOpenChange={setDashboardOpen} />

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة سريعة من الحافظة</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm break-all" dir="auto">
                {clipboardContent}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              سيتم إضافة هذا المحتوى إلى مفضلاتك تلقائياً مع التعرف على نوعه
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQuickAddOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={confirmQuickAdd}>
              إضافة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dashboard Shortcut - Click to open dashboard */}
      <div className="fixed left-4 bottom-4 hidden lg:flex z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDashboardOpen(true)}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>لوحة التحكم | Ctrl+N: جديد | Ctrl+K: بحث</span>
        </Button>
      </div>
    </>
  );
}
