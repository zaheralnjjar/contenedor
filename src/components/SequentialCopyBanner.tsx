import { useApp } from '@/context/AppContext';
import { Link } from 'lucide-react';
import { Button } from './ui/button';

export function SequentialCopyBanner() {
    const { state, toggleSequentialCopy } = useApp();

    if (!state.settings.sequentialCopyMode) return null;

    return (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <Link className="h-4 w-4 animate-pulse" />
                <span className="font-medium">النسخ المتتابع (التجميع) مفعل</span>
                <span className="opacity-80 hidden sm:inline">
                    - أي نص تنسخه سيتم إضافته معاً
                </span>
            </div>
            <Button
                variant="secondary"
                size="sm"
                onClick={toggleSequentialCopy}
                className="h-7 text-xs hover:bg-secondary/90 hover:text-secondary-foreground"
            >
                إيقاف
            </Button>
        </div>
    );
}
