import { Icon } from '@iconify/react';
import { Todo } from '../types';
import './Statistics.css';

type StatisticsProps = {
  todos: Todo[];
  isOpen: boolean;
  onToggle: () => void;
};

export default function Statistics({ todos, isOpen, onToggle }: StatisticsProps) {
  const total = todos.length;
  const completed = todos.filter(t => t.done).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const highPriority = todos.filter(t => !t.done && t.priority === 'high').length;
  const overdue = todos.filter(t => 
    !t.done && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <div style={{ position: 'relative' }}>
      <button className="stats-toggle" onClick={onToggle} title="Statistics">
        <Icon icon="mdi:chart-box" width="20" height="20" />
      </button>
      {isOpen && (
        <div className="statistics-panel">
          <div className="stats-header">
            <h3>Statistics</h3>
            <button className="stats-close" onClick={onToggle}>×</button>
          </div>
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
      )}
    </div>
  );
}

