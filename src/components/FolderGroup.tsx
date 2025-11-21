import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Folder, Todo } from '../types';
import './FolderGroup.css';

type FolderGroupProps = {
  folder: Folder;
  todos: Todo[];
  onToggleCollapse: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveTodoToFolder: (todoId: number, folderId: string | null) => void;
  onAddTodo: (folderId: string) => void;
  renderTodos: (todos: Todo[], folderId: string) => JSX.Element;
};

export default function FolderGroup({
  folder,
  todos,
  onToggleCollapse,
  onRenameFolder,
  onDeleteFolder,
  onMoveTodoToFolder,
  onAddTodo,
  renderTodos
}: FolderGroupProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  // Sync renameValue with folder.name when folder changes
  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(folder.name);
    }
  }, [folder.name, folder.id, isRenaming]);

  const handleRename = (e?: React.FocusEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmedValue = renameValue.trim();
    if (trimmedValue && trimmedValue !== folder.name) {
      // Call the rename callback
      onRenameFolder(folder.id, trimmedValue);
      // Update local state immediately for better UX
      setRenameValue(trimmedValue);
    } else if (!trimmedValue) {
      // If empty, reset to original name
      setRenameValue(folder.name);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename(e);
    } else if (e.key === 'Escape') {
      setRenameValue(folder.name);
      setIsRenaming(false);
    }
  };

  // todos prop is already filtered to this folder, so use it directly
  const activeCount = todos.filter(t => !t.done).length;
  const totalCount = todos.length;

  return (
    <div className="folder-group">
      <div 
        className="folder-header"
        onClick={() => onToggleCollapse(folder.id)}
      >
        <button className="folder-toggle">
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="none"
            className={folder.collapsed ? 'collapsed' : ''}
          >
            <path 
              d="M4.5 3L7.5 6L4.5 9" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {isRenaming ? (
          <input
            className="folder-name-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={(e) => {
              // Use setTimeout to ensure click events process first
              setTimeout(() => {
                handleRename(e);
              }, 200);
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <>
            <span 
              className="folder-name"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
            >
              {folder.name}
            </span>
            <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="folder-action-btn"
                onClick={() => {
                  setRenameValue(folder.name);
                  setIsRenaming(true);
                }}
                title="Rename folder"
              >
                <Icon icon="mdi:pencil" width="16" height="16" />
              </button>
              <button
                className="folder-action-btn delete"
                onClick={() => {
                  if (confirm(`Delete folder "${folder.name}"? Todos will be moved to Uncategorized.`)) {
                    todos.forEach(todo => onMoveTodoToFolder(todo.id, null));
                    onDeleteFolder(folder.id);
                  }
                }}
                title="Delete folder"
              >
                <Icon icon="mdi:delete" width="16" height="16" />
              </button>
            </div>
            <span className="folder-count">
              {activeCount}/{totalCount}
            </span>
          </>
        )}
      </div>
      {!folder.collapsed && (
        <div className="folder-content">
          {renderTodos(todos, folder.id)}
          {todos.length > 0 && (
            <button 
              className="folder-add-todo-btn-inline"
              onClick={(e) => {
                e.stopPropagation();
                onAddTodo(folder.id);
              }}
              title="Add todo to this folder"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

