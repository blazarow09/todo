import { FilterType } from '../types';
import CustomSelect from './CustomSelect';
import './FilterBar.css';

type FilterBarProps = {
  filter: FilterType;
  labels: string[];
  selectedLabel: string;
  onLabelChange: (label: string) => void;
};

export default function FilterBar({ 
  labels, 
  selectedLabel, 
  onLabelChange
}: FilterBarProps) {
  return (
    <div className="filter-bar">
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
