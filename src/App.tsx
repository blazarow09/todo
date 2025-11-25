import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Icon } from "@iconify/react";
import "./App.css";
import "./themes.css";
import { Todo, FilterType, Theme, Attachment } from "./types";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { scheduleAllNotifications } from "./utils/notifications";
import TodoItem from "./components/TodoItem";
import FilterBar from "./components/FilterBar";
import SearchBar from "./components/SearchBar";
import Settings from "./components/Settings";
import CustomSelect from "./components/CustomSelect";
import DatePicker from "./components/DatePicker";
import LabelInput from "./components/LabelInput";
import FolderGroup from "./components/FolderGroup";

// Firebase Imports
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import { useFirestoreTodos, useFirestoreFolders } from "./hooks/useFirestore";
import { useFirestoreUndoRedo } from "./hooks/useFirestoreUndoRedo";
import { migrateLocalDataToFirebase } from "./utils/migration";
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// Helper function to remove undefined values from an object
// Firestore doesn't accept undefined values
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

const THEME_KEY = "todo_theme";
const SELECTED_FOLDER_KEY = "todo_selected_folder";
const ALWAYS_ON_TOP_KEY = "todo_always_on_top";

// Wrapper component to handle Auth
function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);

  // Firestore hooks
  const {
    todos,
    loading: todosLoading,
    addTodo: firestoreAddTodo,
    updateTodo: firestoreUpdateTodo,
    deleteTodo: firestoreDeleteTodo
  } = useFirestoreTodos(user?.uid);

  const {
    folders,
    loading: foldersLoading,
    addFolder: firestoreAddFolder,
    updateFolder: firestoreUpdateFolder,
    deleteFolder: firestoreDeleteFolder
  } = useFirestoreFolders(user?.uid);

  const { trackAction, undo, redo, canUndo, canRedo } = useFirestoreUndoRedo(user?.uid);

  // Migration effect - only runs once per user
  useEffect(() => {
    const migrateData = async () => {
      if (!user || !window.electronAPI?.loadTodos || !window.electronAPI?.loadFolders) return;

      // Wait for Firestore to finish loading
      if (todosLoading || foldersLoading) return;

      // Load local data to check if there's anything to migrate
      const localTodos = await window.electronAPI.loadTodos();
      const localFolders = await window.electronAPI.loadFolders();

      // If no local data exists, nothing to migrate
      if ((!localTodos || localTodos.length === 0) && (!localFolders || localFolders.length === 0)) {
        return;
      }

      // Only migrate if Firestore is empty (to avoid duplicates)
      if (todos.length === 0 && folders.length === 0) {
        setIsMigrating(true);
        try {
          await migrateLocalDataToFirebase(localTodos || [], localFolders || [], user.uid);
          console.log("Migration completed");

          // Clear local JSON files after successful migration to prevent future duplicates
          if (window.electronAPI.clearLocalData) {
            await window.electronAPI.clearLocalData();
            console.log("Local data files cleared");
          }
        } catch (error) {
          console.error("Migration failed", error);
        } finally {
          setIsMigrating(false);
        }
      } else {
        // Firestore already has data, clear local files to prevent future migration attempts
        if (window.electronAPI.clearLocalData) {
          await window.electronAPI.clearLocalData();
          console.log("Local data files cleared (Firestore already has data)");
        }
      }
    };

    migrateData();
  }, [user, todosLoading, foldersLoading, todos.length, folders.length]);


  // ... (Rest of state from original App) ...
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOverModal, setIsDragOverModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('active');
  const [selectedLabel, setSelectedLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationType, setNotificationType] = useState<'before' | 'after' | 'at'>('before');
  const [notificationDuration, setNotificationDuration] = useState(15);

  // Theme & Settings State
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    }
    return 'dark';
  };
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(() => {
    const saved = localStorage.getItem(ALWAYS_ON_TOP_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [launchAtStartup, setLaunchAtStartup] = useState<boolean>(true);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(() => localStorage.getItem("todo_background_image"));
  const [backgroundColor, setBackgroundColor] = useState<string | null>(() => localStorage.getItem("todo_background_color"));
  const [overlayOpacity, setOverlayOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("todo_background_overlay_opacity");
    return saved ? parseFloat(saved) : 0.3;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => localStorage.getItem(SELECTED_FOLDER_KEY));
  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string, name: string } | null>(null);

  // --- Effects (Settings) ---

  // Apply always-on-top to electron on mount
  useEffect(() => {
    setTimeout(() => {
      if ((window as any).electronAPI?.setAlwaysOnTop) {
        (window as any).electronAPI.setAlwaysOnTop(alwaysOnTop);
      }
    }, 100);
  }, []);

  // Load launch at startup preference
  useEffect(() => {
    if ((window as any).electronAPI?.getLaunchAtStartup) {
      (window as any).electronAPI.getLaunchAtStartup().then((value: boolean) => {
        setLaunchAtStartup(value);
      });
    }
  }, []);

  // Save background settings
  useEffect(() => {
    if (backgroundImage) {
      localStorage.setItem("todo_background_image", backgroundImage);
    } else {
      localStorage.removeItem("todo_background_image");
    }
  }, [backgroundImage]);

  useEffect(() => {
    if (backgroundColor) {
      localStorage.setItem("todo_background_color", backgroundColor);
    } else {
      localStorage.removeItem("todo_background_color");
    }
  }, [backgroundColor]);

  useEffect(() => {
    localStorage.setItem("todo_background_overlay_opacity", String(overlayOpacity));
  }, [overlayOpacity]);

  // Apply theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  // Save selected folder
  useEffect(() => {
    if (selectedFolderId) {
      localStorage.setItem(SELECTED_FOLDER_KEY, selectedFolderId);
    } else {
      localStorage.removeItem(SELECTED_FOLDER_KEY);
    }
  }, [selectedFolderId]);

  // Schedule notifications with debounce to avoid rescheduling on every change
  useEffect(() => {
    // Debounce notification scheduling to avoid rescheduling on rapid changes
    const timeoutId = setTimeout(() => {
      if (window.electronAPI?.scheduleNotification && todos.length > 0) {
        scheduleAllNotifications(todos).catch(err => {
          console.error('Failed to schedule notifications:', err);
        });
      } else if ('Notification' in window && todos.length > 0) {
        // Web fallback
        scheduleAllNotifications(todos).catch(err => {
          console.error('Failed to schedule notifications:', err);
        });
      }
    }, 500); // Wait 500ms after todos change before rescheduling

    return () => clearTimeout(timeoutId);
  }, [todos]);

  // --- Handlers (Adapted for Firestore) ---

  const addTodo = useCallback(async (folderIdOverride?: string | null) => {
    const folderToUse = folderIdOverride !== undefined ? folderIdOverride : (folderIdOverride === null ? null : selectedFolderId);
    if (!input.trim()) return;

    if (editingTodo) {
      // Update
      const updates = {
        text: input.trim(),
        priority,
        label: label.trim(),
        folderId: folderToUse,
        ...(dueDate && { dueDate }),
        ...(attachments.length > 0 && { attachments }),
        ...(notificationEnabled && { notificationEnabled }),
        ...(notificationEnabled && notificationType && { notificationType }),
        ...(notificationEnabled && notificationType !== 'at' && notificationDuration && { notificationDuration }),
      };
      const cleanedUpdates = removeUndefinedFields(updates);

      // Optimistic update handled by listener, but we track action for undo
      trackAction('update', 'todos', String(editingTodo.id), editingTodo); // Track previous state
      await firestoreUpdateTodo(String(editingTodo.id), cleanedUpdates);
      setEditingTodo(null);
    } else {
      // Create
      // Calculate order: get max order in folder + 1, or 0 if folder is empty
      const folderTodos = folderToUse ? todos.filter(t => t.folderId === folderToUse && !t.isArchived) : [];
      const maxOrder = folderTodos.length > 0
        ? Math.max(...folderTodos.map(t => t.order !== undefined ? t.order : -1), -1)
        : -1;
      const newOrder = maxOrder + 1;

      const newTodoData = {
        text: input.trim(),
        done: false,
        priority,
        label: label.trim(),
        folderId: folderToUse,
        order: newOrder,
        ...(dueDate && { dueDate }),
        ...(attachments.length > 0 && { attachments }),
        ...(notificationEnabled && { notificationEnabled }),
        ...(notificationEnabled && notificationType && { notificationType }),
        ...(notificationEnabled && notificationType !== 'at' && notificationDuration && { notificationDuration }),
      };
      const cleanedData = removeUndefinedFields(newTodoData);
      await firestoreAddTodo(cleanedData as any);
      // We can't easily track 'add' undo here without the generated ID, 
      // but useFirestoreUndoRedo could wrap addDoc to handle this.
      // For now, let's assume simple add tracking isn't implemented or done inside the hook if refactored.
      // Actually, let's skip tracking 'add' in this component side for now to keep it simple, 
      // or we need the ID returned from firestoreAddTodo.
    }

    // Reset form
    setInput("");
    setLabel("");
    setDueDate("");
    setAttachments([]);
    setPriority('medium');
    setNotificationEnabled(false);
    setShowTodoModal(false);
    setTargetFolderId(null);
  }, [input, priority, label, dueDate, attachments, selectedFolderId, editingTodo, notificationEnabled, notificationType, notificationDuration, firestoreAddTodo, firestoreUpdateTodo, trackAction]);

  const updateTodo = useCallback(async (id: number, updates: Partial<Todo>) => {
    // Find previous state for undo
    const oldTodo = todos.find(t => t.id === id);
    if (oldTodo) {
      trackAction('update', 'todos', String(id), oldTodo);
    }
    await firestoreUpdateTodo(String(id), updates);
  }, [todos, firestoreUpdateTodo, trackAction]);

  const toggleTodo = useCallback(async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      trackAction('toggle', 'todos', String(id), todo);
      await firestoreUpdateTodo(String(id), { done: !todo.done });
    }
  }, [todos, firestoreUpdateTodo, trackAction]);

  const archiveTodo = useCallback(async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      trackAction('update', 'todos', String(id), todo);
      await firestoreUpdateTodo(String(id), { isArchived: true });
    }
  }, [todos, firestoreUpdateTodo, trackAction]);

  const deleteTodo = useCallback(async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      trackAction('delete', 'todos', String(id), todo);
      await firestoreDeleteTodo(String(id));
    }
  }, [todos, firestoreDeleteTodo, trackAction]);

  const restoreTodo = useCallback(async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      trackAction('update', 'todos', String(id), todo);
      await firestoreUpdateTodo(String(id), { isArchived: false });
    }
  }, [todos, firestoreUpdateTodo, trackAction]);

  const clearCompleted = useCallback(() => {
    // Batch updates are better, but we'll do individual for now
    const completed = todos.filter(t => t.done);
    completed.forEach(t => {
      archiveTodo(t.id);
    });
  }, [todos, archiveTodo]);

  // --- Export/Import Handlers ---
  const handleExport = useCallback(async () => {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        todos: todos.map(todo => {
          const { id, ...todoData } = todo;
          return {
            ...todoData,
            id: String(id) // Convert to string for JSON compatibility
          };
        }),
        folders: folders.map(folder => {
          const { id, ...folderData } = folder;
          return {
            ...folderData,
            id: String(id) // Convert to string for JSON compatibility
          };
        })
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      if (window.electronAPI?.exportData) {
        // Electron environment
        const result = await window.electronAPI.exportData(jsonString);
        if (result.canceled) {
          return; // User canceled the dialog
        }
        if (!result.success) {
          alert(`Export failed: ${result.error || 'Unknown error'}`);
          return;
        }
        alert('Data exported successfully!');
      } else {
        // Web fallback - download file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todos-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Data exported successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [todos, folders]);

  const handleImport = useCallback(async () => {
    try {
      let jsonString: string | null = null;

      if (window.electronAPI?.importData) {
        // Electron environment
        jsonString = await window.electronAPI.importData();
        if (!jsonString) {
          return; // User canceled the dialog or file read failed
        }
      } else {
        // Web fallback - file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            await processImport(content);
          };
          reader.readAsText(file);
        };
        input.click();
        return; // Early return for web fallback
      }

      if (jsonString) {
        await processImport(jsonString);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    async function processImport(jsonString: string) {
      if (!user?.uid) {
        alert('You must be logged in to import data');
        return;
      }

      let importData: { todos?: any[]; folders?: any[]; version?: string };
      try {
        importData = JSON.parse(jsonString);
      } catch (error) {
        alert('Invalid JSON file');
        return;
      }

      if (!importData.todos && !importData.folders) {
        alert('Invalid file format: missing todos or folders');
        return;
      }

      // Confirm import
      const confirmMessage = `This will import ${importData.todos?.length || 0} todos and ${importData.folders?.length || 0} folders. Existing data will not be deleted. Continue?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      try {
        // Import folders first to create folder ID mapping
        const folderIdMap: Record<string, string> = {};
        if (importData.folders && Array.isArray(importData.folders)) {
          for (const folder of importData.folders) {
            const { id: oldId, ...folderData } = folder;
            // Use addDoc directly to get the new document ID
            const docRef = await addDoc(collection(db, 'users', user.uid, 'folders'), {
              name: folderData.name || 'Imported Folder',
              collapsed: folderData.collapsed ?? false,
              order: folderData.order ?? folders.length
            });
            if (oldId) {
              folderIdMap[String(oldId)] = docRef.id;
            }
          }
        }

        // Import todos with folder ID mapping
        let importedTodosCount = 0;
        let failedTodosCount = 0;
        const failedTodos: string[] = [];

        if (importData.todos && Array.isArray(importData.todos)) {
          for (const todo of importData.todos) {
            try {
              // Skip if todo doesn't have required fields
              if (!todo || typeof todo !== 'object') {
                failedTodosCount++;
                failedTodos.push('Invalid todo object');
                console.error('Invalid todo object:', todo);
                continue;
              }

              const { id, folderId, ...todoData } = todo;

              // Ensure text field exists
              if (!todoData.text && todoData.text !== '') {
                failedTodosCount++;
                failedTodos.push(`Todo missing text field (id: ${id || 'unknown'})`);
                console.error('Todo missing text field:', todo);
                continue;
              }

              // Map folder ID if it exists
              let newFolderId: string | null | undefined = undefined;
              if (folderId !== undefined) {
                newFolderId = folderId ? (folderIdMap[String(folderId)] || null) : null;
              }

              const todoToAdd = {
                text: String(todoData.text || ''),
                done: Boolean(todoData.done ?? false),
                priority: (todoData.priority === 'low' || todoData.priority === 'medium' || todoData.priority === 'high') ? todoData.priority : 'medium',
                label: String(todoData.label || ''),
                ...(newFolderId !== undefined && { folderId: newFolderId }),
                ...(todoData.dueDate && { dueDate: String(todoData.dueDate) }),
                ...(todoData.notes && { notes: String(todoData.notes) }),
                ...(todoData.attachments && Array.isArray(todoData.attachments) && { attachments: todoData.attachments }),
                isArchived: Boolean(todoData.isArchived ?? false),
                createdAt: todoData.createdAt ? (typeof todoData.createdAt === 'number' ? todoData.createdAt : new Date(todoData.createdAt).getTime()) : Date.now(),
                ...(todoData.notificationEnabled !== undefined && { notificationEnabled: Boolean(todoData.notificationEnabled) }),
                ...(todoData.notificationType && (todoData.notificationType === 'before' || todoData.notificationType === 'after' || todoData.notificationType === 'at') && { notificationType: todoData.notificationType }),
                ...(todoData.notificationDuration !== undefined && typeof todoData.notificationDuration === 'number' && { notificationDuration: todoData.notificationDuration })
              };
              const cleanedTodo = removeUndefinedFields(todoToAdd);

              // Ensure createdAt is always present
              if (!cleanedTodo.createdAt) {
                cleanedTodo.createdAt = Date.now();
              }

              await addDoc(collection(db, 'users', user.uid, 'todos'), cleanedTodo);
              importedTodosCount++;
            } catch (error) {
              failedTodosCount++;
              const todoText = (todo.text || todo.id || 'Unknown todo').toString();
              failedTodos.push(todoText);
              console.error(`Failed to import todo:`, todo, error);
            }
          }
        }

        let importedFoldersCount = 0;
        if (importData.folders && Array.isArray(importData.folders)) {
          importedFoldersCount = importData.folders.length;
        }

        if (failedTodosCount > 0) {
          alert(`Import completed with errors:\n- Successfully imported: ${importedTodosCount} todos, ${importedFoldersCount} folders\n- Failed: ${failedTodosCount} todos\n\nFailed todos: ${failedTodos.slice(0, 5).join(', ')}${failedTodos.length > 5 ? '...' : ''}`);
        } else {
          alert(`Successfully imported ${importedTodosCount} todos and ${importedFoldersCount} folders!`);
        }
      } catch (error) {
        console.error('Import processing error:', error);
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [user, folders]);

  // --- Folder Handlers ---

  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    await firestoreAddFolder({
      name: newFolderName.trim(),
      collapsed: false,
      order: folders.length
    });
    setNewFolderName("");
    setShowFolderPopup(false);
  }, [newFolderName, folders.length, firestoreAddFolder]);

  const toggleFolderCollapse = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      await firestoreUpdateFolder(folderId, { collapsed: !folder.collapsed });
    }
  }, [folders, firestoreUpdateFolder]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    if (!newName || !newName.trim()) return;
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      trackAction('update', 'folders', folderId, folder);
      await firestoreUpdateFolder(folderId, { name: newName.trim() });
    }
  }, [folders, firestoreUpdateFolder, trackAction]);

  const deleteFolder = useCallback((folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
  }, []);

  const confirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;

    // Delete folder
    // Optional: Delete todos in folder or move them?
    // For now, just delete folder document. Todos with this folderId will be orphaned or hidden
    // Ideally, we should batch delete todos in this folder
    const folderTodos = todos.filter(t => t.folderId === folderToDelete.id);
    folderTodos.forEach(t => firestoreDeleteTodo(String(t.id)));

    await firestoreDeleteFolder(folderToDelete.id);
    setFolderToDelete(null);
  }, [folderToDelete, todos, firestoreDeleteFolder, firestoreDeleteTodo]);

  const moveTodoToFolder = useCallback(async (todoId: number | string, folderId: string | null) => {
    const todoIdStr = String(todoId);
    const todo = todos.find(t => String(t.id) === todoIdStr);
    if (todo) {
      trackAction('update', 'todos', todoIdStr, todo);
      await firestoreUpdateTodo(todoIdStr, { folderId });
    }
  }, [todos, firestoreUpdateTodo, trackAction]);


  // --- UI Helpers ---

  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setInput(todo.text);
    setPriority(todo.priority);
    setLabel(todo.label || '');
    setDueDate(todo.dueDate || '');
    setAttachments(todo.attachments || []);
    setTargetFolderId(todo.folderId || null);
    setNotificationEnabled(todo.notificationEnabled || false);
    setNotificationType(todo.notificationType || 'before');
    setNotificationDuration(todo.notificationDuration || 15);
    setShowTodoModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowTodoModal(false);
    setEditingTodo(null);
    setInput("");
    setPriority('medium');
    setLabel("");
    setDueDate("");
    setAttachments([]);
    setTargetFolderId(null);
    setNotificationEnabled(false);
    setNotificationType('before');
    setNotificationDuration(15);
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) return;

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newAttachment: Attachment = {
            id: String(Date.now() + Math.random()),
            type: 'image',
            url: dataUrl,
            name: file.name
          };
          setAttachments(prev => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleModalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverModal(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      const fileList = new DataTransfer();
      files.forEach(f => fileList.items.add(f));
      handleFileSelect(fileList.files);
    }
  }, [handleFileSelect]);

  const handleModalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasImage = Array.from(e.dataTransfer.items).some(item =>
      item.kind === 'file' && item.type.startsWith('image/')
    ) || e.dataTransfer.types.includes('text/uri-list');

    if (hasImage) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOverModal(true);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, []);

  const handleModalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverModal(false);
    }
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  // Drag and Drop
  const handleDragEnd = useCallback((result: DropResult) => {
    // ... existing logic adapted ...
    if (!result.destination) return;

    // Folder reorder
    if (result.type === 'FOLDER' && result.source.droppableId === 'folders-list') {
      // Logic to reorder folders array locally then save
      // With firestore, we need to update 'order' field for affected folders
      // This is expensive if we update all. 
      // Simplified: Just update the moved one if possible, but usually linked list or re-indexing needed.
      // Let's implement a simple swap or re-index for now.
      const sourceIndex = result.source.index;
      const destIndex = result.destination.index;
      if (sourceIndex === destIndex) return;

      const sorted = [...folders].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(sourceIndex, 1);
      sorted.splice(destIndex, 0, moved);

      // Update all orders
      sorted.forEach((f, index) => {
        if (f.order !== index) {
          firestoreUpdateFolder(f.id, { order: index });
        }
      });
      return;
    }

    // Todo drag
    if (result.type === 'TODO') {
      const sourceDroppableId = result.source.droppableId;
      const destDroppableId = result.destination.droppableId;
      const sourceIndex = result.source.index;
      const destIndex = result.destination.index;

      // Handle reordering within the same folder
      if (sourceDroppableId === destDroppableId && sourceDroppableId.startsWith('folder-')) {
        const folderId = sourceDroppableId.replace('folder-', '');

        // Get folder todos with the same filtering as the UI
        let folderTodos = todos.filter(t => t.folderId === folderId && !t.isArchived);

        // Apply the same filters as filterTodos to match the displayed order
        folderTodos = folderTodos.filter(todo => {
          if (filter === 'active' && todo.done) return false;
          if (filter === 'completed' && !todo.done) return false;
          if (selectedLabel && todo.label !== selectedLabel) return false;
          if (searchQuery && !todo.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          return true;
        });

        // Sort by order (if exists) or createdAt
        const sorted = [...folderTodos].sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : (a.createdAt || 0);
          const orderB = b.order !== undefined ? b.order : (b.createdAt || 0);
          return orderA - orderB;
        });

        if (sourceIndex === destIndex) return;

        // Reorder the array
        const [moved] = sorted.splice(sourceIndex, 1);
        sorted.splice(destIndex, 0, moved);

        // Update order for all affected todos (assign sequential order)
        // We update all because the order values need to be sequential (0, 1, 2, ...)
        sorted.forEach((todo, index) => {
          firestoreUpdateTodo(String(todo.id), { order: index });
        });
        return;
      }

      // Handle moving between folders
      if (sourceDroppableId !== destDroppableId && destDroppableId.startsWith('folder-')) {
        const destFolderId = destDroppableId.replace('folder-', '');
        const destIndex = result.destination.index;

        // Get destination folder todos with the same filtering as the UI
        let destFolderTodos = todos.filter(t => t.folderId === destFolderId && !t.isArchived);
        destFolderTodos = destFolderTodos.filter(todo => {
          if (filter === 'active' && todo.done) return false;
          if (filter === 'completed' && !todo.done) return false;
          if (selectedLabel && todo.label !== selectedLabel) return false;
          if (searchQuery && !todo.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          return true;
        });

        // Sort by order
        destFolderTodos.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : (a.createdAt || 0);
          const orderB = b.order !== undefined ? b.order : (b.createdAt || 0);
          return orderA - orderB;
        });

        // Insert at the drop position (we only need the id for order update)
        destFolderTodos.splice(destIndex, 0, { id: result.draggableId } as unknown as Todo);

        // Update folder and order for the moved todo
        moveTodoToFolder(result.draggableId, destFolderId);

        // Update order for all todos in destination folder
        destFolderTodos.forEach((todo, index) => {
          firestoreUpdateTodo(String(todo.id), { order: index });
        });
      }
    }

  }, [folders, todos, filter, selectedLabel, searchQuery, firestoreUpdateFolder, firestoreUpdateTodo, moveTodoToFolder]);

  // Shortcuts
  useKeyboardShortcuts({
    escape: () => {
      if (editingId !== null) setEditingId(null);
      else if (input) setInput("");
    },
    ctrlF: () => {
      // Focus search
    },
    ctrlD: () => setTheme(prev => prev === 'light' ? 'dark' : 'light'),
    ctrlZ: undo,
    ctrlY: redo,
  });

  // Filter logic...
  const labels = Array.from(new Set(todos.map(t => t.label).filter(Boolean)));
  const completedCount = todos.filter((t) => t.done && !t.isArchived).length;
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);
  const todosByFolder = todos.reduce((acc, todo) => {
    if (todo.folderId) {
      if (!acc[todo.folderId]) acc[todo.folderId] = [];
      acc[todo.folderId].push(todo);
    }
    return acc;
  }, {} as Record<string, Todo[]>);

  // Sort todos within each folder by order field (or createdAt as fallback)
  Object.keys(todosByFolder).forEach(folderId => {
    todosByFolder[folderId].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : (a.createdAt || 0);
      const orderB = b.order !== undefined ? b.order : (b.createdAt || 0);
      return orderA - orderB;
    });
  });

  const filterTodos = (todoList: Todo[]) => {
    return todoList.filter(todo => {
      if (todo.isArchived) return false;
      if (filter === 'active' && todo.done) return false;
      if (filter === 'completed' && !todo.done) return false;
      if (selectedLabel && todo.label !== selectedLabel) return false;
      if (searchQuery && !todo.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  const hasBackground = backgroundImage || backgroundColor;


  if (authLoading) return <div className="app-loading">Loading Auth...</div>;
  if (!user) return <Login />;

  return (
    <div
      className="app"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundColor: backgroundColor || undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        '--background-overlay-opacity': hasBackground ? overlayOpacity : 0
      } as React.CSSProperties}
    >
      {hasBackground && <div className="background-overlay" style={{ opacity: overlayOpacity }} />}

      {/* ... TITLE BAR ... */}
      <div className="titlebar">
        <div className="titlebar-search">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="titlebar-actions">
          <button className="settings-toggle" onClick={() => setShowSettings(true)}>
            <Icon icon="mdi:cog" width="20" height="20" />
          </button>
          {/* Logout Button */}
          {/* <button className="settings-toggle" onClick={() => auth.signOut()}>
             <Icon icon="mdi:logout" width="20" height="20" />
          </button> */}
        </div>
        {window.electronAPI && (
          <div className="window-controls">
            <button className="control-btn minimize" onClick={() => window.electronAPI?.minimize()} title="Minimize">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </button>
            <button className="control-btn close" onClick={() => window.electronAPI?.close()} title="Close">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* MIGRATION STATUS */}
      {isMigrating && (
        <div className="migration-banner">
          Migrating your local data to cloud...
        </div>
      )}

      {/* ... REST OF UI (Popups, Modals, Lists) ... */}
      {/* Reuse existing JSX structure but pass new handlers */}

      {/* Folder Creation Popup */}
      {showFolderPopup && (
        <div className="folder-popup-overlay" onClick={() => setShowFolderPopup(false)}>
          <div className="folder-popup" onClick={(e) => e.stopPropagation()}>
            {/* ... content ... */}
            <div className="folder-popup-header">
              <h3>Create New Folder</h3>
              <button className="folder-popup-close" onClick={() => setShowFolderPopup(false)}>×</button>
            </div>
            <div className="folder-popup-content">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  else if (e.key === 'Escape') setShowFolderPopup(false);
                }}
                placeholder="Folder name..."
                className="folder-popup-input"
                autoFocus
              />
              <div className="folder-popup-actions">
                <button className="folder-popup-cancel" onClick={() => setShowFolderPopup(false)}>Cancel</button>
                <button className="folder-popup-create" onClick={createFolder} disabled={!newFolderName.trim()}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {folderToDelete && (
        <div className="folder-popup-overlay" onClick={() => setFolderToDelete(null)}>
          <div className="folder-popup" onClick={(e) => e.stopPropagation()}>
            <div className="folder-popup-header">
              <h3>Delete Folder</h3>
              <button className="folder-popup-close" onClick={() => setFolderToDelete(null)}>×</button>
            </div>
            <div className="folder-popup-content">
              <p>Delete folder "<strong>{folderToDelete.name}</strong>"? All todos in this folder will be deleted.</p>
              <div className="folder-popup-actions">
                <button className="folder-popup-cancel" onClick={() => setFolderToDelete(null)}>Cancel</button>
                <button className="folder-popup-delete" onClick={confirmDeleteFolder}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {folders.length > 0 && (
        <FilterBar
          filter={filter}
          labels={labels}
          selectedLabel={selectedLabel}
          onLabelChange={setSelectedLabel}
          onFilterChange={setFilter}
          onClearCompleted={clearCompleted}
          hasCompleted={completedCount > 0}
        />
      )}

      <Settings
        todos={todos}
        onDelete={deleteTodo}
        onRestore={restoreTodo}
        onClearArchived={() => { }} // Not implemented in hook yet
        theme={theme}
        onThemeChange={setTheme}
        alwaysOnTop={alwaysOnTop}
        onAlwaysOnTopChange={(v) => {
          setAlwaysOnTop(v);
          if ((window as any).electronAPI?.setAlwaysOnTop) (window as any).electronAPI.setAlwaysOnTop(v);
        }}
        backgroundImage={backgroundImage}
        onBackgroundImageChange={setBackgroundImage}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        backgroundOverlayOpacity={overlayOpacity}
        onBackgroundOverlayOpacityChange={setOverlayOpacity}
        launchAtStartup={launchAtStartup}
        onLaunchAtStartupChange={(v) => {
          setLaunchAtStartup(v);
          if ((window as any).electronAPI?.setLaunchAtStartup) (window as any).electronAPI.setLaunchAtStartup(v);
        }}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onExport={handleExport}
        onImport={handleImport}
        folders={folders}
        onCreateFolder={(name) => {
          firestoreAddFolder({
            name: name,
            collapsed: false,
            order: folders.length
          });
        }}
        onLogout={logout}
      />

      {/* FAB */}
      {folders.length > 0 && (
        <button
          className="fab-add-todo"
          onClick={() => {
            setTargetFolderId(null);
            setSelectedFolderId(null);
            setEditingTodo(null);
            setInput("");
            setLabel("");
            setDueDate("");
            setAttachments([]);
            setPriority('medium');
            setNotificationEnabled(false);
            setShowTodoModal(true);
          }}
        >
          <Icon icon="mdi:plus" width="18" height="18" />
        </button>
      )}

      {/* Todo Modal */}
      {showTodoModal && (
        <div className="todo-modal-overlay" onClick={handleCloseModal}>
          <div className="todo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="todo-modal-header">
              <h3>{editingTodo ? 'Edit Todo' : 'Create New Todo'}</h3>
              <button className="todo-modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="todo-modal-content">
              <div className="input-row">
                <textarea
                  className="input input-textarea"
                  value={input}
                  ref={(textarea) => {
                    if (textarea) {
                      textarea.style.height = 'auto';
                      textarea.style.height = `${textarea.scrollHeight}px`;
                    }
                  }}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addTodo(targetFolderId);
                    } else if (e.key === 'Escape') {
                      handleCloseModal();
                    }
                  }}
                  placeholder="What needs to be done?"
                  autoFocus
                  rows={1}
                />
              </div>
              <div className="input-options">
                <div className="input-option-group priority-group">
                  <label className="input-option-label">Priority</label>
                  <CustomSelect
                    value={priority}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' }
                    ]}
                    onChange={(val) => setPriority(val as 'low' | 'medium' | 'high')}
                    placeholder="Priority"
                    className="priority-select"
                  />
                </div>
                <div className="input-option-group label-group">
                  <label className="input-option-label">Label</label>
                  <LabelInput
                    value={label}
                    options={labels}
                    onChange={setLabel}
                    onAddNew={(newLabel) => {
                      setLabel(newLabel);
                    }}
                    placeholder="Label"
                    className="label-input"
                  />
                </div>
                <div className="input-option-group folder-group">
                  <label className="input-option-label">Folder</label>
                  <CustomSelect
                    value={targetFolderId || selectedFolderId || ''}
                    options={folders.map(f => ({
                      value: f.id,
                      label: f.name
                    }))}
                    onChange={(val) => {
                      setTargetFolderId(val);
                      setSelectedFolderId(val);
                    }}
                    placeholder="Folder"
                    className="folder-select"
                  />
                </div>
              </div>
              <div className="input-option-row date-row">
                <div className="input-option-group date-group">
                  <label className="input-option-label">Due date</label>
                  <div className="date-input-row">
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="Due date"
                      className="date-input"
                    />
                    <div className="notification-controls">
                      <label className="notification-checkbox-label">
                        <input
                          type="checkbox"
                          checked={notificationEnabled}
                          onChange={(e) => {
                            setNotificationEnabled(e.target.checked);
                            if (!e.target.checked) {
                              setNotificationType('before');
                              setNotificationDuration(15);
                            }
                          }}
                          className="notification-checkbox"
                        />
                        <span>Notify</span>
                      </label>
                      {notificationEnabled && (
                        <>
                          <CustomSelect
                            value={String(notificationDuration)}
                            options={[
                              { value: '5', label: '5 min' },
                              { value: '15', label: '15 min' },
                              { value: '30', label: '30 min' },
                              { value: '60', label: '1 hour' },
                              { value: '120', label: '2 hours' },
                              { value: '240', label: '4 hours' },
                              { value: '480', label: '8 hours' },
                              { value: '1440', label: '1 day' }
                            ]}
                            onChange={(val) => setNotificationDuration(parseInt(val, 10))}
                            placeholder="Duration"
                            className="notification-duration-select"
                            disabled={notificationType === 'at'}
                          />
                          <CustomSelect
                            value={notificationType}
                            options={[
                              { value: 'before', label: 'before' },
                              { value: 'at', label: 'at the time' },
                              { value: 'after', label: 'after' }
                            ]}
                            onChange={(val) => setNotificationType(val as 'before' | 'at' | 'after')}
                            placeholder="When"
                            className="notification-type-select"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={`todo-modal-attachments ${isDragOverModal ? 'drag-over' : ''}`}
                onDrop={handleModalDrop}
                onDragOver={handleModalDragOver}
                onDragLeave={handleModalDragLeave}
              >
                <label className="input-option-label">Attachments</label>
                <div className="attachments-upload-area">
                  <input
                    type="file"
                    id="attachment-upload"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <button
                    type="button"
                    className="attachments-upload-btn"
                    onClick={() => {
                      const input = document.getElementById('attachment-upload') as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    <Icon icon="mdi:image-plus" width="20" height="20" />
                    <span>Upload Images</span>
                  </button>
                  <span className="attachments-drop-hint">or drop images here / paste from clipboard</span>
                </div>
                {attachments.length > 0 && (
                  <div className="attachments-preview-grid">
                    {attachments.map(att => (
                      <div key={att.id} className="attachment-preview-tile">
                        <img src={att.url} alt={att.name || 'Attachment'} />
                        <button
                          className="attachment-preview-remove"
                          onClick={() => handleRemoveAttachment(att.id)}
                          title="Remove"
                        >
                          <Icon icon="mdi:close" width="14" height="14" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="todo-modal-actions">
                <button className="todo-modal-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  className="todo-modal-create"
                  onClick={() => addTodo(targetFolderId)}
                  disabled={!input.trim()}
                >
                  {editingTodo ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="folders-section">
          {sortedFolders.length === 0 ? (
            <div className="empty-folders-screen">
              <div className="empty-folders-content">
                <div className="empty-folders-icon">
                  <Icon icon="mdi:folder-plus-outline" width="60" height="60" />
                </div>
                <h2 className="empty-folders-title">No Folders Yet</h2>
                <p className="empty-folders-description">
                  Create your first folder to start organizing your tasks
                </p>
                <button className="empty-folders-create-btn" onClick={() => setShowFolderPopup(true)}>
                  <Icon icon="mdi:plus" width="18" height="18" />
                  Create Your First Folder
                </button>
              </div>
            </div>
          ) : (
            <Droppable droppableId="folders-list" type="FOLDER">
              {(provided: DroppableProvided, snapshot: { isDraggingOver: boolean }) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="folders-droppable">
                  {sortedFolders.map((folder, index) => {
                    const folderTodos = todosByFolder[folder.id] || [];
                    return (
                      <Draggable key={folder.id} draggableId={`folder-${folder.id}`} index={index}>
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className="folder-draggable-wrapper">
                            <FolderGroup
                              folder={folder}
                              todos={folderTodos}
                              onToggleCollapse={toggleFolderCollapse}
                              onRenameFolder={renameFolder}
                              onDeleteFolder={deleteFolder}
                              onMoveTodoToFolder={moveTodoToFolder}
                              dragHandleProps={provided.dragHandleProps}
                              renderTodos={(todos, folderId) => {
                                const filtered = filterTodos(todos);
                                return (
                                  <Droppable droppableId={`folder-${folderId}`} type="TODO">
                                    {(provided: DroppableProvided) => (
                                      <ul className="todo-list" {...provided.droppableProps} ref={provided.innerRef}>
                                        {filtered.map((todo, idx) => (
                                          <Draggable key={todo.id} draggableId={String(todo.id)} index={idx}>
                                            {(provided: DraggableProvided) => (
                                              <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                <TodoItem
                                                  todo={todo}
                                                  onToggle={toggleTodo}
                                                  onUpdate={updateTodo}
                                                  onDelete={archiveTodo}
                                                  onEdit={handleEditTodo}
                                                  searchQuery={searchQuery}
                                                />
                                              </li>
                                            )}
                                          </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {/* Add button row ... */}
                                        <div className="folder-add-todo-row" onClick={(e) => {
                                          e.stopPropagation();
                                          setTargetFolderId(folderId);
                                          setShowTodoModal(true);
                                        }}>
                                          +
                                        </div>
                                      </ul>
                                    )}
                                  </Droppable>
                                );
                              }}
                            />
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>

    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
