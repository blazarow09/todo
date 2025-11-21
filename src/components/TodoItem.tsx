import { useState } from 'react';
import { Todo } from '../types';
import './TodoItem.css';

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: number) => void;
  onUpdate: (id: number, updates: Partial<Todo>) => void;
  onDelete: (id: number) => void;
  searchQuery?: string;
};

export default function TodoItem({ todo, onToggle, onUpdate, onDelete, searchQuery }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showNotes, setShowNotes] = useState(false);
  const [editNotes, setEditNotes] = useState(todo.notes || '');

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditText(todo.text);
  };

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(todo.id, { text: editText.trim(), notes: editNotes || undefined });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(todo.text);
    setEditNotes(todo.notes || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const isOverdue = todo.dueDate && !todo.done && new Date(todo.dueDate) < new Date();
  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  };

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="highlight">{part}</mark>
      ) : part
    );
  };

  if (isEditing) {
    return (
      <div className="todo-item editing">
        <div className="edit-container">
          <input
            className="edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="edit-actions">
            <button className="save-btn" onClick={handleSave}>Save</button>
            <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
          </div>
          {showNotes && (
            <textarea
              className="edit-notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes..."
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowNotes(false);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`todo-item ${todo.done ? 'done' : ''}`}>
      <div className="priority-indicator" style={{ backgroundColor: priorityColors[todo.priority] }} />
      <label className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo.id)}
          className="checkbox"
        />
        <span className="checkmark"></span>
      </label>
      <div className="todo-content" onDoubleClick={handleDoubleClick}>
        <div className="todo-text-row">
          <span className="todo-text">{highlightText(todo.text, searchQuery)}</span>
          {todo.notes && (
            <button className="notes-toggle" onClick={() => setShowNotes(!showNotes)}>
              📝
            </button>
          )}
        </div>
        <div className="todo-meta">
          {todo.label && (
            <span className="label-badge">{todo.label}</span>
          )}
          {todo.dueDate && (
            <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
              {new Date(todo.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {showNotes && todo.notes && (
          <div className="notes-display">{todo.notes}</div>
        )}
      </div>
      <button className="delete-btn" onClick={() => onDelete(todo.id)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4L14 14M4 14L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

