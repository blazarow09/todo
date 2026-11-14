import { useState } from 'react';
import { Icon } from '@iconify/react';
import { ChecklistItem } from '../types';
import './ChecklistEditor.css';

type ChecklistEditorProps = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
};

export default function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [newItemText, setNewItemText] = useState('');

  const addItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    onChange([...items, { id: crypto.randomUUID(), text, done: false }]);
    setNewItemText('');
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    onChange(items.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  return (
    <div className="checklist-editor">
      {items.length > 0 && (
        <ul className="checklist-editor-list">
          {items.map(item => (
            <li key={item.id} className={`checklist-editor-item ${item.done ? 'done' : ''}`}>
              <input
                type="checkbox"
                className="checklist-editor-checkbox"
                checked={item.done}
                onChange={(e) => updateItem(item.id, { done: e.target.checked })}
                aria-label={`Mark "${item.text}" as ${item.done ? 'not done' : 'done'}`}
              />
              <input
                type="text"
                className="checklist-editor-text"
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                onBlur={() => {
                  if (!item.text.trim()) removeItem(item.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
              <button
                type="button"
                className="checklist-editor-remove"
                onClick={() => removeItem(item.id)}
                title="Remove item"
                aria-label={`Remove "${item.text}"`}
              >
                <Icon icon="mdi:close" width="14" height="14" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="checklist-editor-add">
        <Icon icon="mdi:plus" width="16" height="16" />
        <input
          type="text"
          className="checklist-editor-add-input"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          // Keep an item typed but not yet confirmed when the user clicks Save/Create
          onBlur={addItem}
          placeholder="Add an item"
          aria-label="New checklist item"
        />
      </div>
    </div>
  );
}
