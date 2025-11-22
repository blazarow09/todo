import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Icon } from "@iconify/react";
import "./App.css";
import "./themes.css";
import { Todo, FilterType, Theme, Folder } from "./types";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { exportTodos, importTodos } from "./utils/storage";
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

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    // Optimize: Use try-catch only around JSON.parse, check for null first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const loaded = JSON.parse(raw);
      // Use for loop instead of map for better performance with large arrays
      const result: Todo[] = [];
      for (let i = 0; i < loaded.length; i++) {
        const todo = loaded[i];
        result.push({
          ...todo,
          priority: todo.priority || 'medium',
          label: todo.label || todo.category || '',
          folderId: todo.folderId || null,
          createdAt: todo.createdAt || todo.id,
        });
      }
      return result;
    } catch (e) {
      console.error('Failed to load todos:', e);
      return [];
    }
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    const foldersRaw = localStorage.getItem(FOLDERS_KEY);
    let loadedFolders: Folder[] = [];
    if (foldersRaw) {
      try {
        loadedFolders = JSON.parse(foldersRaw);
      } catch (e) {
        console.error('Failed to load folders:', e);
      }
    }
    const hasUncategorized = loadedFolders.some((f: Folder) => f.id === 'uncategorized');
    if (!hasUncategorized) {
      return [{
        id: 'uncategorized',
        name: 'Uncategorized',
        collapsed: false,
        order: 0
      }, ...loadedFolders];
    }
    return loadedFolders;
  });

  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<FilterType>('active');
  const [selectedLabel, setSelectedLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    return saved === 'uncategorized' ? null : saved;
  });

  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
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

  // Save todos to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // Save folders to localStorage (ensure Uncategorized always exists)
  useEffect(() => {
    if (folders.length > 0) {
      const hasUncategorized = folders.some(f => f.id === 'uncategorized');
      const foldersToSave = hasUncategorized ? folders : [
        {
          id: 'uncategorized',
          name: 'Uncategorized',
          collapsed: false,
          order: 0
        },
        ...folders
      ];
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(foldersToSave));
    }
  }, [folders]);

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
    const folderIdToSave = selectedFolderId || 'uncategorized';
    localStorage.setItem(SELECTED_FOLDER_KEY, folderIdToSave);
  }, [selectedFolderId]);

  // Auto-expand folders with search matches
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    const foldersToExpand: string[] = [];

    // Group todos by folder
    const todosByFolderMap = todos.reduce((acc, todo) => {
      const folderId = todo.folderId || 'uncategorized';
      if (!acc[folderId]) acc[folderId] = [];
      acc[folderId].push(todo);
      return acc;
    }, {} as Record<string, Todo[]>);

    // Ensure "Uncategorized" folder exists
    const foldersWithUncategorized = (() => {
      const hasUncategorized = folders.some(f => f.id === 'uncategorized');
      if (!hasUncategorized) {
        const defaultFolder: Folder = {
          id: 'uncategorized',
          name: 'Uncategorized',
          collapsed: false,
          order: 0
        };
        return [defaultFolder, ...folders];
      }
      return folders;
    })();

    // Check each folder for matching todos
    foldersWithUncategorized.forEach(folder => {
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
    const folderToUse = folderIdOverride !== undefined ? folderIdOverride : (selectedFolderId || 'uncategorized');
    if (!input.trim()) return;
    const newTodo: Todo = {
      id: Date.now(),
      text: input.trim(),
      done: false,
      priority,
      label: label.trim(),
      folderId: folderToUse,
      dueDate: dueDate || undefined,
      createdAt: Date.now(),
    };
    const newTodos = [...todos, newTodo];
    setTodos(newTodos);
    addToHistory(newTodos, 'add');
    setInput("");
    setLabel("");
    setDueDate("");
    setPriority('medium');
    setShowTodoModal(false);
    setTargetFolderId(null);
    // Keep the selected folder (don't reset) - it's saved to localStorage
  }, [input, priority, label, dueDate, selectedFolderId, todos, addToHistory]);

  const updateTodo = useCallback((id: number, updates: Partial<Todo>) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, ...updates } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'update');
    setEditingId(null);
  }, [todos, addToHistory]);

  const toggleTodo = useCallback((id: number) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(newTodos);
    addToHistory(newTodos, 'toggle');
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
    if (!result.destination) return;

    const sourceDroppableId = result.source.droppableId;
    const destDroppableId = result.destination.droppableId;
    const todoId = parseInt(result.draggableId);

    // Check if moving between folders
    if (sourceDroppableId !== destDroppableId) {
      if (destDroppableId.startsWith('folder-')) {
        const folderId = destDroppableId.replace('folder-', '');
        const newTodos = todos.map(t =>
          t.id === todoId ? { ...t, folderId: folderId === 'uncategorized' ? null : folderId } : t
        );
        setTodos(newTodos);
        addToHistory(newTodos, 'update');
      }
      return;
    }

    // Reordering within same folder
    const folderId = sourceDroppableId.replace('folder-', '');
    const folderTodos = todos.filter(t => {
      const tFolderId = t.folderId || 'uncategorized';
      return tFolderId === folderId;
    });
    const otherTodos = todos.filter(t => {
      const tFolderId = t.folderId || 'uncategorized';
      return tFolderId !== folderId;
    });

    const items = Array.from(folderTodos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTodos([...otherTodos, ...items]);
    addToHistory([...otherTodos, ...items], 'reorder');
  }, [todos, addToHistory]);

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

    setFolders(prevFolders => {
      // If renaming "Uncategorized", ensure it still exists in the array
      const hasUncategorized = prevFolders.some(f => f.id === 'uncategorized');
      let updated = prevFolders.map(f =>
        f.id === folderId ? { ...f, name: newName.trim() } : f
      );

      // If "Uncategorized" was renamed and doesn't exist anymore, add it back
      if (folderId === 'uncategorized' && !updated.some(f => f.id === 'uncategorized')) {
        updated = [
          { id: 'uncategorized', name: newName.trim(), collapsed: false, order: 0 },
          ...updated.filter(f => f.id !== 'uncategorized')
        ];
      }

      // Force update by creating new array reference
      return [...updated];
    });
  }, []);

  const deleteFolder = useCallback((folderId: string, folderName: string) => {
    // Prevent deletion of "Uncategorized" folder
    if (folderId === 'uncategorized') return;
    setFolderToDelete({ id: folderId, name: folderName });
  }, []);

  const confirmDeleteFolder = useCallback(() => {
    if (!folderToDelete) return;

    // Move todos to Uncategorized
    const newTodos = todos.map(t =>
      t.folderId === folderToDelete.id ? { ...t, folderId: null } : t
    );

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

  // Ensure "Uncategorized" folder exists in folders array
  const foldersWithUncategorized = (() => {
    const hasUncategorized = folders.some(f => f.id === 'uncategorized');
    if (!hasUncategorized) {
      const defaultFolder: Folder = {
        id: 'uncategorized',
        name: 'Uncategorized',
        collapsed: false,
        order: 0
      };
      return [defaultFolder, ...folders];
    }
    return folders;
  })();

  // Group todos by folder
  const todosByFolder = todos.reduce((acc, todo) => {
    const folderId = todo.folderId || 'uncategorized';
    if (!acc[folderId]) acc[folderId] = [];
    acc[folderId].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  // Get sorted folders (ensure Uncategorized is first)
  const sortedFolders = [...foldersWithUncategorized].sort((a, b) => {
    if (a.id === 'uncategorized') return -1;
    if (b.id === 'uncategorized') return 1;
    return a.order - b.order;
  });

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
                Delete folder "<strong>{folderToDelete.name}</strong>"? Todos will be moved to Uncategorized.
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

      <FilterBar
        filter={filter}
        labels={labels}
        selectedLabel={selectedLabel}
        onLabelChange={setSelectedLabel}
        onFilterChange={setFilter}
        onClearCompleted={clearCompleted}
        hasCompleted={completedCount > 0}
      />

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
      <button
        className="fab-add-todo"
        onClick={() => {
          setTargetFolderId(null);
          setShowTodoModal(true);
        }}
        title="Add new todo"
      >
        <Icon icon="mdi:plus" width="18" height="18" />
      </button>

      {/* Todo Creation Modal */}
      {showTodoModal && (
        <div className="todo-modal-overlay" onClick={() => setShowTodoModal(false)}>
          <div className="todo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="todo-modal-header">
              <h3>Create New Todo</h3>
              <button className="todo-modal-close" onClick={() => setShowTodoModal(false)}>×</button>
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
                      setShowTodoModal(false);
                    }
                    // Shift+Enter allows new line (default behavior)
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
                <div className="input-option-group date-group">
                  <label className="input-option-label">Due date</label>
                  <DatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Due date"
                    className="date-input"
                  />
                </div>
                <div className="input-option-group folder-group">
                  <label className="input-option-label">Folder</label>
                  <CustomSelect
                    value={targetFolderId || selectedFolderId || 'uncategorized'}
                    options={foldersWithUncategorized.map(f => ({
                      value: f.id,
                      label: f.name
                    }))}
                    onChange={(val) => {
                      const folderId = val === 'uncategorized' ? null : val;
                      setTargetFolderId(folderId);
                      setSelectedFolderId(folderId);
                    }}
                    placeholder="Folder"
                    className="folder-select"
                  />
                </div>
              </div>
              <div className="todo-modal-actions">
                <button className="todo-modal-cancel" onClick={() => setShowTodoModal(false)}>
                  Cancel
                </button>
                <button
                  className="todo-modal-create"
                  onClick={() => addTodo(targetFolderId)}
                  disabled={!input.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="folders-section">
          {sortedFolders.map((folder) => {
            const folderTodos = todosByFolder[folder.id] || [];
            // Ensure we're using the latest folder object from state
            const currentFolder = folders.find(f => f.id === folder.id) || folder;
            return (
              <FolderGroup
                key={currentFolder.id}
                folder={currentFolder}
                todos={folderTodos}
                onToggleCollapse={toggleFolderCollapse}
                onRenameFolder={renameFolder}
                onDeleteFolder={deleteFolder}
                onMoveTodoToFolder={moveTodoToFolder}
                renderTodos={(todos, folderId) => {
                  const filtered = filterTodos(todos);
                  return (
                    <>
                      <Droppable droppableId={`folder-${folderId}`}>
                        {(provided) => (
                          <ul className="todo-list" {...provided.droppableProps} ref={provided.innerRef}>
                            {filtered.length === 0 ? (
                              <div className="empty-state">
                                <button
                                  className="empty-state-add-btn"
                                  onClick={() => {
                                    setTargetFolderId(folderId === 'uncategorized' ? null : folderId);
                                    setShowTodoModal(true);
                                  }}
                                  title="Add todo to this folder"
                                >
                                  <Icon icon="mdi:plus" width="24" height="24" />
                                </button>
                              </div>
                            ) : (
                              filtered.map((todo, index) => (
                                <Draggable key={todo.id} draggableId={String(todo.id)} index={index}>
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
                            setShowTodoModal(true);
                          }}
                          title="Add todo to this folder"
                        >
                          <button
                            className="folder-add-todo-btn-inline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetFolderId(folderId);
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
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
