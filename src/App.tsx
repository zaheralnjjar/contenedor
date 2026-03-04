import { useState, useEffect, useCallback, useRef } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { SyncProvider } from './context/SyncContext';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { FavoritesGrid } from '@/components/FavoritesGrid';
import { ClipboardSidebar } from '@/components/ClipboardSidebar';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddEditDialog } from '@/components/AddEditDialog';
import { SyncDialog } from '@/components/SyncDialog';
import { MiniPlayer } from './components/MiniPlayer';
import { SequentialCopyBanner } from '@/components/SequentialCopyBanner';
import type { FavoriteItem } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { readFromClipboard } from '@/lib/utils';
import './App.css';

function AppContent() {
  const { state, addToClipboard } = useApp();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FavoriteItem | null>(null);

  // Use refs to avoid stale closures in event handlers
  const favoritesRef = useRef(state.favorites);
  const addToClipboardRef = useRef(addToClipboard);
  useEffect(() => { favoritesRef.current = state.favorites; }, [state.favorites]);
  useEffect(() => { addToClipboardRef.current = addToClipboard; }, [addToClipboard]);

  // Request notifications permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Clipboard monitoring - using copy event + focus + polling
  useEffect(() => {
    if (!state.settings.autoSaveClipboard) return;

    let lastClipboardContent = '';

    const checkAndSave = async () => {
      try {
        const content = await readFromClipboard();
        if (content && content.trim() && content !== lastClipboardContent) {
          lastClipboardContent = content;
          // Use ref to get latest favorites to avoid stale closure
          const exists = favoritesRef.current.some(
            f => f.content === content || f.url === content
          );
          if (!exists) {
            await addToClipboardRef.current(content);
          }
        }
      } catch {
        // Clipboard access denied silently
      }
    };

    // Method 1: Listen to copy events within the page
    const handleCopy = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      checkAndSave();
    };

    // Method 2: Check clipboard when window gains focus
    const handleFocus = () => checkAndSave();

    // Method 3: Visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkAndSave();
    };

    // Method 4: Polling every 3 seconds as backup
    const pollInterval = setInterval(checkAndSave, 3000);

    document.addEventListener('copy', handleCopy);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [state.settings.autoSaveClipboard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N: New item
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setEditingItem(null);
        setEditDialogOpen(true);
      }


      // Escape: Close dialogs
      if (e.key === 'Escape') {
        setEditDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEdit = useCallback((item: FavoriteItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SequentialCopyBanner />
      <Header onSyncClick={() => setSyncDialogOpen(true)} />
      <FilterBar />
      <main className="pb-24">
        <FavoritesGrid onEdit={handleEdit} />
      </main>
      <ClipboardSidebar />
      <FloatingActionButton />
      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={editingItem}
      />
      <SyncDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
      />
      <MiniPlayer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <SyncProvider>
        <AppContent />
      </SyncProvider>
    </AppProvider>
  );
}

export default App;
