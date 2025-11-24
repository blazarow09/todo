import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Todo, Theme, Folder } from '../types';
import './Settings.css';

type SettingsProps = {
  todos: Todo[];
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  alwaysOnTop: boolean;
  onAlwaysOnTopChange: (value: boolean) => void;
  launchAtStartup: boolean;
  onLaunchAtStartupChange: (value: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onClearArchived: () => void;
  folders: Folder[];
  onCreateFolder: (name: string) => void;
  backgroundImage: string | null;
  onBackgroundImageChange: (image: string | null) => void;
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
  backgroundOverlayOpacity: number;
  onBackgroundOverlayOpacityChange: (opacity: number) => void;
};

export default function Settings({
  todos,
  theme,
  onThemeChange,
  alwaysOnTop,
  onAlwaysOnTopChange,
  launchAtStartup,
  onLaunchAtStartupChange,
  isOpen,
  onClose,
  onExport,
  onImport,
  onDelete,
  onRestore,
  onClearArchived,
  folders,
  onCreateFolder,
  backgroundImage,
  onBackgroundImageChange,
  backgroundColor,
  onBackgroundColorChange,
  backgroundOverlayOpacity,
  onBackgroundOverlayOpacityChange,
}: SettingsProps) {
  const [view, setView] = useState<'settings' | 'archived'>('settings');
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleSelectImage = async () => {
    if ((window as any).electronAPI?.selectImage) {
      const result = await (window as any).electronAPI.selectImage();
      if (result.success) {
        onBackgroundImageChange(result.url);
      }
    } else {
      // Fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            onBackgroundImageChange(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  if (!isOpen) return null;

  const nonArchivedTodos = todos.filter(t => !t.isArchived);
  const archivedTodos = todos.filter(t => t.isArchived);

  const total = nonArchivedTodos.length;
  const completed = nonArchivedTodos.filter(t => t.done).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const highPriority = nonArchivedTodos.filter(t => !t.done && t.priority === 'high').length;
  const overdue = nonArchivedTodos.filter(t =>
    !t.done && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const handleClose = () => {
    setView('settings');
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="header-title-group">
            {view === 'archived' && (
              <button className="settings-back-btn" onClick={() => setView('settings')}>
                <Icon icon="mdi:arrow-left" width="20" height="20" />
              </button>
            )}
            <h3>{view === 'archived' ? 'Archived' : 'Settings'}</h3>
          </div>
          <div className="header-actions">
            {view === 'archived' && archivedTodos.length > 0 && (
              <button
                className="clear-all-btn"
                onClick={onClearArchived}
                title="Clear all archived todos"
              >
                Clear All
              </button>
            )}
            <button className="settings-close" onClick={handleClose}>
              <Icon icon="mdi:close" width="20" height="20" />
            </button>
          </div>
        </div>
        <div className="settings-content">
          {view === 'settings' ? (
            <>
              <div className="settings-section">
                <h4>Appearance</h4>
                <div className="settings-item">
                  <label>Theme</label>
                  <button
                    className="theme-toggle-btn"
                    onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                  >
                    <Icon icon={theme === 'light' ? 'mdi:weather-night' : 'mdi:weather-sunny'} width="20" height="20" />
                    <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
                  </button>
                </div>
                <div className="settings-item">
                  <label>Background Color</label>
                  <div className="background-color-picker">
                    <input
                      type="color"
                      value={backgroundColor || "#ffffff"}
                      onChange={(e) => onBackgroundColorChange(e.target.value)}
                    />
                    {backgroundColor && (
                      <button onClick={() => onBackgroundColorChange(null)} className="reset-color-btn" title="Reset Color">
                        <Icon icon="mdi:refresh" width="16" height="16" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="settings-item">
                  <label>Background Image</label>
                  <div className="background-image-controls">
                    <button onClick={handleSelectImage} className="select-image-btn">
                      <Icon icon="mdi:image-plus" width="16" height="16" />
                      <span>Upload</span>
                    </button>
                    {backgroundImage && (
                      <button onClick={() => onBackgroundImageChange(null)} className="remove-image-btn" title="Remove Image">
                        <Icon icon="mdi:trash-can-outline" width="16" height="16" />
                      </button>
                    )}
                  </div>
                </div>
                {backgroundImage && (
                  <div className="background-preview" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
                )}
                {(backgroundImage || backgroundColor) && (
                  <div className="settings-item slider-item">
                    <label htmlFor="overlay-opacity">Content Overlay Opacity</label>
                    <div className="overlay-opacity-control">
                      <input
                        type="range"
                        id="overlay-opacity"
                        min="0"
                        max="1"
                        step="0.05"
                        value={backgroundOverlayOpacity}
                        onChange={(e) => onBackgroundOverlayOpacityChange(parseFloat(e.target.value))}
                        className="overlay-opacity-slider"
                      />
                      <span className="overlay-opacity-value">{Math.round(backgroundOverlayOpacity * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h4>Window</h4>
                <div className="settings-item">
                  <label htmlFor="always-on-top">Always on top</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="always-on-top"
                      checked={alwaysOnTop}
                      onChange={(e) => onAlwaysOnTopChange(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-item">
                  <label htmlFor="launch-at-startup">Launch at startup</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="launch-at-startup"
                      checked={launchAtStartup}
                      onChange={(e) => onLaunchAtStartupChange(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h4>Folders</h4>
                <div className="folder-creation">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolder();
                      }
                    }}
                    placeholder="Folder name..."
                    className="folder-input"
                  />
                  <button
                    className="folder-create-btn"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                  >
                    <Icon icon="mdi:folder-plus" width="18" height="18" />
                    <span>Create</span>
                  </button>
                </div>
                {folders.length > 0 && (
                  <div className="folders-list">
                    {folders.map(folder => (
                      <div key={folder.id} className="folder-item">
                        <Icon icon="mdi:folder" width="16" height="16" />
                        <span>{folder.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h4>Data</h4>
                <div className="data-actions">
                  <button className="data-btn" onClick={() => setView('archived')}>
                    <Icon icon="mdi:archive" width="20" height="20" />
                    <span>Archived ({archivedTodos.length})</span>
                  </button>
                  <button className="data-btn" onClick={onExport}>
                    <Icon icon="mdi:export" width="20" height="20" />
                    <span>Export JSON</span>
                  </button>
                  <button className="data-btn" onClick={onImport}>
                    <Icon icon="mdi:import" width="20" height="20" />
                    <span>Import JSON</span>
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h4>Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{total}</div>
                    <div className="stat-label">Total Tasks</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{active}</div>
                    <div className="stat-label">Active</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{completed}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{completionRate}%</div>
                    <div className="stat-label">Complete</div>
                  </div>
                  {highPriority > 0 && (
                    <div className="stat-card priority">
                      <div className="stat-value">{highPriority}</div>
                      <div className="stat-label">High Priority</div>
                    </div>
                  )}
                  {overdue > 0 && (
                    <div className="stat-card overdue">
                      <div className="stat-value">{overdue}</div>
                      <div className="stat-label">Overdue</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-version">
                <span>Version {__APP_VERSION__}</span>
              </div>
            </>
          ) : (
            <div className="archived-list-container">
              {archivedTodos.length === 0 ? (
                <div className="empty-archived">
                  <Icon icon="mdi:archive-outline" width="48" height="48" />
                  <p>No archived todos</p>
                </div>
              ) : (
                <div className="archived-list">
                  {archivedTodos.map(todo => (
                    <div key={todo.id} className="archived-item">
                      <div className="archived-item-content">
                        <span className="archived-text">{todo.text}</span>
                        <span className="archived-date">Created: {new Date(todo.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="archived-actions">
                        <button onClick={() => onRestore(todo.id)} title="Restore" className="restore-btn">
                          <Icon icon="mdi:restore" width="18" height="18" />
                        </button>
                        <button onClick={() => onDelete(todo.id)} title="Delete Permanently" className="delete-permanent-btn">
                          <Icon icon="mdi:delete-forever" width="18" height="18" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
