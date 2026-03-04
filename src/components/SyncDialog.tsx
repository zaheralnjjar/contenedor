import { useState } from 'react';
import { useSync } from '@/context/SyncContext';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  User,
  Lock,
  Check,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

interface SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncDialog({ open, onOpenChange }: SyncDialogProps) {
  const { status, isConfigured, isAuthenticated, userEmail, login, register, logout, syncNow } = useSync();
  const { state, updateSettings } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [supabaseUrl, setSupabaseUrl] = useState(state.settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(state.settings.supabaseAnonKey || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch {
      // Error is handled in the context
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setEmail('');
    setPassword('');
  };

  const handleSync = async () => {
    await syncNow();
  };

  const toggleAutoSync = (enabled: boolean) => {
    updateSettings({ backupEnabled: enabled });
    if (enabled) {
      toast.success('تم تفعيل المزامنة التلقائية');
    } else {
      toast.info('تم إيقاف المزامنة التلقائية');
    }
  };

  const updateSyncInterval = (interval: string) => {
    updateSettings({ backupInterval: parseInt(interval) });
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast.error('يرجى إدخال الرابط والمفتاح');
      return;
    }
    setIsLoading(true);
    try {
      await updateSettings({
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim()
      });
      // The SyncContext effect might need a refresh or it should pick it up if updateSettings
      // triggers a re-render or re-initializes. `isConfigured` is exported from `lib/supabase`,
      // but modifying `updateSettings` calls `configureSupabase`, so we can force a reload 
      // of the window to ensure everything binds correctly if it doesn't automatically.
      window.location.reload();
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudOff className="h-5 w-5 text-muted-foreground" />
              تكوين المزامنة السحابية
            </DialogTitle>
            <DialogDescription>
              الرجاء إدخال بيانات مشروع Supabase الخاص بك للبدء في المزامنة.
              يمكنك الحصول عليها من إعدادات مشروعك في <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">لوحة التحكم</a>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfigSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
              <Input
                id="supabaseUrl"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
              <Input
                id="supabaseAnonKey"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJh..."
                type="password"
                dir="ltr"
                required
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              حفظ الإعدادات
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAuthenticated ? (
              <Cloud className="h-5 w-5 text-green-500" />
            ) : (
              <CloudOff className="h-5 w-5 text-muted-foreground" />
            )}
            المزامنة السحابية
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated
              ? 'متصل بالسحابة - بياناتك متزامنة'
              : 'سجل الدخول لمزامنة بياناتك مع السحابة'}
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isRegistering ? (
                'إنشاء حساب'
              ) : (
                'تسجيل الدخول'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-primary hover:underline"
              >
                {isRegistering
                  ? 'لديك حساب؟ سجل الدخول'
                  : 'ليس لديك حساب؟ سجل الآن'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-4">
            {/* User Info */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{userEmail}</p>
                  <p className="text-sm text-muted-foreground">متصل</p>
                </div>
              </div>
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                نشط
              </Badge>
            </div>

            {/* Sync Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">آخر مزامنة</span>
                <span className="text-sm font-medium">
                  {status.lastSync
                    ? formatRelativeTime(status.lastSync)
                    : 'لم تتم المزامنة بعد'}
                </span>
              </div>

              {status.error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {status.error}
                </div>
              )}

              <Button
                onClick={handleSync}
                disabled={status.isSyncing}
                className="w-full gap-2"
              >
                {status.isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {status.isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
              </Button>
            </div>

            {/* Auto Sync Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                إعدادات المزامنة التلقائية
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync">المزامنة التلقائية</Label>
                  <p className="text-xs text-muted-foreground">
                    مزامنة البيانات تلقائياً
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={state.settings.backupEnabled}
                  onCheckedChange={toggleAutoSync}
                />
              </div>

              {state.settings.backupEnabled && (
                <div className="space-y-2">
                  <Label>فترة المزامنة</Label>
                  <Select
                    value={state.settings.backupInterval.toString()}
                    onValueChange={updateSyncInterval}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">كل 5 دقائق</SelectItem>
                      <SelectItem value="15">كل 15 دقيقة</SelectItem>
                      <SelectItem value="30">كل 30 دقيقة</SelectItem>
                      <SelectItem value="60">كل ساعة</SelectItem>
                      <SelectItem value="360">كل 6 ساعات</SelectItem>
                      <SelectItem value="720">كل 12 ساعة</SelectItem>
                      <SelectItem value="1440">يومياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Logout */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
