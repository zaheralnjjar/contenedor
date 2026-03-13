
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FavoriteItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Globe, Image as ImageIcon, FileText, Video, AudioLines, MapPin, Phone, Type, Youtube, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface SyncReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
    addedItems: FavoriteItem[];
    deletedItems: FavoriteItem[];
}

export function SyncReviewDialog({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    addedItems,
    deletedItems,
}: SyncReviewDialogProps) {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-3 w-3" />;
            case 'video': return <Video className="h-3 w-3" />;
            case 'audio': return <AudioLines className="h-3 w-3" />;
            case 'document': return <FileText className="h-3 w-3" />;
            case 'youtube': return <Youtube className="h-3 w-3 text-red-500" />;
            case 'website': return <Globe className="h-3 w-3" />;
            case 'phone': return <Phone className="h-3 w-3" />;
            case 'location': return <MapPin className="h-3 w-3" />;
            default: return <Type className="h-3 w-3" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'youtube': return 'يوتيوب';
            case 'image': return 'صورة';
            case 'video': return 'فيديو';
            case 'audio': return 'صوت';
            case 'document': return 'مستند';
            case 'website': return 'موقع web';
            case 'phone': return 'هاتف';
            case 'location': return 'موقع';
            default: return 'نص';
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    const handleCancel = () => {
        onCancel();
        onOpenChange(false);
    };

    const renderItem = (item: FavoriteItem, isDeleted: boolean = false) => (
        <div key={item.id} className="flex justify-between items-center p-3 rounded-md bg-muted/50 border border-border">
            <div className="flex flex-col gap-1 overflow-hidden">
                <span className="font-medium text-sm truncate">{item.title}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="flex items-center gap-1 font-normal h-5 bg-background/50">
                        {getTypeIcon(item.type)}
                        <span>{getTypeLabel(item.type)}</span>
                    </Badge>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                </div>
            </div>
            {isDeleted && <Trash2 className="h-4 w-4 text-destructive shrink-0" />}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>تغييرات المزامنة</DialogTitle>
                    <DialogDescription>
                        تم العثور على تغييرات قادمة من المزامنة السحابية. يرجى مراجعتها وتأكيد الدمج.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] h-[300px] rounded-md mt-4 pr-3 pl-1">
                    <div className="space-y-6">
                        {addedItems.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                    عناصر جديدة ({addedItems.length})
                                </h4>
                                <div className="space-y-2">
                                    {addedItems.map(item => renderItem(item))}
                                </div>
                            </div>
                        )}

                        {deletedItems.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-destructive" />
                                    عناصر سيتم حذفها ({deletedItems.length})
                                </h4>
                                <div className="space-y-2">
                                    {deletedItems.map(item => renderItem(item, true))}
                                </div>
                            </div>
                        )}

                        {addedItems.length === 0 && deletedItems.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                لا توجد تغييرات مهمة للمراجعة.
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-4 gap-2 flex-col-reverse sm:flex-row">
                    <Button variant="outline" onClick={handleCancel}>
                        تجاهل
                    </Button>
                    <Button onClick={handleConfirm}>
                        موافقة للدمج
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
