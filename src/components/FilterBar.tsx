import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LayoutGrid,
  Youtube,
  Globe,
  Phone,
  MapPin,
  Type,
  Image,
  Pin,
  Clock,
  ArrowUpAZ,
  ChevronDown,
  Tag,
  X,
  Folder as FolderIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import type { FilterType } from '@/types';
import { cn } from '@/lib/utils';

const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'الكل', icon: LayoutGrid },
  { value: 'youtube', label: 'يوتيوب', icon: Youtube },
  { value: 'website', label: 'مواقع', icon: Globe },
  { value: 'phone', label: 'هواتف', icon: Phone },
  { value: 'location', label: 'مواقع', icon: MapPin },
  { value: 'text', label: 'نصوص', icon: Type },
  { value: 'image', label: 'صور', icon: Image },
];

const sortOptions: { value: 'newest' | 'oldest' | 'alphabetical' | 'pinned'; label: string; icon: React.ElementType }[] = [
  { value: 'newest', label: 'الأحدث', icon: Clock },
  { value: 'oldest', label: 'الأقدم', icon: Clock },
  { value: 'alphabetical', label: 'أبجدي', icon: ArrowUpAZ },
  { value: 'pinned', label: 'المثبتة', icon: Pin },
];

export function FilterBar() {
  const { state, dispatch, createFolder, setSelectedFolder, deleteFolder } = useApp();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#64748b');
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), newFolderColor);
    setCreateFolderOpen(false);
    setNewFolderName('');
    setNewFolderColor('#64748b');
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
  };

  const handleDeleteFolder = async () => {
    if (deleteFolderConfirm) {
      await deleteFolder(deleteFolderConfirm);
      setDeleteFolderConfirm(null);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  };

  const handleSortChange = (sort: 'newest' | 'oldest' | 'alphabetical' | 'pinned') => {
    dispatch({ type: 'SET_SORT_BY', payload: sort });
  };

  const toggleTag = (tagName: string) => {
    dispatch({ type: 'TOGGLE_TAG', payload: tagName });
  };

  const clearTags = () => {
    dispatch({ type: 'SET_SELECTED_TAGS', payload: [] });
  };

  return (
    <div className="border-b bg-muted/30">
      <div className="container px-4 py-3">
        {/* Folders List */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Button
                variant={state.selectedFolder === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFolderSelect(null)}
                className="gap-2 rounded-full"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>كل المجلدات</span>
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {state.folders.map((folder) => (
                <ContextMenu key={folder.id}>
                  <ContextMenuTrigger asChild>
                    <Button
                      variant={state.selectedFolder === folder.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFolderSelect(folder.id)}
                      className="gap-2 rounded-full transition-all"
                      style={{
                        borderColor: state.selectedFolder === folder.id ? undefined : folder.color,
                        color: state.selectedFolder === folder.id ? undefined : folder.color,
                      }}
                    >
                      <FolderIcon
                        className="h-4 w-4"
                        style={{
                          fill: state.selectedFolder === folder.id ? 'currentColor' : (folder.color || 'currentColor'),
                          fillOpacity: 0.2
                        }}
                      />
                      <span>{folder.name}</span>
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      className="text-destructive gap-2 cursor-pointer"
                      onClick={() => setDeleteFolderConfirm(folder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف المجلد
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateFolderOpen(true)}
                className="gap-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>مجلد جديد</span>
              </Button>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Type Filters */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-2">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = state.filter === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange(option.value)}
                  className={cn(
                    'gap-2 rounded-full transition-all',
                    isActive && 'shadow-md'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </Button>
              );
            })}

            <div className="w-px h-6 bg-border mx-2" />

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full">
                  {sortOptions.find(s => s.value === state.sortBy)?.icon && (
                    <>
                      {(() => {
                        const Icon = sortOptions.find(s => s.value === state.sortBy)!.icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                    </>
                  )}
                  <span>{sortOptions.find(s => s.value === state.sortBy)?.label}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Tags Filter */}
        {state.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {state.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={state.selectedTags.includes(tag.name) ? 'default' : 'secondary'}
                  className="cursor-pointer hover:opacity-80 transition-opacity gap-1"
                  style={{
                    backgroundColor: state.selectedTags.includes(tag.name) ? tag.color : undefined,
                  }}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                  {tag.count > 0 && (
                    <span className="text-xs opacity-70">({tag.count})</span>
                  )}
                </Badge>
              ))}
              {state.selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTags}
                  className="h-6 px-2 text-xs gap-1"
                >
                  <X className="h-3 w-3" />
                  مسح
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Folder Dialog */}
      <Dialog open={!!deleteFolderConfirm} onOpenChange={(open) => !open && setDeleteFolderConfirm(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>حذف المجلد</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المجلد "{state.folders.find(f => f.id === deleteFolderConfirm)?.name}"؟
              سيتم الاحتفاظ بجميع العناصر بداخله ولن يتم حذفها.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFolderConfirm(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إنشاء مجلد جديد</DialogTitle>
            <DialogDescription>
              قم بتنظيم مفضلاتك في مجلدات مخصصة
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-name" className="text-right whitespace-nowrap">
                اسم المجلد
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="مثال: روابط مهمة"
                className="col-span-3"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-color" className="text-right">
                اللون
              </Label>
              <div className="col-span-3 flex items-center gap-3">
                <Input
                  id="folder-color"
                  type="color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <div className="flex gap-2">
                  {['#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      style={{ backgroundColor: color, border: newFolderColor === color ? '2px solid var(--foreground)' : 'none' }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateFolder}>إنشاء المجلد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
