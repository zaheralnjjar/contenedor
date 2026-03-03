import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
    const { state, setFloatingVideo } = useApp();
    const [isMinimized, setIsMinimized] = useState(false);

    if (!state.floatingVideo) return null;

    const { videoId, title } = state.floatingVideo;

    return (
        <div
            className={cn(
                "fixed bottom-24 right-4 sm:bottom-4 md:right-8 z-50 bg-background border shadow-2xl rounded-xl overflow-hidden transition-all duration-300 flex flex-col",
                isMinimized ? "w-64 h-12" : "w-80 sm:w-96 h-[180px] sm:h-[216px]"
            )}
            dir="rtl"
        >
            {/* Header Bar */}
            <div className="flex items-center justify-between p-1.5 px-3 bg-muted/80 backdrop-blur-sm shrink-0">
                <span className="text-xs font-semibold truncate flex-1 pl-2" title={title}>
                    {title}
                </span>
                <div className="flex items-center gap-1 shrink-0 dir-ltr">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? "تكبير" : "تصغير"}
                    >
                        {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setFloatingVideo(null)}
                        title="إغلاق"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Video Content */}
            {!isMinimized && (
                <div className="w-full flex-1 bg-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full outline-none border-none"
                    />
                </div>
            )}
        </div>
    );
}
