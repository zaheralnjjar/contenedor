import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutGrid,
  Youtube,
  Globe,
  Phone,
  MapPin,
  Type,
  Image,
  Pin,
  Tag,
  Clock,
  TrendingUp,
  Star,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface DashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  youtube: Youtube,
  website: Globe,
  phone: Phone,
  location: MapPin,
  text: Type,
  image: Image,
};

const typeColors: Record<string, string> = {
  youtube: 'text-red-500 bg-red-50',
  website: 'text-blue-500 bg-blue-50',
  phone: 'text-green-500 bg-green-50',
  location: 'text-orange-500 bg-orange-50',
  text: 'text-gray-500 bg-gray-50',
  image: 'text-purple-500 bg-purple-50',
};

const typeLabels: Record<string, string> = {
  youtube: 'يوتيوب',
  website: 'مواقع',
  phone: 'هواتف',
  location: 'مواقع',
  text: 'نصوص',
  image: 'صور',
};

export function Dashboard({ open, onOpenChange }: DashboardProps) {
  const { state } = useApp();

  const stats = useMemo(() => {
    const total = state.favorites.length;
    const pinned = state.favorites.filter(f => f.isPinned).length;
    const byType = state.favorites.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalTags = state.tags.length;
    const tagsUsage = state.tags.reduce((acc, tag) => acc + tag.count, 0);

    // Recent items (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentItems = state.favorites.filter(f => f.createdAt > weekAgo).length;

    // Most used tags
    const topTags = [...state.tags]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent additions
    const recentAdditions = [...state.favorites]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      total,
      pinned,
      byType,
      totalTags,
      tagsUsage,
      recentItems,
      topTags,
      recentAdditions,
    };
  }, [state.favorites, state.tags]);

  const getTypePercentage = (type: string) => {
    if (stats.total === 0) return 0;
    return Math.round((stats.byType[type] || 0) / stats.total * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            لوحة التحكم
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    إجمالي العناصر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{stats.recentItems} هذا الأسبوع
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    المثبتة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.pinned}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total > 0 ? Math.round(stats.pinned / stats.total * 100) : 0}% من الإجمالي
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    الوسوم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalTags}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.tagsUsage} استخدام
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    النشاط
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.recentItems}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    إضافات جديدة
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Content Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  توزيع المحتوى
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(typeLabels).map(([type, label]) => {
                    const Icon = typeIcons[type];
                    const count = stats.byType[type] || 0;
                    const percentage = getTypePercentage(type);
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${typeColors[type]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{count}</span>
                            <span className="text-sm font-medium w-10 text-left">{percentage}%</span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Tags */}
            {stats.topTags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    أكثر الوسوم استخداماً
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color }}
                        className="text-white px-3 py-1"
                      >
                        {tag.name}
                        <span className="mr-1 opacity-70">({tag.count})</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Additions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  آخر الإضافات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentAdditions.length > 0 ? (
                    stats.recentAdditions.map((item) => {
                      const Icon = typeIcons[item.type];
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className={`p-2 rounded ${typeColors[item.type]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(item.createdAt)}
                            </p>
                          </div>
                          {item.isPinned && (
                            <Pin className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      لا توجد عناصر بعد
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
