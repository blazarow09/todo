import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Todo, Attachment } from '../types';
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
  const [showAttachments, setShowAttachments] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
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
          // Handle dropped URL/image
          item.getAsString((url) => {
            if (!urlProcessed && url && (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:image'))) {
              urlProcessed = true;
              const newAttachment: Attachment = {
                id: String(Date.now()),
                type: 'image',
                url: url,
                name: 'Image'
              };
              const currentAttachments = todo.attachments || [];
              onUpdate(todo.id, { attachments: [...currentAttachments, newAttachment] });
            }
          });
        }
      }
    }
    
    // Process files
    if (files.length > 0) {
      for (const file of files) {
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
            const currentAttachments = todo.attachments || [];
            onUpdate(todo.id, { attachments: [...currentAttachments, newAttachment] });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasImage = Array.from(e.dataTransfer.items).some(item => 
      item.kind === 'file' && item.type.startsWith('image/')
    ) || e.dataTransfer.types.includes('text/uri-list');
    
    if (hasImage) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasImage = Array.from(e.dataTransfer.items).some(item => 
      item.kind === 'file' && item.type.startsWith('image/')
    ) || e.dataTransfer.types.includes('text/uri-list');
    
    if (hasImage) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the todo-item itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const currentAttachments = todo.attachments || [];
    onUpdate(todo.id, { 
      attachments: currentAttachments.filter(a => a.id !== attachmentId) 
    });
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

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use Electron API if available, otherwise use window.open
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const parseTextWithLinks = (text: string, query?: string) => {
    // URL regex pattern - matches http://, https://, and www.
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
    const parts: (string | JSX.Element)[] = [];
    
    // First, find all URLs
    const urlMatches: Array<{ index: number; url: string; fullUrl: string }> = [];
    const urlRegexCopy = new RegExp(urlRegex);
    let match;
    while ((match = urlRegexCopy.exec(text)) !== null) {
      const url = match[0];
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      urlMatches.push({
        index: match.index,
        url: url,
        fullUrl: fullUrl
      });
    }

    // If no URLs and no query, return plain text
    if (urlMatches.length === 0 && !query) {
      return text;
    }

    // Process text with both URLs and search query
    let currentIndex = 0;
    const allMatches: Array<{ index: number; length: number; type: 'url' | 'query'; value: string; fullUrl?: string }> = [];

    // Add URL matches
    urlMatches.forEach(m => {
      allMatches.push({
        index: m.index,
        length: m.url.length,
        type: 'url',
        value: m.url,
        fullUrl: m.fullUrl
      });
    });

    // Add search query matches if exists
    if (query && query.trim()) {
      const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const queryRegexCopy = new RegExp(queryRegex);
      let queryMatch;
      while ((queryMatch = queryRegexCopy.exec(text)) !== null) {
        // Check if this query match overlaps with any URL match
        const queryStart = queryMatch.index;
        const queryEnd = queryStart + queryMatch[0].length;
        const overlapsWithUrl = urlMatches.some(urlMatch => {
          const urlStart = urlMatch.index;
          const urlEnd = urlStart + urlMatch.url.length;
          return (queryStart >= urlStart && queryStart < urlEnd) || 
                 (queryEnd > urlStart && queryEnd <= urlEnd) ||
                 (queryStart <= urlStart && queryEnd >= urlEnd);
        });
        
        if (!overlapsWithUrl) {
          allMatches.push({
            index: queryMatch.index,
            length: queryMatch[0].length,
            type: 'query',
            value: queryMatch[0]
          });
        }
      }
    }

    // Sort matches by index
    allMatches.sort((a, b) => a.index - b.index);

    // Build the parts array
    allMatches.forEach((match, i) => {
      // Add text before match
      if (match.index > currentIndex) {
        const beforeText = text.substring(currentIndex, match.index);
        if (beforeText) {
          parts.push(beforeText);
        }
      }

      // Add the match
      if (match.type === 'url') {
        parts.push(
          <a
            key={`link-${i}`}
            href={match.fullUrl}
            onClick={(e) => handleLinkClick(e, match.fullUrl!)}
            className="todo-link"
            title={match.fullUrl}
          >
            {match.value}
          </a>
        );
      } else if (match.type === 'query') {
        parts.push(
          <mark key={`query-${i}`} className="highlight">{match.value}</mark>
        );
      }

      currentIndex = match.index + match.length;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }

    return parts.length > 0 ? parts : text;
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
    <div 
      className={`todo-item ${todo.done ? 'done' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <label className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo.id)}
          className="checkbox"
        />
        <span className="checkmark"></span>
        <span className={`priority-dot priority-${todo.priority}`}></span>
      </label>
      <div className="todo-content" onDoubleClick={handleDoubleClick}>
        <div className="todo-text-row">
          <span className="todo-text">{parseTextWithLinks(todo.text, searchQuery)}</span>
          <div className="todo-actions-row">
            {todo.notes && (
              <button className="action-btn notes-toggle" onClick={() => setShowNotes(!showNotes)} title="Notes">
                📝
              </button>
            )}
          </div>
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
        {todo.attachments && todo.attachments.length > 0 && (
          <div className="attachments-grid">
            {todo.attachments.map(att => (
              <div 
                key={att.id} 
                className="attachment-tile" 
                onClick={() => setLightboxUrl(att.url)}
              >
                <img src={att.url} alt={att.name || 'Attachment'} loading="lazy" />
                <button 
                  className="attachment-remove" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAttachment(att.id);
                  }}
                >
                  <Icon icon="mdi:close" width="12" height="12" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="delete-btn" onClick={() => onDelete(todo.id)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4L14 14M4 14L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Full size" />
            <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>
              <Icon icon="mdi:close" width="24" height="24" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

