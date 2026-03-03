import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { Clipboard, Bell, Globe } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { state, updateSettings } = useApp();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">الإعدادات</DialogTitle>
                    <DialogDescription>
                        تخصيص مظهر وتفضيلات التطبيق
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Preferences */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            التفضيلات
                        </h3>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-md">
                                    <Clipboard className="h-4 w-4" />
                                </div>
                                <div>
                                    <Label htmlFor="auto-save" className="text-base">الحفظ التلقائي</Label>
                                    <p className="text-sm text-muted-foreground">حفظ المنسوخات تلقائياً في الحافظة</p>
                                </div>
                            </div>
                            <Switch
                                id="auto-save"
                                checked={state.settings.autoSaveClipboard}
                                onCheckedChange={(checked) => updateSettings({ autoSaveClipboard: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-md">
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div>
                                    <Label htmlFor="notifications" className="text-base">الإشعارات</Label>
                                    <p className="text-sm text-muted-foreground">عرض إشعارات عند النسخ والحفظ</p>
                                </div>
                            </div>
                            <Switch
                                id="notifications"
                                checked={state.settings.showNotifications}
                                onCheckedChange={(checked) => updateSettings({ showNotifications: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-md">
                                    <Globe className="h-4 w-4" />
                                </div>
                                <div>
                                    <Label htmlFor="language" className="text-base">اللغة</Label>
                                    <p className="text-sm text-muted-foreground">لغة واجهة التطبيق</p>
                                </div>
                            </div>
                            <div className="w-32">
                                <Select
                                    value={state.settings.language}
                                    onValueChange={(val: 'ar' | 'es') => updateSettings({ language: val })}
                                >
                                    <SelectTrigger id="language">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ar">العربية</SelectItem>
                                        <SelectItem value="es" disabled>Español (قريباً)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Supabase Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            المزامنة السحابية (Supabase)
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label>رابط المشروع (URL)</Label>
                                <Input
                                    className="font-mono text-sm"
                                    placeholder="https://your-project.supabase.co"
                                    value={state.settings.supabaseUrl || ''}
                                    onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
                                    dir="ltr"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>مفتاح API (anon key)</Label>
                                <Input
                                    className="font-mono text-sm"
                                    type="password"
                                    placeholder="eyJh..."
                                    value={state.settings.supabaseAnonKey || ''}
                                    onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
