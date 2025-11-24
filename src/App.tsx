import { useEffect, useState, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import {
  IonApp,
  IonContent,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonDatetime,
  IonDatetimeButton,
  IonSegment,
  IonSegmentButton,
  IonAlert,
  IonLoading,
  IonToast,
  IonReorderGroup,
  IonReorder,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonChip,
  IonNote,
  IonText,
  IonPopover,
  setupIonicReact,
  ItemReorderEventDetail,
} from "@ionic/react";
import { 
  settingsOutline, 
  addOutline, 
  closeOutline, 
  checkmarkOutline,
  trashOutline,
  createOutline,
  folderOutline,
  imageOutline,
  notificationsOutline,
  chevronDownOutline,
  chevronForwardOutline,
  reorderThreeOutline,
} from "ionicons/icons";

// Ionic CSS
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

// Custom theme
import "./theme/ionic-variables.css";
import "./App.css";

import { Todo, FilterType, Theme, Attachment, Folder } from "./types";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { scheduleAllNotifications } from "./utils/notifications";

// Firebase Imports
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import { useFirestoreTodos, useFirestoreFolders } from "./hooks/useFirestore";
import { useFirestoreUndoRedo } from "./hooks/useFirestoreUndoRedo";
import { migrateLocalDataToFirebase } from "./utils/migration";

// Platform detection
import { isMobile, isElectron, configureStatusBar } from "./utils/platform";

// Settings component (will migrate later)
import Settings from "./components/Settings";

// Initialize Ionic
setupIonicReact({
  mode: 'md', // Use Material Design for consistency across platforms
});

const THEME_KEY = "todo_theme";
const SELECTED_FOLDER_KEY = "todo_selected_folder";
const ALWAYS_ON_TOP_KEY = "todo_always_on_top";

// TodoItem Component using Ionic
interface IonicTodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  searchQuery?: string;
}

function IonicTodoItem({ todo, onToggle, onDelete, onEdit, searchQuery }: IonicTodoItemProps) {
  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b', 
    low: '#10b981'
  };

  const isOverdue = todo.dueDate && !todo.done && new Date(todo.dueDate) < new Date();

  return (
    <IonItemSliding className="todo-item-sliding">
      <div 
        className={`todo-item-card ${todo.done ? 'completed' : ''}`}
        style={{ position: 'relative' }}
      >
        {/* Priority indicator */}
        <div 
          className={`priority-indicator priority-${todo.priority}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: `linear-gradient(180deg, ${priorityColors[todo.priority]}, ${priorityColors[todo.priority]}dd)`,
            borderRadius: '12px 0 0 12px',
          }}
        />
        
        <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '16px' }}>
          <IonCheckbox 
            slot="start" 
            checked={todo.done}
            onIonChange={() => onToggle(todo.id)}
            style={{ marginRight: '12px' }}
          />
          <IonLabel style={{ opacity: todo.done ? 0.5 : 1 }}>
            <h2 style={{ 
              margin: '0 0 6px 0', 
              fontSize: '15px', 
              fontWeight: 500,
              textDecoration: todo.done ? 'line-through' : 'none',
              color: todo.done ? 'var(--ion-text-color-step-400)' : 'var(--ion-text-color)'
            }}>
              {todo.text}
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {todo.label && (
                <span style={{
                  background: 'var(--ion-color-primary)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {todo.label}
                </span>
              )}
              {todo.dueDate && (
                <span style={{ 
                  fontSize: '12px', 
                  color: isOverdue ? 'var(--ion-color-danger)' : 'var(--ion-text-color-step-400)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  📅 {new Date(todo.dueDate).toLocaleDateString()}
                </span>
              )}
              {todo.notificationEnabled && (
                <IonIcon 
                  icon={notificationsOutline} 
                  style={{ 
                    fontSize: '14px', 
                    color: 'var(--ion-color-primary)',
                  }} 
                />
              )}
              {todo.attachments && todo.attachments.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>
                  📎 {todo.attachments.length}
                </span>
              )}
            </div>
          </IonLabel>
          <IonButton 
            fill="clear" 
            slot="end" 
            onClick={(e) => { e.stopPropagation(); onEdit(todo); }}
            style={{ '--color': 'var(--ion-text-color-step-400)' }}
          >
            <IonIcon icon={createOutline} />
          </IonButton>
        </IonItem>
      </div>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => onDelete(todo.id)}>
          <IonIcon slot="icon-only" icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
}

// FolderGroup Component using Ionic
interface IonicFolderGroupProps {
  folder: Folder;
  todos: Todo[];
  onToggleCollapse: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  onTodoToggle: (id: number) => void;
  onTodoDelete: (id: number) => void;
  onTodoEdit: (todo: Todo) => void;
  onAddTodo: (folderId: string) => void;
  searchQuery?: string;
}

function IonicFolderGroup({ 
  folder, 
  todos, 
  onToggleCollapse, 
  onRenameFolder,
  onDeleteFolder,
  onTodoToggle, 
  onTodoDelete, 
  onTodoEdit,
  onAddTodo,
  searchQuery 
}: IonicFolderGroupProps) {
  const completedCount = todos.filter(t => t.done).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  return (
    <div className="folder-group animate-fade-in">
      {/* Folder Header */}
      <div 
        className="folder-header"
        onClick={() => onToggleCollapse(folder.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.04) 100%)',
          borderBottom: folder.collapsed ? 'none' : '1px solid var(--ion-border-color)',
        }}
      >
        <IonIcon 
          icon={folder.collapsed ? chevronForwardOutline : chevronDownOutline}
          style={{ 
            fontSize: '18px', 
            marginRight: '12px',
            color: 'var(--ion-color-primary)',
            transition: 'transform 0.2s ease',
          }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: 600,
            color: 'var(--ion-text-color)',
          }}>
            {folder.name}
          </h3>
          {!folder.collapsed && totalCount > 0 && (
            <div style={{ 
              marginTop: '8px',
              height: '4px',
              background: 'var(--ion-background-color-step-200)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--app-gradient)',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: '12px',
        }}>
          <span style={{
            background: completedCount === totalCount && totalCount > 0 
              ? 'var(--ion-color-success)' 
              : 'var(--ion-background-color-step-200)',
            color: completedCount === totalCount && totalCount > 0 
              ? 'white' 
              : 'var(--ion-text-color)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>
      
      {/* Folder Content */}
      {!folder.collapsed && (
        <div className="folder-content" style={{ padding: '12px' }}>
          {todos.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px',
              color: 'var(--ion-text-color-step-400)',
            }}>
              <p style={{ margin: '0 0 12px', fontSize: '14px' }}>No tasks yet</p>
              <IonButton 
                fill="outline" 
                size="small"
                onClick={() => onAddTodo(folder.id)}
              >
                <IonIcon icon={addOutline} slot="start" />
                Add First Task
              </IonButton>
            </div>
          ) : (
            <>
              {todos.map(todo => (
                <IonicTodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onTodoToggle}
                  onDelete={onTodoDelete}
                  onEdit={onTodoEdit}
                  searchQuery={searchQuery}
                />
              ))}
              <IonButton 
                expand="block" 
                fill="clear" 
                onClick={() => onAddTodo(folder.id)}
                style={{ 
                  '--color': 'var(--ion-text-color-step-400)', 
                  marginTop: '8px',
                  '--padding-top': '8px',
                  '--padding-bottom': '8px',
                }}
              >
                <IonIcon icon={addOutline} slot="start" />
                Add Task
              </IonButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Main App Content
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

  // Form state
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationType, setNotificationType] = useState<'before' | 'after' | 'at'>('before');
  const [notificationDuration, setNotificationDuration] = useState(15);

  // UI state
  const [filter, setFilter] = useState<FilterType>('active');
  const [selectedLabel, setSelectedLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<{ id: string, name: string } | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => localStorage.getItem(SELECTED_FOLDER_KEY));

  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme;
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // Desktop-only settings
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

  // Refs
  const datetimeRef = useRef<HTMLIonDatetimeElement>(null);

  // Migration effect
  useEffect(() => {
    const migrateData = async () => {
      if (!user || !window.electronAPI?.loadTodos || !window.electronAPI?.loadFolders) return;
      if (!todosLoading && !foldersLoading && todos.length === 0 && folders.length === 0) {
        setIsMigrating(true);
        try {
          const localTodos = await window.electronAPI.loadTodos();
          const localFolders = await window.electronAPI.loadFolders();
          if ((localTodos && localTodos.length > 0) || (localFolders && localFolders.length > 0)) {
            await migrateLocalDataToFirebase(localTodos || [], localFolders || [], user.uid);
          }
        } catch (error) {
          console.error("Migration failed", error);
        } finally {
          setIsMigrating(false);
        }
      }
    };
    migrateData();
  }, [user, todosLoading, foldersLoading, todos.length, folders.length]);

  // Effects
  useEffect(() => {
    configureStatusBar();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    // Also set Ionic dark mode
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (backgroundImage) localStorage.setItem("todo_background_image", backgroundImage);
    else localStorage.removeItem("todo_background_image");
  }, [backgroundImage]);

  useEffect(() => {
    if (backgroundColor) localStorage.setItem("todo_background_color", backgroundColor);
    else localStorage.removeItem("todo_background_color");
  }, [backgroundColor]);

  useEffect(() => {
    localStorage.setItem("todo_background_overlay_opacity", String(overlayOpacity));
  }, [overlayOpacity]);

  useEffect(() => {
    if (selectedFolderId) localStorage.setItem(SELECTED_FOLDER_KEY, selectedFolderId);
    else localStorage.removeItem(SELECTED_FOLDER_KEY);
  }, [selectedFolderId]);

  useEffect(() => {
    if (todos.length > 0) {
      scheduleAllNotifications(todos).catch(console.error);
    }
  }, [todos]);

  // Electron-specific effects
  useEffect(() => {
    if (isElectron() && (window as any).electronAPI?.setAlwaysOnTop) {
      (window as any).electronAPI.setAlwaysOnTop(alwaysOnTop);
    }
  }, [alwaysOnTop]);

  useEffect(() => {
    if (isElectron() && (window as any).electronAPI?.getLaunchAtStartup) {
      (window as any).electronAPI.getLaunchAtStartup().then(setLaunchAtStartup);
    }
  }, []);

  // Handlers
  const resetForm = useCallback(() => {
    setInput("");
    setLabel("");
    setDueDate(undefined);
    setAttachments([]);
    setPriority('medium');
    setNotificationEnabled(false);
    setNotificationType('before');
    setNotificationDuration(15);
    setEditingTodo(null);
    setTargetFolderId(null);
  }, []);

  const addTodo = useCallback(async () => {
    if (!input.trim()) return;
    
    const folderToUse = targetFolderId || selectedFolderId;

    if (editingTodo) {
      const updates = {
        text: input.trim(),
        priority,
        label: label.trim() || undefined,
        folderId: folderToUse,
        dueDate: dueDate || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        notificationEnabled: notificationEnabled || undefined,
        notificationType: notificationEnabled ? notificationType : undefined,
        notificationDuration: notificationEnabled && notificationType !== 'at' ? notificationDuration : undefined,
      };
      trackAction('update', 'todos', String(editingTodo.id), editingTodo);
      await firestoreUpdateTodo(String(editingTodo.id), updates);
    } else {
      const newTodoData = {
        text: input.trim(),
        done: false,
        priority,
        label: label.trim() || undefined,
        folderId: folderToUse,
        dueDate: dueDate || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        notificationEnabled: notificationEnabled || undefined,
        notificationType: notificationEnabled ? notificationType : undefined,
        notificationDuration: notificationEnabled && notificationType !== 'at' ? notificationDuration : undefined,
      };
      await firestoreAddTodo(newTodoData as any);
    }

    resetForm();
    setShowTodoModal(false);
  }, [input, priority, label, dueDate, attachments, selectedFolderId, targetFolderId, editingTodo, notificationEnabled, notificationType, notificationDuration, firestoreAddTodo, firestoreUpdateTodo, trackAction, resetForm]);

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

  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setInput(todo.text);
    setPriority(todo.priority);
    setLabel(todo.label || '');
    setDueDate(todo.dueDate || undefined);
    setAttachments(todo.attachments || []);
    setTargetFolderId(todo.folderId || null);
    setNotificationEnabled(todo.notificationEnabled || false);
    setNotificationType(todo.notificationType || 'before');
    setNotificationDuration(todo.notificationDuration || 15);
    setShowTodoModal(true);
  }, []);

  // Folder handlers
  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    await firestoreAddFolder({
      name: newFolderName.trim(),
      collapsed: false,
      order: folders.length
    });
    setNewFolderName("");
    setShowFolderModal(false);
  }, [newFolderName, folders.length, firestoreAddFolder]);

  const toggleFolderCollapse = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      await firestoreUpdateFolder(folderId, { collapsed: !folder.collapsed });
    }
  }, [folders, firestoreUpdateFolder]);

  const confirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;
    const folderTodos = todos.filter(t => t.folderId === folderToDelete.id);
    for (const t of folderTodos) {
      await firestoreDeleteTodo(String(t.id));
    }
    await firestoreDeleteFolder(folderToDelete.id);
    setFolderToDelete(null);
    setShowDeleteAlert(false);
  }, [folderToDelete, todos, firestoreDeleteFolder, firestoreDeleteTodo]);

  const clearCompleted = useCallback(() => {
    const completed = todos.filter(t => t.done && !t.isArchived);
    completed.forEach(t => archiveTodo(t.id));
  }, [todos, archiveTodo]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    escape: () => {
      if (showTodoModal) setShowTodoModal(false);
      else if (showFolderModal) setShowFolderModal(false);
    },
    ctrlD: () => setTheme(prev => prev === 'light' ? 'dark' : 'light'),
    ctrlZ: undo,
    ctrlY: redo,
  });

  // Computed values
  const labels = Array.from(new Set(todos.map(t => t.label).filter(Boolean)));
  const completedCount = todos.filter(t => t.done && !t.isArchived).length;
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);
  const todosByFolder = todos.reduce((acc, todo) => {
    if (todo.folderId) {
      if (!acc[todo.folderId]) acc[todo.folderId] = [];
      acc[todo.folderId].push(todo);
    }
    return acc;
  }, {} as Record<string, Todo[]>);

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

  // Loading states
  if (authLoading) {
    return (
      <IonApp>
        <IonLoading isOpen={true} message="Loading..." />
      </IonApp>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <IonApp>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => setShowSettings(true)}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
          <IonSearchbar
            value={searchQuery}
            onIonInput={e => setSearchQuery(e.detail.value || '')}
            placeholder="Search tasks..."
            debounce={300}
          />
          {!isMobile() && isElectron() && (
            <IonButtons slot="end">
              <IonButton onClick={() => (window as any).electronAPI?.minimize()}>
                <span style={{ fontSize: '18px' }}>−</span>
              </IonButton>
              <IonButton onClick={() => (window as any).electronAPI?.close()}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent 
        className="ion-padding"
        style={{
          '--background': hasBackground ? 'transparent' : undefined,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundColor: backgroundColor || undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } as React.CSSProperties}
      >
        {/* Migration banner */}
        {isMigrating && (
          <IonLoading isOpen={true} message="Migrating data to cloud..." />
        )}

        {/* Filter bar */}
        {folders.length > 0 && (
          <IonSegment 
            value={filter} 
            onIonChange={e => setFilter(e.detail.value as FilterType)}
            style={{ marginBottom: '16px' }}
          >
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="active">
              <IonLabel>Active</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="completed">
              <IonLabel>Done</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        )}

        {/* Empty state */}
        {sortedFolders.length === 0 ? (
          <div className="ion-text-center" style={{ padding: '60px 20px' }}>
            <IonIcon 
              icon={folderOutline} 
              style={{ fontSize: '64px', color: 'var(--ion-color-primary)', marginBottom: '16px' }} 
            />
            <h2>No Folders Yet</h2>
            <p style={{ color: 'var(--ion-text-color-step-400)', marginBottom: '24px' }}>
              Create your first folder to start organizing your tasks
            </p>
            <IonButton onClick={() => setShowFolderModal(true)}>
              <IonIcon icon={addOutline} slot="start" />
              Create Folder
            </IonButton>
          </div>
        ) : (
          /* Folder list */
          sortedFolders.map(folder => (
            <IonicFolderGroup
              key={folder.id}
              folder={folder}
              todos={filterTodos(todosByFolder[folder.id] || [])}
              onToggleCollapse={toggleFolderCollapse}
              onRenameFolder={(id, name) => firestoreUpdateFolder(id, { name })}
              onDeleteFolder={(id, name) => {
                setFolderToDelete({ id, name });
                setShowDeleteAlert(true);
              }}
              onTodoToggle={toggleTodo}
              onTodoDelete={archiveTodo}
              onTodoEdit={handleEditTodo}
              onAddTodo={(folderId) => {
                resetForm();
                setTargetFolderId(folderId);
                setShowTodoModal(true);
              }}
              searchQuery={searchQuery}
            />
          ))
        )}

        {/* Add folder button at bottom when folders exist */}
        {folders.length > 0 && (
          <IonButton 
            expand="block" 
            fill="outline" 
            onClick={() => setShowFolderModal(true)}
            style={{ marginTop: '16px', marginBottom: '80px' }}
          >
            <IonIcon icon={addOutline} slot="start" />
            Add Folder
          </IonButton>
        )}
      </IonContent>

      {/* FAB for adding todo */}
      {folders.length > 0 && (
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => {
            resetForm();
            setShowTodoModal(true);
          }}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      )}

      {/* Todo Modal */}
      <IonModal isOpen={showTodoModal} onDidDismiss={() => setShowTodoModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowTodoModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
            <IonLabel slot="start" style={{ marginLeft: '8px', fontWeight: 600 }}>
              {editingTodo ? 'Edit Task' : 'New Task'}
            </IonLabel>
            <IonButtons slot="end">
              <IonButton strong onClick={addTodo} disabled={!input.trim()}>
                <IonIcon icon={checkmarkOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonList>
            {/* Task text */}
            <IonItem lines="none">
              <IonTextarea
                value={input}
                onIonInput={e => setInput(e.detail.value || '')}
                placeholder="What needs to be done?"
                autoGrow
                rows={2}
                style={{ fontSize: '16px' }}
              />
            </IonItem>

            {/* Folder selection */}
            <IonItem>
              <IonLabel>Folder</IonLabel>
              <IonSelect 
                value={targetFolderId || selectedFolderId || ''} 
                onIonChange={e => {
                  setTargetFolderId(e.detail.value);
                  setSelectedFolderId(e.detail.value);
                }}
                interface="action-sheet"
              >
                {folders.map(f => (
                  <IonSelectOption key={f.id} value={f.id}>{f.name}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Priority */}
            <IonItem>
              <IonLabel>Priority</IonLabel>
              <IonSelect 
                value={priority} 
                onIonChange={e => setPriority(e.detail.value)}
                interface="action-sheet"
              >
                <IonSelectOption value="low">Low</IonSelectOption>
                <IonSelectOption value="medium">Medium</IonSelectOption>
                <IonSelectOption value="high">High</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Label */}
            <IonItem>
              <IonLabel position="stacked">Label</IonLabel>
              <IonInput
                value={label}
                onIonInput={e => setLabel(e.detail.value || '')}
                placeholder="Add a label..."
              />
            </IonItem>

            {/* Due Date */}
            <IonItem>
              <IonLabel>Due Date</IonLabel>
              <IonDatetimeButton datetime="datetime" />
              <IonModal keepContentsMounted={true}>
                <IonDatetime 
                  id="datetime"
                  ref={datetimeRef}
                  value={dueDate}
                  onIonChange={e => {
                    const val = e.detail.value;
                    setDueDate(typeof val === 'string' ? val : undefined);
                  }}
                  presentation="date-time"
                  showDefaultButtons={true}
                  doneText="Done"
                  cancelText="Clear"
                  onIonCancel={() => setDueDate(undefined)}
                />
              </IonModal>
            </IonItem>

            {/* Notification toggle */}
            <IonItem>
              <IonLabel>Notification</IonLabel>
              <IonCheckbox 
                slot="end" 
                checked={notificationEnabled}
                onIonChange={e => setNotificationEnabled(e.detail.checked)}
                disabled={!dueDate}
              />
            </IonItem>

            {notificationEnabled && dueDate && (
              <>
                <IonItem>
                  <IonLabel>Notify</IonLabel>
                  <IonSelect 
                    value={notificationType} 
                    onIonChange={e => setNotificationType(e.detail.value)}
                    interface="popover"
                  >
                    <IonSelectOption value="before">Before</IonSelectOption>
                    <IonSelectOption value="at">At time</IonSelectOption>
                    <IonSelectOption value="after">After</IonSelectOption>
                  </IonSelect>
                </IonItem>
                {notificationType !== 'at' && (
                  <IonItem>
                    <IonLabel>Duration</IonLabel>
                    <IonSelect 
                      value={notificationDuration} 
                      onIonChange={e => setNotificationDuration(e.detail.value)}
                      interface="popover"
                    >
                      <IonSelectOption value={5}>5 min</IonSelectOption>
                      <IonSelectOption value={10}>10 min</IonSelectOption>
                      <IonSelectOption value={15}>15 min</IonSelectOption>
                      <IonSelectOption value={30}>30 min</IonSelectOption>
                      <IonSelectOption value={60}>1 hour</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                )}
              </>
            )}

            {/* Attachments */}
            <IonItem lines="none" style={{ marginTop: '16px' }}>
              <IonLabel position="stacked">Attachments</IonLabel>
            </IonItem>
            <IonItem lines="none">
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                id="attachment-input-ionic"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const url = ev.target?.result as string;
                      setAttachments(prev => [...prev, { 
                        id: `${Date.now()}-${Math.random()}`, 
                        type: 'image', 
                        url, 
                        name: file.name 
                      }]);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />
              <IonButton fill="outline" onClick={() => document.getElementById('attachment-input-ionic')?.click()}>
                <IonIcon icon={imageOutline} slot="start" />
                Add Images
              </IonButton>
            </IonItem>

            {attachments.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 16px' }}>
                {attachments.map((att, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img 
                      src={att.url} 
                      alt={att.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        borderRadius: '8px' 
                      }} 
                    />
                    <IonButton
                      fill="solid"
                      color="danger"
                      size="small"
                      style={{ 
                        position: 'absolute', 
                        top: '-8px', 
                        right: '-8px',
                        '--padding-start': '4px',
                        '--padding-end': '4px',
                        '--border-radius': '50%',
                        width: '24px',
                        height: '24px',
                      }}
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <IonIcon icon={closeOutline} />
                    </IonButton>
                  </div>
                ))}
              </div>
            )}
          </IonList>
        </IonContent>
      </IonModal>

      {/* Folder Creation Modal */}
      <IonModal isOpen={showFolderModal} onDidDismiss={() => setShowFolderModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowFolderModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
            <IonLabel slot="start" style={{ marginLeft: '8px', fontWeight: 600 }}>
              New Folder
            </IonLabel>
            <IonButtons slot="end">
              <IonButton strong onClick={createFolder} disabled={!newFolderName.trim()}>
                <IonIcon icon={checkmarkOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Folder Name</IonLabel>
            <IonInput
              value={newFolderName}
              onIonInput={e => setNewFolderName(e.detail.value || '')}
              placeholder="Enter folder name..."
              onKeyDown={e => {
                if (e.key === 'Enter') createFolder();
              }}
            />
          </IonItem>
        </IonContent>
      </IonModal>

      {/* Delete Folder Alert */}
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header="Delete Folder"
        message={`Delete folder "${folderToDelete?.name}"? All tasks in this folder will be deleted.`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Delete', role: 'destructive', handler: confirmDeleteFolder }
        ]}
      />

      {/* Settings Modal (using existing component for now) */}
      <Settings
        todos={todos}
        onDelete={deleteTodo}
        onRestore={restoreTodo}
        onClearArchived={() => {}}
        theme={theme}
        onThemeChange={setTheme}
        alwaysOnTop={alwaysOnTop}
        onAlwaysOnTopChange={(v) => {
          setAlwaysOnTop(v);
          localStorage.setItem(ALWAYS_ON_TOP_KEY, String(v));
          if (isElectron() && (window as any).electronAPI?.setAlwaysOnTop) {
            (window as any).electronAPI.setAlwaysOnTop(v);
          }
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
          if (isElectron() && (window as any).electronAPI?.setLaunchAtStartup) {
            (window as any).electronAPI.setLaunchAtStartup(v);
          }
        }}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onExport={() => {}}
        onImport={() => {}}
        folders={folders}
        onCreateFolder={(name) => {
          firestoreAddFolder({ name, collapsed: false, order: folders.length });
        }}
        onLogout={logout}
      />
    </IonApp>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
