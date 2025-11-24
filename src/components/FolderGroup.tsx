import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Folder, Todo } from '../types';
import './FolderGroup.css';

type FolderGroupProps = {
  folder: Folder;
  todos: Todo[];
  onToggleCollapse: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  onMoveTodoToFolder: (todoId: number, folderId: string | null) => void;
  dragHandleProps?: any;
  renderTodos: (todos: Todo[], folderId: string) => JSX.Element;
};

export default function FolderGroup({
  folder,
  todos,
  onToggleCollapse,
  onRenameFolder,
  onDeleteFolder,
  onMoveTodoToFolder,
  dragHandleProps,
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
  // Exclude archived tasks from counts
  const activeTodos = todos.filter(t => !t.isArchived);
  const completedCount = activeTodos.filter(t => t.done).length;
  const totalCount = activeTodos.length;

  return (
    <div className="folder-group">
      <div 
        className={`folder-header ${dragHandleProps ? 'draggable' : ''}`}
        onClick={() => onToggleCollapse(folder.id)}
        {...(dragHandleProps || {})}
      >
        <button 
          className="folder-toggle"
          onMouseDown={(e) => e.stopPropagation()}
        >
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
            <div 
              className="folder-actions" 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="folder-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameValue(folder.name);
                  setIsRenaming(true);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Rename folder"
              >
                <Icon icon="mdi:pencil" width="16" height="16" />
              </button>
              <button
                className="folder-action-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id, folder.name);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Delete folder"
              >
                <Icon icon="mdi:delete" width="16" height="16" />
              </button>
            </div>
            <span className="folder-count">
              {completedCount}/{totalCount}
            </span>
          </>
        )}
      </div>
      {!folder.collapsed && (
        <div className="folder-content">
          {renderTodos(todos, folder.id)}
        </div>
      )}
    </div>
  );
}

