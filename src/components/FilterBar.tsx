import { FilterType } from '../types';
import CustomSelect from './CustomSelect';
import { Icon } from '@iconify/react';
import './FilterBar.css';

type FilterBarProps = {
  filter: FilterType;
  labels: string[];
  selectedLabel: string;
  onLabelChange: (label: string) => void;
  onFilterChange: (filter: FilterType) => void;
  onClearCompleted: () => void;
  hasCompleted: boolean;
};

export default function FilterBar({ 
  filter,
  labels, 
  selectedLabel, 
  onLabelChange,
  onFilterChange,
  onClearCompleted,
  hasCompleted
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-segmented-control">
        <button 
          className={`filter-segment ${filter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All
        </button>
        <button 
          className={`filter-segment ${filter === 'active' ? 'active' : ''}`}
          onClick={() => onFilterChange('active')}
        >
          Active
        </button>
        <button 
          className={`filter-segment ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => onFilterChange('completed')}
        >
          Done
        </button>
      </div>
      {filter === 'completed' && hasCompleted && (
        <button
          className="clear-completed-btn"
          onClick={onClearCompleted}
          title="Clear completed tasks"
        >
          <Icon icon="mdi:delete-sweep" width="18" height="18" />
        </button>
      )}
      <div className="filter-actions">
        {labels.length > 0 && (
          <CustomSelect
            value={selectedLabel}
            options={[
              { value: '', label: 'All Labels' },
              ...labels.map(lbl => ({ value: lbl, label: lbl }))
            ]}
            onChange={onLabelChange}
            placeholder="Labels"
            className="label-filter"
          />
        )}
      </div>
    </div>
  );
}
