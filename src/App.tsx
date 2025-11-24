import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Icon } from "@iconify/react";
import "./App.css";
import "./themes.css";
import { Todo, FilterType, Theme, Folder, Attachment } from "./types";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { exportTodos, importTodos } from "./utils/storage";
import { scheduleAllNotifications, checkAndNotifyOverdueTasks, clearOverdueNotificationTracking } from "./utils/notifications";
import TodoItem from "./components/TodoItem";
import FilterBar from "./components/FilterBar";
import SearchBar from "./components/SearchBar";
import Settings from "./components/Settings";
import CustomSelect from "./components/CustomSelect";
import DatePicker from "./components/DatePicker";
import LabelInput from "./components/LabelInput";
import FolderGroup from "./components/FolderGroup";

const STORAGE_KEY = "win_todo_items";
const THEME_KEY = "todo_theme";
const FOLDERS_KEY = "todo_folders";
const SELECTED_FOLDER_KEY = "todo_selected_folder";
const ALWAYS_ON_TOP_KEY = "todo_always_on_top";
const UNCategorized_MIGRATION_KEY = "uncategorized_migrated";

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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

  // Initialize theme from localStorage immediately to prevent overwriting on mount
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    }
    return 'light';
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
    if (saved) {
      const opacity = parseFloat(saved);
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
        return opacity;
      }
    }
    return 0.3;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    const saved = localStorage.getItem(SELECTED_FOLDER_KEY);
    return saved || null;
  });

  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string, name: string } | null>(null);

  const { addToHistory, undo, redo, canUndo, canRedo } = useUndoRedo(todos);

  // Apply always-on-top to electron on mount
  useEffect(() => {
    // Use setTimeout to ensure Electron API is ready
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

  // Migration function to convert uncategorized folder to normal folder
  const migrateUncategorizedFolder = useCallback((loadedTodos: Todo[], loadedFolders: Folder[]) => {
    // Check if migration has already been done
    const migrationDone = localStorage.getItem(UNCategorized_MIGRATION_KEY) === 'true';
    
    // Check if there are any folders with the old 'uncategorized' ID
    const hasOldUncategorized = loadedFolders.some(f => f.id === 'uncategorized');
    
    // Check if there are already migrated uncategorized folders (to avoid duplicates)
    const hasMigratedUncategorized = loadedFolders.some(f => f.id.startsWith('folder-uncategorized-'));
    
    // Check if there are todos with null folderId that need a folder
    const todosWithoutFolder = loadedTodos.filter(t => !t.folderId);
    
    // If migration already done and no old uncategorized folder exists, no migration needed
    if (migrationDone && !hasOldUncategorized) {
      // If there are todos without folder but migration is done, they should already be in a folder
      // But if they're not, we might need to assign them to an existing migrated folder
      if (todosWithoutFolder.length > 0 && hasMigratedUncategorized) {
        // Find the first migrated uncategorized folder
        const migratedFolder = loadedFolders.find(f => f.id.startsWith('folder-uncategorized-'));
        if (migratedFolder) {
          // Assign todos without folder to the existing migrated folder
          const migratedTodos = loadedTodos.map(todo => 
            !todo.folderId ? { ...todo, folderId: migratedFolder.id } : todo
          );
          return { todos: migratedTodos, folders: loadedFolders, migratedFolderId: null };
        }
      }
      return { todos: loadedTodos, folders: loadedFolders, migratedFolderId: null };
    }
    
    const uncategorizedIndex = loadedFolders.findIndex(f => f.id === 'uncategorized');
    
    if (uncategorizedIndex === -1) {
      // No uncategorized folder, check if we need to create one for todos with null folderId
      // Only create if migration hasn't been done and there are no existing migrated folders
      if (todosWithoutFolder.length > 0 && !migrationDone && !hasMigratedUncategorized) {
        // Create a new folder for uncategorized todos
        const newFolderId = `folder-uncategorized-${Date.now()}`;
        const newFolder: Folder = {
          id: newFolderId,
          name: 'Uncategorized',
          collapsed: false,
          order: loadedFolders.length > 0 ? Math.max(...loadedFolders.map(f => f.order)) + 1 : 0
        };
        
        // Migrate todos
        const migratedTodos = loadedTodos.map(todo => 
          !todo.folderId ? { ...todo, folderId: newFolderId } : todo
        );
        
        // Mark migration as done
        localStorage.setItem(UNCategorized_MIGRATION_KEY, 'true');
        
        return {
          todos: migratedTodos,
          folders: [...loadedFolders, newFolder],
          migratedFolderId: newFolderId
        };
      }
      // If there are already migrated folders but todos without folderId, assign them
      if (todosWithoutFolder.length > 0 && hasMigratedUncategorized) {
        const migratedFolder = loadedFolders.find(f => f.id.startsWith('folder-uncategorized-'));
        if (migratedFolder) {
          const migratedTodos = loadedTodos.map(todo => 
            !todo.folderId ? { ...todo, folderId: migratedFolder.id } : todo
          );
          return { todos: migratedTodos, folders: loadedFolders, migratedFolderId: null };
        }
      }
      return { todos: loadedTodos, folders: loadedFolders, migratedFolderId: null };
    }
    
    // Uncategorized folder exists, convert it to normal folder
    const uncategorizedFolder = loadedFolders[uncategorizedIndex];
    const newFolderId = `folder-uncategorized-${Date.now()}`;
    const migratedFolder: Folder = {
      ...uncategorizedFolder,
      id: newFolderId
    };
    
    // Migrate todos with null folderId or 'uncategorized' to new folder ID
    const migratedTodos = loadedTodos.map(todo => {
      if (!todo.folderId || todo.folderId === 'uncategorized') {
        return { ...todo, folderId: newFolderId };
      }
      return todo;
    });
    
    // Replace uncategorized folder with migrated folder
    const migratedFolders = [
      ...loadedFolders.slice(0, uncategorizedIndex),
      migratedFolder,
      ...loadedFolders.slice(uncategorizedIndex + 1)
    ];
    
    // Mark migration as done
    localStorage.setItem(UNCategorized_MIGRATION_KEY, 'true');
    
    return {
      todos: migratedTodos,
      folders: migratedFolders,
      migratedFolderId: newFolderId
    };
  }, []);

  // Load data from files on mount and handle migration
  useEffect(() => {
    const loadData = async () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) {
          // Not in Electron, use localStorage as fallback
          const raw = localStorage.getItem(STORAGE_KEY);
          let loadedTodos: Todo[] = [];
          if (raw) {
            try {
              const loaded = JSON.parse(raw);
              loadedTodos = loaded.map((todo: any) => ({
                ...todo,
                priority: todo.priority || 'medium',
                label: todo.label || todo.category || '',
                folderId: todo.folderId || null,
                createdAt: todo.createdAt || todo.id,
              }));
            } catch (e) {
              console.error('Failed to load todos:', e);
            }
          }

          const foldersRaw = localStorage.getItem(FOLDERS_KEY);
          let loadedFolders: Folder[] = [];
          if (foldersRaw) {
            try {
              loadedFolders = JSON.parse(foldersRaw);
            } catch (e) {
              console.error('Failed to load folders:', e);
            }
          }
          
          // Migrate uncategorized folder
          const migration = migrateUncategorizedFolder(loadedTodos, loadedFolders);
          setTodos(migration.todos);
          setFolders(migration.folders);
          
          // Update selected folder if it was uncategorized
          if (migration.migratedFolderId) {
            const savedSelectedFolder = localStorage.getItem(SELECTED_FOLDER_KEY);
            if (!savedSelectedFolder || savedSelectedFolder === 'uncategorized') {
              setSelectedFolderId(migration.migratedFolderId);
              localStorage.setItem(SELECTED_FOLDER_KEY, migration.migratedFolderId);
            }
          }
          
          setIsDataLoaded(true);
          
          // Check for overdue tasks and show notifications after a short delay
          if (window.electronAPI && migration.todos.length > 0) {
            setTimeout(() => {
              checkAndNotifyOverdueTasks(migration.todos).catch(err => {
                console.error('Failed to check overdue tasks:', err);
              });
            }, 1500); // Small delay to ensure app is fully loaded
          }
          
          return;
        }

        // Load from files
        const [loadedTodos, loadedFolders] = await Promise.all([
          electronAPI.loadTodos(),
          electronAPI.loadFolders()
        ]);
        
        if (loadedFolders && loadedFolders.length > 0) {
          console.log('Loaded folders from file:', loadedFolders.map(f => ({ id: f.id, name: f.name })));
        }

        // Check if we need to migrate from localStorage
        const hasLocalStorageData = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FOLDERS_KEY);
        const hasFileData = loadedTodos || loadedFolders;

        if (hasLocalStorageData && !hasFileData) {
          // Migrate from localStorage to files
          console.log('Migrating data from localStorage to files...');
          const todosRaw = localStorage.getItem(STORAGE_KEY);
          const foldersRaw = localStorage.getItem(FOLDERS_KEY);
          
          let todosToMigrate: Todo[] = [];
          if (todosRaw) {
            try {
              const loaded = JSON.parse(todosRaw);
              todosToMigrate = loaded.map((todo: any) => ({
                ...todo,
                priority: todo.priority || 'medium',
                label: todo.label || todo.category || '',
                folderId: todo.folderId || null,
                createdAt: todo.createdAt || todo.id,
              }));
            } catch (e) {
              console.error('Failed to parse todos for migration:', e);
            }
          }

          let foldersToMigrate: Folder[] = [];
          if (foldersRaw) {
            try {
              foldersToMigrate = JSON.parse(foldersRaw);
            } catch (e) {
              console.error('Failed to parse folders for migration:', e);
            }
          }

          // Migrate other settings
          const themeToMigrate = localStorage.getItem(THEME_KEY);
          const alwaysOnTopToMigrate = localStorage.getItem(ALWAYS_ON_TOP_KEY);
          const selectedFolderToMigrate = localStorage.getItem(SELECTED_FOLDER_KEY);
          const backgroundImageToMigrate = localStorage.getItem("todo_background_image");
          const backgroundColorToMigrate = localStorage.getItem("todo_background_color");
          const overlayOpacityToMigrate = localStorage.getItem("todo_background_overlay_opacity");

          await electronAPI.migrateFromLocalStorage({
            todos: todosToMigrate,
            folders: foldersToMigrate,
            theme: themeToMigrate,
            alwaysOnTop: alwaysOnTopToMigrate !== null ? alwaysOnTopToMigrate === 'true' : undefined,
            selectedFolder: selectedFolderToMigrate,
            backgroundImage: backgroundImageToMigrate,
            backgroundColor: backgroundColorToMigrate,
            overlayOpacity: overlayOpacityToMigrate ? parseFloat(overlayOpacityToMigrate) : undefined,
          });

          // Reload from files after migration
          const [migratedTodos, migratedFolders] = await Promise.all([
            electronAPI.loadTodos(),
            electronAPI.loadFolders()
          ]);

          let finalTodos = migratedTodos || todosToMigrate;
          let finalFolders = migratedFolders || foldersToMigrate;
          
          // Migrate uncategorized folder
          const migration = migrateUncategorizedFolder(finalTodos, finalFolders);
          finalTodos = migration.todos;
          finalFolders = migration.folders;
          
          setTodos(finalTodos);
          setFolders(finalFolders);
          
          // Update selected folder if it was uncategorized
          if (migration.migratedFolderId) {
            if (selectedFolderToMigrate === 'uncategorized' || !selectedFolderToMigrate) {
              setSelectedFolderId(migration.migratedFolderId);
            }
            
            // Save migrated data back to files
            if (electronAPI?.saveTodos) {
              electronAPI.saveTodos(finalTodos).catch((err: any) => {
                console.error('Failed to save migrated todos:', err);
              });
            }
            if (electronAPI?.saveFolders) {
              electronAPI.saveFolders(finalFolders).catch((err: any) => {
                console.error('Failed to save migrated folders:', err);
              });
            }
          }
          
          // Check for overdue tasks and show notifications
          if (electronAPI) {
            setTimeout(() => {
              checkAndNotifyOverdueTasks(finalTodos).catch(err => {
                console.error('Failed to check overdue tasks:', err);
              });
            }, 1000); // Small delay to ensure app is fully loaded
          }

          // Update other settings from migration
          if (themeToMigrate && (themeToMigrate === 'light' || themeToMigrate === 'dark')) {
            setTheme(themeToMigrate);
          }
          if (alwaysOnTopToMigrate !== null) {
            setAlwaysOnTop(alwaysOnTopToMigrate === 'true');
          }
          // Selected folder is handled in migration above
          if (backgroundImageToMigrate) {
            setBackgroundImage(backgroundImageToMigrate);
          }
          if (backgroundColorToMigrate) {
            setBackgroundColor(backgroundColorToMigrate);
          }
          if (overlayOpacityToMigrate) {
            const opacity = parseFloat(overlayOpacityToMigrate);
            if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
              setOverlayOpacity(opacity);
            }
          }
        } else {
          // Load from files (normal case)
          let todosToSet = loadedTodos || [];
          let foldersToSet = loadedFolders || [];
          
          // Migrate uncategorized folder if it exists
          const migration = migrateUncategorizedFolder(todosToSet, foldersToSet);
          todosToSet = migration.todos;
          foldersToSet = migration.folders;
          
          setTodos(todosToSet);
          setFolders(foldersToSet);
          
          // Update selected folder if it was uncategorized
          if (migration.migratedFolderId) {
            const savedSelectedFolder = localStorage.getItem(SELECTED_FOLDER_KEY);
            if (!savedSelectedFolder || savedSelectedFolder === 'uncategorized') {
              setSelectedFolderId(migration.migratedFolderId);
              localStorage.setItem(SELECTED_FOLDER_KEY, migration.migratedFolderId);
            }
            
            // Save migrated data back to files
            if (electronAPI?.saveTodos) {
              electronAPI.saveTodos(todosToSet).catch((err: any) => {
                console.error('Failed to save migrated todos:', err);
              });
            }
            if (electronAPI?.saveFolders) {
              electronAPI.saveFolders(foldersToSet).catch((err: any) => {
                console.error('Failed to save migrated folders:', err);
              });
            }
          }
          
          // Check for overdue tasks and show notifications after a short delay
          if (electronAPI && todosToSet.length > 0) {
            setTimeout(() => {
              checkAndNotifyOverdueTasks(todosToSet).catch(err => {
                console.error('Failed to check overdue tasks:', err);
              });
            }, 1500); // Small delay to ensure app is fully loaded
          }
        }

        setIsDataLoaded(true);
      } catch (error) {
        console.error('Failed to load data:', error);
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, []);

  // Save todos to files
  useEffect(() => {
    if (!isDataLoaded) return; // Don't save during initial load

    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.saveTodos) {
      electronAPI.saveTodos(todos).catch((err: any) => {
        console.error('Failed to save todos:', err);
      });
    } else {
      // Fallback to localStorage if not in Electron
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }
  }, [todos, isDataLoaded]);

  // Save folders to files
  useEffect(() => {
    if (!isDataLoaded) return; // Don't save during initial load

    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.saveFolders) {
      electronAPI.saveFolders(folders).catch((err: any) => {
        console.error('Failed to save folders:', err);
      });
    } else {
      // Fallback to localStorage if not in Electron
      if (folders.length > 0) {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
      }
    }
  }, [folders, isDataLoaded]);

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

  // Apply theme and save to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always update DOM
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  // Save selected folder to localStorage
  useEffect(() => {
    if (selectedFolderId) {
      localStorage.setItem(SELECTED_FOLDER_KEY, selectedFolderId);
    } else {
      localStorage.removeItem(SELECTED_FOLDER_KEY);
    }
  }, [selectedFolderId]);

  // Schedule notifications for todos with notification settings
  useEffect(() => {
    if (window.electronAPI) {
      scheduleAllNotifications(todos).catch(err => {
        console.error('Failed to schedule notifications:', err);
      });
    }
  }, [todos]);

  // Auto-expand folders with search matches
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    const foldersToExpand: string[] = [];

    // Group todos by folder (only include todos with folderId)
    const todosByFolderMap = todos.reduce((acc, todo) => {
      if (todo.folderId) {
        if (!acc[todo.folderId]) acc[todo.folderId] = [];
        acc[todo.folderId].push(todo);
      }
      return acc;
    }, {} as Record<string, Todo[]>);

    // Check each folder for matching todos
    folders.forEach(folder => {
      const folderTodos = todosByFolderMap[folder.id] || [];
      const hasMatch = folderTodos.some(todo => {
        // Check if todo matches search query
        if (!todo.text.toLowerCase().includes(query)) return false;

        // Check if todo matches current filters
        if (filter === 'active' && todo.done) return false;
        if (filter === 'completed' && !todo.done) return false;
        if (selectedLabel && todo.label !== selectedLabel) return false;

        return true;
      });

      if (hasMatch && folder.collapsed) {
        foldersToExpand.push(folder.id);
      }
    });

    // Expand folders with matches (only update if there are folders to expand)
    if (foldersToExpand.length > 0) {
      setFolders(prevFolders => {
        const needsUpdate = prevFolders.some(f =>
          foldersToExpand.includes(f.id) && f.collapsed
        );
        if (!needsUpdate) return prevFolders;

        return prevFolders.map(f =>
          foldersToExpand.includes(f.id) ? { ...f, collapsed: false } : f
        );
      });
    }
  }, [searchQuery, todos, filter, selectedLabel]);

  const addTodo = useCallback((folderIdOverride?: string | null) => {
    // If folderIdOverride is explicitly null, use null. Otherwise use selectedFolderId as fallback
    const folderToUse = folderIdOverride !== undefined ? folderIdOverride : (folderIdOverride === null ? null : selectedFolderId);
    if (!input.trim()) return;

    if (editingTodo) {
      // Update existing todo
      const updatedTodo: Todo = {
        ...editingTodo,
        text: input.trim(),
        priority,
        label: label.trim(),
        folderId: folderToUse,
        dueDate: dueDate || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        notificationEnabled: notificationEnabled || undefined,
        notificationType: notificationEnabled ? notificationType : undefined,
        notificationDuration: notificationEnabled && notificationType !== 'at' ? notificationDuration : undefined,
      };
      const newTodos = todos.map(t => t.id === editingTodo.id ? updatedTodo : t);
      setTodos(newTodos);
      addToHistory(newTodos, 'update');
      setEditingTodo(null);
    } else {
      // Create new todo
      const newTodo: Todo = {
        id: Date.now(),
        text: input.trim(),
        done: false,
        priority,
        label: label.trim(),
        folderId: folderToUse,
        dueDate: dueDate || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: Date.now(),
        notificationEnabled: notificationEnabled || undefined,
        notificationType: notificationEnabled ? notificationType : undefined,
        notificationDuration: notificationEnabled && notificationType !== 'at' ? notificationDuration : undefined,
      };
      const newTodos = [...todos, newTodo];
      setTodos(newTodos);
      addToHistory(newTodos, 'add');
    }

    setInput("");
    setLabel("");
    setDueDate("");
    setAttachments([]);
    setPriority('medium');
    setNotificationEnabled(false);
    setNotificationType('before');
    setNotificationDuration(15);
    setShowTodoModal(false);
    setTargetFolderId(null);
    setIsDragOverModal(false);
    // Keep the selected folder (don't reset) - it's saved to localStorage
  }, [input, priority, label, dueDate, attachments, selectedFolderId, todos, addToHistory, editingTodo, notificationEnabled, notificationType, notificationDuration]);

  const updateTodo = useCallback((id: number, updates: Partial<Todo>) => {
    const oldTodo = todos.find(t => t.id === id);
    const newTodos = todos.map(t => t.id === id ? { ...t, ...updates } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'update');
    setEditingId(null);
    
    // Clear overdue notification tracking if due date changed or task is completed
    if (oldTodo) {
      const updatedTodo = newTodos.find(t => t.id === id);
      if (updatedTodo) {
        // Clear tracking if due date changed or task is now completed
        if (updates.dueDate !== undefined && updates.dueDate !== oldTodo.dueDate) {
          clearOverdueNotificationTracking(id);
        }
        if (updates.done !== undefined && updates.done && !oldTodo.done) {
          clearOverdueNotificationTracking(id);
        }
      }
    }
  }, [todos, addToHistory]);

  const toggleTodo = useCallback((id: number) => {
    const todo = todos.find(t => t.id === id);
    const newTodos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'toggle');
    
    // Clear overdue notification tracking when task is completed
    if (todo && !todo.done) {
      clearOverdueNotificationTracking(id);
    }
  }, [todos, addToHistory]);

  const archiveTodo = useCallback((id: number) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, isArchived: true } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'delete');
  }, [todos, addToHistory]);

  const deleteTodo = useCallback((id: number) => {
    const newTodos = todos.filter(t => t.id !== id);
    setTodos(newTodos);
    addToHistory(newTodos, 'delete');
    
    // Clear overdue notification tracking when task is deleted
    clearOverdueNotificationTracking(id);
  }, [todos, addToHistory]);

  const restoreTodo = useCallback((id: number) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, isArchived: false } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'add');
  }, [todos, addToHistory]);

  const clearCompleted = useCallback(() => {
    const newTodos = todos.map(t => t.done ? { ...t, isArchived: true } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'delete');
  }, [todos, addToHistory]);

  const handleDragEnd = useCallback((result: DropResult) => {
    console.log('=== DRAG END ===');
    console.log('Full result:', result);
    console.log('Source:', result.source);
    console.log('Destination:', result.destination);
    
    if (!result.destination) {
      console.log('No destination - drag cancelled');
      return;
    }

    // Handle folder reordering (only if type is FOLDER)
    if (result.type === 'FOLDER' && result.source.droppableId === 'folders-list' && result.destination.droppableId === 'folders-list') {
      console.log('Folder reordering detected');
      const sourceIndex = result.source.index;
      const destIndex = result.destination.index;
      
      // Prevent reordering if source equals destination
      if (sourceIndex === destIndex) return;
      
      // Sort folders by order
      const sorted = [...folders].sort((a, b) => a.order - b.order);
      
      console.log('Current sorted folders:', sorted.map(f => ({ id: f.id, order: f.order })));
      console.log('Source index:', sourceIndex, 'Dest index:', destIndex);
      
      const sourceFolder = sorted[sourceIndex];
      console.log('Source folder:', sourceFolder.id);
      
      // Reorder folders
      const reorderedFolders = Array.from(sorted);
      const [reorderedFolder] = reorderedFolders.splice(sourceIndex, 1);
      reorderedFolders.splice(destIndex, 0, reorderedFolder);
      
      console.log('After reorder:', reorderedFolders.map(f => ({ id: f.id })));
      
      // Update order property for all folders based on their new positions
      // Preserve all other properties including collapsed state
      const updatedFolders = reorderedFolders.map((folder, index) => ({
        ...folder,
        order: index,
        // Explicitly preserve collapsed state
        collapsed: folder.collapsed !== undefined ? folder.collapsed : false
      }));
      
      console.log('Updated folders with order:', updatedFolders.map(f => ({ id: f.id, order: f.order, collapsed: f.collapsed })));
      
      setFolders(updatedFolders);
      return;
    }

    // Only handle TODO type drags here (folders are handled above)
    if (result.type !== 'TODO') {
      console.log('Ignoring non-TODO drag:', result.type);
      return;
    }

    const sourceDroppableId = result.source.droppableId;
    const destDroppableId = result.destination.droppableId;
    const todoId = parseInt(result.draggableId);

    console.log('Todo drag detected');
    console.log('Todo ID:', todoId);
    console.log('Source droppable:', sourceDroppableId);
    console.log('Dest droppable:', destDroppableId);
    console.log('Source index:', result.source.index);
    console.log('Dest index:', result.destination.index);

    // Check if moving between folders
    if (sourceDroppableId !== destDroppableId) {
      console.log('Moving between folders');
      // Ignore drops on folders-list (that's for folder reordering, not todos)
      if (destDroppableId === 'folders-list') {
        console.log('Ignoring drop on folders-list - todos cannot be dropped on folder headers');
        return;
      }
      if (destDroppableId.startsWith('folder-')) {
        const folderId = destDroppableId.replace('folder-', '');
        console.log('Moving to folder:', folderId);
        const newTodos = todos.map(t =>
          t.id === todoId ? { ...t, folderId } : t
        );
        console.log('Updated todos:', newTodos);
        setTodos(newTodos);
        addToHistory(newTodos, 'update');
      }
      return;
    }

    // Reordering within same folder
    console.log('Reordering within same folder');
    const folderId = sourceDroppableId.replace('folder-', '');
    console.log('Folder ID:', folderId);
    
    const folderTodos = todos.filter(t => t.folderId === folderId);
    const otherTodos = todos.filter(t => t.folderId !== folderId);

    console.log('Folder todos (full):', folderTodos.map(t => ({ id: t.id, text: t.text.substring(0, 20) })));
    console.log('Total folder todos:', folderTodos.length);

    // Get filtered todos to map drag indices to actual todos
    const filteredFolderTodos = filterTodos(folderTodos);
    console.log('Filtered folder todos:', filteredFolderTodos.map(t => ({ id: t.id, text: t.text.substring(0, 20) })));
    console.log('Total filtered todos:', filteredFolderTodos.length);
    console.log('Source index in filtered:', result.source.index);
    console.log('Dest index in filtered:', result.destination.index);
    
    // Get the actual todo being moved
    const sourceTodo = filteredFolderTodos[result.source.index];
    console.log('Source todo:', sourceTodo ? { id: sourceTodo.id, text: sourceTodo.text.substring(0, 20) } : 'NOT FOUND');
    if (!sourceTodo) {
      console.error('Source todo not found at index', result.source.index);
      return; // Safety check
    }
    
    // Find source todo's position in full array
    const sourceIndexInFull = folderTodos.findIndex(t => t.id === sourceTodo.id);
    console.log('Source index in full array:', sourceIndexInFull);
    if (sourceIndexInFull === -1) {
      console.error('Source todo not found in full array');
      return;
    }
    
    // Determine destination position
    // Get the todo at destination index in filtered list
    const destTodo = filteredFolderTodos[result.destination.index];
    console.log('Dest todo:', destTodo ? { id: destTodo.id, text: destTodo.text.substring(0, 20) } : 'NOT FOUND (end of list)');
    
    let destIndexInFull: number;
    if (destTodo) {
      // Find destination todo's position in full array
      const destIndexInFullTemp = folderTodos.findIndex(t => t.id === destTodo.id);
      console.log('Dest todo index in full array (temp):', destIndexInFullTemp);
      if (destIndexInFullTemp === -1) {
        console.error('Dest todo not found in full array');
        return;
      }
      
      // If moving down, adjust index (since we'll remove from before)
      if (sourceIndexInFull < destIndexInFullTemp) {
        destIndexInFull = destIndexInFullTemp;
        console.log('Moving down - dest index:', destIndexInFull);
      } else {
        destIndexInFull = destIndexInFullTemp;
        console.log('Moving up - dest index:', destIndexInFull);
      }
    } else {
      // Dropped at end of filtered list - find last visible todo's position
      console.log('Dropped at end of filtered list');
      if (filteredFolderTodos.length > 0) {
        const lastVisibleTodo = filteredFolderTodos[filteredFolderTodos.length - 1];
        const lastVisibleIndex = folderTodos.findIndex(t => t.id === lastVisibleTodo.id);
        console.log('Last visible todo index:', lastVisibleIndex);
        destIndexInFull = lastVisibleIndex + 1;
        // Adjust if source is before destination
        if (sourceIndexInFull < destIndexInFull) {
          destIndexInFull -= 1;
          console.log('Adjusted dest index (moving down):', destIndexInFull);
        }
      } else {
        destIndexInFull = folderTodos.length;
        console.log('No filtered todos - dest index:', destIndexInFull);
      }
    }
    
    // Ensure valid range
    destIndexInFull = Math.max(0, Math.min(destIndexInFull, folderTodos.length));
    console.log('Final dest index:', destIndexInFull);
    
    // Reorder the full folderTodos array
    const items = Array.from(folderTodos);
    console.log('Before reorder:', items.map(t => ({ id: t.id, text: t.text.substring(0, 20) })));
    const [reorderedItem] = items.splice(sourceIndexInFull, 1);
    console.log('Reordered item:', { id: reorderedItem.id, text: reorderedItem.text.substring(0, 20) });
    items.splice(destIndexInFull, 0, reorderedItem);
    console.log('After reorder:', items.map(t => ({ id: t.id, text: t.text.substring(0, 20) })));

    const finalTodos = [...otherTodos, ...items];
    console.log('Final todos array length:', finalTodos.length);
    console.log('=== END DRAG END ===');
    
    setTodos(finalTodos);
    addToHistory(finalTodos, 'reorder');
  }, [todos, addToHistory, folders]);

  const handleUndo = useCallback(() => {
    const restored = undo();
    if (restored) setTodos(restored);
  }, [undo]);

  const handleRedo = useCallback(() => {
    const restored = redo();
    if (restored) setTodos(restored);
  }, [redo]);

  const handleExport = useCallback(async () => {
    const json = exportTodos(todos);
    if ((window as any).electronAPI?.saveFile) {
      // Use Electron's save dialog
      (window as any).electronAPI.saveFile(json, 'todos.json');
    } else {
      // Fallback: download file in browser
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [todos]);

  const handleImport = useCallback(async () => {
    if ((window as any).electronAPI?.openFile) {
      // Use Electron's open dialog
      (window as any).electronAPI.openFile((data: string) => {
        const imported = importTodos(data);
        if (imported) {
          setTodos(imported);
          addToHistory(imported, 'add');
        }
      });
    } else {
      // Fallback: use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            const imported = importTodos(content);
            if (imported) {
              setTodos(imported);
              addToHistory(imported, 'add');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  }, [addToHistory]);

  const clearArchived = useCallback(() => {
    const newTodos = todos.filter(t => !t.isArchived);
    setTodos(newTodos);
    addToHistory(newTodos, 'delete');
  }, [todos, addToHistory]);

  // Folder management
  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      collapsed: false,
      order: folders.length
    };
    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setShowFolderPopup(false);
  }, [newFolderName, folders]);

  const toggleFolderCollapse = useCallback((folderId: string) => {
    setFolders(folders.map(f =>
      f.id === folderId ? { ...f, collapsed: !f.collapsed } : f
    ));
  }, [folders]);

  const renameFolder = useCallback((folderId: string, newName: string) => {
    if (!newName || !newName.trim()) return;

    setFolders(prevFolders => 
      prevFolders.map(f =>
        f.id === folderId ? { ...f, name: newName.trim() } : f
      )
    );
  }, []);

  const deleteFolder = useCallback((folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
  }, []);

  const confirmDeleteFolder = useCallback(() => {
    if (!folderToDelete) return;

    // Delete todos in the folder (or move to first available folder if you prefer)
    // For now, we'll delete todos when folder is deleted
    const newTodos = todos.filter(t => t.folderId !== folderToDelete.id);

    // Only update todos if there were changes
    if (JSON.stringify(newTodos) !== JSON.stringify(todos)) {
      setTodos(newTodos);
      addToHistory(newTodos, 'update');
    }

    // Delete folder
    setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));

    setFolderToDelete(null);
  }, [folderToDelete, todos, addToHistory]);

  const moveTodoToFolder = useCallback((todoId: number, folderId: string | null) => {
    const newTodos = todos.map(t =>
      t.id === todoId ? { ...t, folderId } : t
    );
    setTodos(newTodos);
    addToHistory(newTodos, 'update');
  }, [todos, addToHistory]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    escape: () => {
      if (editingId !== null) {
        setEditingId(null);
      } else if (input) {
        setInput("");
      }
    },
    ctrlF: () => {
      setSearchFocused(true);
      setTimeout(() => {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        searchInput?.focus();
      }, 0);
    },
    ctrlD: () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    },
    ctrlZ: handleUndo,
    ctrlY: handleRedo,
  });

  // Filter and search logic
  const labels = Array.from(new Set(todos.map(t => t.label).filter(Boolean)));

  // Group todos by folder (only include todos that have a folderId)
  const todosByFolder = todos.reduce((acc, todo) => {
    if (todo.folderId) {
      if (!acc[todo.folderId]) acc[todo.folderId] = [];
      acc[todo.folderId].push(todo);
    }
    return acc;
  }, {} as Record<string, Todo[]>);

  // Get sorted folders (sort by order)
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  // Filter todos
  const filterTodos = (todoList: Todo[]) => {
    return todoList.filter(todo => {
      if (todo.isArchived) return false;

      // Filter by status
      if (filter === 'active' && todo.done) return false;
      if (filter === 'completed' && !todo.done) return false;

      // Filter by label
      if (selectedLabel && todo.label !== selectedLabel) return false;

      // Filter by search query
      if (searchQuery && !todo.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  };


  const activeTodos = todos.filter((t) => !t.done && !t.isArchived).length;
  const completedCount = todos.filter((t) => t.done && !t.isArchived).length;

  const hasBackground = backgroundImage || backgroundColor;

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
    setLabel("");
    setDueDate("");
    setAttachments([]);
    setPriority('medium');
    setTargetFolderId(null);
    setIsDragOverModal(false);
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
            name: file.name || 'Image'
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
    let urlProcessed = false;

    // Process dropped items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          files.push(file);
        }
      } else if (item.kind === 'string') {
        if (item.type === 'text/uri-list' || item.type === 'text/plain') {
          item.getAsString((url) => {
            if (!urlProcessed && url && (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:image'))) {
              urlProcessed = true;
              const newAttachment: Attachment = {
                id: String(Date.now()),
                type: 'image',
                url: url,
                name: 'Image'
              };
              setAttachments(prev => [...prev, newAttachment]);
            }
          });
        }
      }
    }

    // Process files
    if (files.length > 0) {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            const newAttachment: Attachment = {
              id: String(Date.now() + Math.random()),
              type: 'image',
              url: dataUrl,
              name: file.name || 'Image'
            };
            setAttachments(prev => [...prev, newAttachment]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }, []);

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

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Only handle paste when modal is open
    if (!showTodoModal) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains images
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        hasImage = true;
        break;
      }
    }

    // If no image, let normal paste behavior happen
    if (!hasImage) return;

    // If there's an image, handle it as attachment
    // Prevent default to avoid pasting image data into text fields
    e.preventDefault();
    e.stopPropagation();

    // Process the image
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              const newAttachment: Attachment = {
                id: String(Date.now() + Math.random()),
                type: 'image',
                url: dataUrl,
                name: 'Pasted Image'
              };
              setAttachments(prev => [...prev, newAttachment]);
            }
          };
          reader.readAsDataURL(file);
        }
        break; // Only process first image
      }
    }
  }, [showTodoModal]);

  // Add paste event listener when modal is open
  useEffect(() => {
    if (showTodoModal) {
      window.addEventListener('paste', handlePaste);
      return () => {
        window.removeEventListener('paste', handlePaste);
      };
    }
  }, [showTodoModal, handlePaste]);

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
      {hasBackground && (
        <div
          className="background-overlay"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="titlebar">
        <div className="titlebar-search">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="titlebar-actions">
          <button
            className="settings-toggle"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Icon icon="mdi:cog" width="20" height="20" />
          </button>
        </div>
        <div className="window-controls">
          <button className="control-btn minimize" onClick={() => (window as any).electronAPI?.minimize()} title="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 5H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
          <button className="control-btn close" onClick={() => (window as any).electronAPI?.close()} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Folder Creation Popup */}
      {showFolderPopup && (
        <div className="folder-popup-overlay" onClick={() => setShowFolderPopup(false)}>
          <div className="folder-popup" onClick={(e) => e.stopPropagation()}>
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
                  if (e.key === 'Enter') {
                    createFolder();
                  } else if (e.key === 'Escape') {
                    setShowFolderPopup(false);
                  }
                }}
                placeholder="Folder name..."
                className="folder-popup-input"
                autoFocus
              />
              <div className="folder-popup-actions">
                <button className="folder-popup-cancel" onClick={() => setShowFolderPopup(false)}>
                  Cancel
                </button>
                <button className="folder-popup-create" onClick={createFolder} disabled={!newFolderName.trim()}>
                  Create
                </button>
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
              <p style={{ margin: '0 0 20px', color: 'var(--text-primary)' }}>
                Delete folder "<strong>{folderToDelete.name}</strong>"? All todos in this folder will be deleted.
              </p>
              <div className="folder-popup-actions">
                <button className="folder-popup-cancel" onClick={() => setFolderToDelete(null)}>
                  Cancel
                </button>
                <button
                  className="folder-popup-delete"
                  onClick={confirmDeleteFolder}
                >
                  Delete
                </button>
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

      {/* Settings Modal */}
      <Settings
        todos={todos}
        onDelete={deleteTodo}
        onRestore={restoreTodo}
        onClearArchived={clearArchived}
        theme={theme}
        onThemeChange={(newTheme) => {
          // setTheme will trigger the useEffect to save, so we don't need to save here
          setTheme(newTheme);
        }}
        alwaysOnTop={alwaysOnTop}
        onAlwaysOnTopChange={(value) => {
          setAlwaysOnTop(value);
          localStorage.setItem(ALWAYS_ON_TOP_KEY, String(value));
          if ((window as any).electronAPI?.setAlwaysOnTop) {
            (window as any).electronAPI.setAlwaysOnTop(value);
          }
        }}
        backgroundImage={backgroundImage}
        onBackgroundImageChange={setBackgroundImage}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        backgroundOverlayOpacity={overlayOpacity}
        onBackgroundOverlayOpacityChange={setOverlayOpacity}
        launchAtStartup={launchAtStartup}
        onLaunchAtStartupChange={(value) => {
          setLaunchAtStartup(value);
          if ((window as any).electronAPI?.setLaunchAtStartup) {
            (window as any).electronAPI.setLaunchAtStartup(value);
          }
        }}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onExport={handleExport}
        onImport={handleImport}
        folders={folders}
        onCreateFolder={(name) => {
          const newFolder: Folder = {
            id: `folder-${Date.now()}`,
            name: name,
            collapsed: false,
            order: folders.length
          };
          setFolders([...folders, newFolder]);
        }}
      />

      {/* Floating Action Button */}
      {folders.length > 0 && (
        <button
          className="fab-add-todo"
          onClick={() => {
            setTargetFolderId(null);
            setSelectedFolderId(null); // Clear selected folder so no folder is pre-selected
            setEditingTodo(null);
            setInput("");
            setLabel("");
            setDueDate("");
            setAttachments([]);
            setPriority('medium');
            setNotificationEnabled(false);
            setNotificationType('before');
            setNotificationDuration(15);
            setShowTodoModal(true);
          }}
          title="Add new todo"
        >
          <Icon icon="mdi:plus" width="18" height="18" />
        </button>
      )}

      {/* Todo Creation/Edit Modal */}
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
                      // Reset height and adjust on mount/update
                      textarea.style.height = 'auto';
                      textarea.style.height = `${textarea.scrollHeight}px`;
                    }
                  }}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-expand textarea
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
                    // Shift+Enter allows new line (default behavior)
                  }}
                  placeholder="What needs to be done?"
                  autoFocus
                  rows={1}
                />
              </div>
              <div className="input-options">
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
                <div className="input-option-group priority-group">
                  <label className="input-option-label">Priority</label>
                  <CustomSelect
                    value={priority}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' }
                    ]}
                    onChange={(val) => setPriority(val as any)}
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

      <DragDropContext 
        onDragEnd={handleDragEnd}
        onDragStart={(start) => {
          console.log('=== DRAG START ===');
          console.log('Drag start:', start);
          console.log('Draggable ID:', start.draggableId);
          console.log('Source droppable:', start.source.droppableId);
          console.log('Source index:', start.source.index);
        }}
      >
        <div className="folders-section">
          {sortedFolders.length === 0 ? (
            <div className="empty-folders-screen">
              <div className="empty-folders-content">
                <div className="empty-folders-icon">
                  <Icon icon="mdi:folder-outline" width="64" height="64" />
                </div>
                <h2 className="empty-folders-title">No Folders Yet</h2>
                <p className="empty-folders-description">
                  Create your first folder to start organizing your tasks
                </p>
                <button
                  className="empty-folders-create-btn"
                  onClick={() => setShowFolderPopup(true)}
                >
                  <Icon icon="mdi:folder-plus" width="20" height="20" />
                  <span>Create Your First Folder</span>
                </button>
              </div>
            </div>
          ) : (
            <Droppable droppableId="folders-list" type="FOLDER" isDropDisabled={false}>
              {(provided, snapshot) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className={`folders-droppable ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                >
                  {sortedFolders.map((folder, index) => {
                  const folderTodos = todosByFolder[folder.id] || [];
                  // Ensure we're using the latest folder object from state
                  const currentFolder = folders.find(f => f.id === folder.id) || folder;
                  return (
                    <Draggable
                      key={currentFolder.id}
                      draggableId={`folder-${currentFolder.id}`}
                      index={index}
                      type="FOLDER"
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`folder-draggable-wrapper ${snapshot.isDragging ? 'dragging' : ''} ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                        >
                          <FolderGroup
                            folder={currentFolder}
                            todos={folderTodos}
                            onToggleCollapse={toggleFolderCollapse}
                            onRenameFolder={renameFolder}
                            onDeleteFolder={deleteFolder}
                            onMoveTodoToFolder={moveTodoToFolder}
                            dragHandleProps={provided.dragHandleProps}
                            renderTodos={(todos, folderId) => {
                  const filtered = filterTodos(todos);
                  return (
                    <>
                      <Droppable droppableId={`folder-${folderId}`} type="TODO">
                        {(provided) => (
                          <ul className="todo-list" {...provided.droppableProps} ref={provided.innerRef}>
                            {filtered.length === 0 ? (
                              <div className="empty-state">
                                <button
                                  className="empty-state-add-btn"
                                  onClick={() => {
                                    setTargetFolderId(folderId);
                                    setEditingTodo(null);
                                    setInput("");
                                    setLabel("");
                                    setDueDate("");
                                    setAttachments([]);
                                    setPriority('medium');
                                    setNotificationEnabled(false);
                                    setNotificationType('before');
                                    setNotificationDuration(15);
                                    setShowTodoModal(true);
                                  }}
                                  title="Add todo to this folder"
                                >
                                  <Icon icon="mdi:plus" width="24" height="24" />
                                </button>
                              </div>
                            ) : (
                              filtered.map((todo, index) => (
                                <Draggable key={todo.id} draggableId={String(todo.id)} index={index} type="TODO">
                                  {(provided, snapshot) => (
                                    <li
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`todo-item-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                                    >
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
                              ))
                            )}
                            {provided.placeholder}
                          </ul>
                        )}
                      </Droppable>
                      {filtered.length > 0 && (
                        <div
                          className="folder-add-todo-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetFolderId(folderId);
                            setEditingTodo(null);
                            setInput("");
                            setLabel("");
                            setDueDate("");
                            setAttachments([]);
                            setPriority('medium');
                            setNotificationEnabled(false);
                            setNotificationType('before');
                            setNotificationDuration(15);
                            setShowTodoModal(true);
                          }}
                          title="Add todo to this folder"
                        >
                          <button
                            className="folder-add-todo-btn-inline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetFolderId(folderId);
                              setEditingTodo(null);
                              setInput("");
                              setLabel("");
                              setDueDate("");
                              setAttachments([]);
                              setPriority('medium');
                              setNotificationEnabled(false);
                              setNotificationType('before');
                              setNotificationDuration(15);
                              setShowTodoModal(true);
                            }}
                            title="Add todo to this folder"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  );
                }}
              />
                        </div>
                      )}
                    </Draggable>
                  );
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
