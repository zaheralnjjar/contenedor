import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  X,
  ClipboardList,
  Cloud,
  CloudOff,
  Search,
  Link,
} from 'lucide-react';
import { useSync } from '@/context/SyncContext';
import { SmartSearch } from './SmartSearch';
import { toast } from 'sonner';

interface HeaderProps {
  onSyncClick?: () => void;
}

export function Header({ onSyncClick }: HeaderProps) {
  const { exportData, importData, clearClipboard, state, toggleSequentialCopy } = useApp();
  const { isAuthenticated } = useSync();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importDataText, setImportDataText] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `favorites-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم التصدير بنجاح');
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const handleImport = async () => {
    try {
      await importData(importDataText);
      setImportDialogOpen(false);
      setImportDataText('');
    } catch {
      toast.error('فشل الاستيراد، تأكد من صحة البيانات');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onSyncClick}
          title="مزامنة الآن"
        >
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
            <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Contenedor
            </h1>
            <p className="text-xs text-muted-foreground">مدير المفضلات الذكي</p>
          </div>
        </div>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <SmartSearch />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {/* Sequential Copy Button */}
          <Button
            variant={state.settings.sequentialCopyMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleSequentialCopy}
            className={`rounded-full gap-1 px-2 sm:px-3 h-8 sm:h-9 ${!state.settings.sequentialCopyMode ? 'border-dashed border-muted-foreground/50' : ''}`}
            title={state.settings.sequentialCopyMode ? 'إيقاف النسخ المتتابع' : 'تفعيل النسخ المتتابع'}
          >
            <Link className="h-4 w-4" />
            <span className="text-xs hidden xs:inline">
              {state.settings.sequentialCopyMode ? 'متصل' : 'تجميع'}
            </span>
          </Button>

          {/* Sync Button */}
          <Button
            variant={isAuthenticated ? 'ghost' : 'outline'}
            size="sm"
            onClick={onSyncClick}
            className={`rounded-full gap-1 px-2 sm:px-3 h-8 sm:h-9 ${!isAuthenticated ? 'border-dashed border-muted-foreground/50' : ''}`}
            title="المزامنة السحابية"
          >
            {isAuthenticated ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <CloudOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs hidden xs:inline">
              {isAuthenticated ? 'متصل' : 'سحابة'}
            </span>
          </Button>

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="ml-2 h-4 w-4" />
                الإعدادات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport}>
                <Download className="ml-2 h-4 w-4" />
                تصدير البيانات
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                <Upload className="ml-2 h-4 w-4" />
                استيراد البيانات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearClipboard} className="text-destructive">
                <Trash2 className="ml-2 h-4 w-4" />
                مسح سجل الحافظة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 bg-background">
          <SmartSearch />
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استيراد البيانات</DialogTitle>
            <DialogDescription>
              الصق بيانات JSON المصدرة سابقاً هنا
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={importDataText}
            onChange={(e) => setImportDataText(e.target.value)}
            placeholder={'{"favorites": [...], "tags": [...]}'}
            className="w-full h-40 p-3 rounded-md border bg-muted font-mono text-sm direction-ltr"
            dir="ltr"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleImport}>استيراد</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
