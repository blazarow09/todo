import { Icon } from '@iconify/react';
import { Todo, Theme } from '../types';
import './Settings.css';

type SettingsProps = {
  todos: Todo[];
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  alwaysOnTop: boolean;
  onAlwaysOnTopChange: (value: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
};

export default function Settings({ todos, theme, onThemeChange, alwaysOnTop, onAlwaysOnTopChange, isOpen, onClose }: SettingsProps) {
  if (!isOpen) return null;

  const total = todos.length;
  const completed = todos.filter(t => t.done).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const highPriority = todos.filter(t => !t.done && t.priority === 'high').length;
  const overdue = todos.filter(t => 
    !t.done && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose}>
            <Icon icon="mdi:close" width="20" height="20" />
          </button>
        </div>
        <div className="settings-content">
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
                <div className="stat-label">Completion Rate</div>
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
        </div>
      </div>
    </div>
  );
}

