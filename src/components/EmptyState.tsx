import { Inbox, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

interface EmptyStateProps {
  hasFilters?: boolean;
}

export function EmptyState({ hasFilters = false }: EmptyStateProps) {
  const { dispatch } = useApp();

  const clearFilters = () => {
    dispatch({ type: 'SET_FILTER', payload: 'all' });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'SET_SELECTED_TAGS', payload: [] });
  };

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Filter className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-sm">
          لم يتم العثور على عناصر تطابق معايير البحث الحالية
        </p>
        <Button onClick={clearFilters} variant="outline">
          مسح الفلاتر
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        <Inbox className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">المفضلة فارغة</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        ابدأ بإضافة محتوى إلى مفضلاتك. يمكنك نسخ أي نص أو رابط وسيتم حفظه تلقائياً إذا فعلت خاصية الحفظ التلقائي.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">1</div>
          <span>انسخ أي محتوى</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">2</div>
          <span>سيُحفظ تلقائياً</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">3</div>
          <span>صفّف ونظم</span>
        </div>
      </div>
    </div>
  );
}
