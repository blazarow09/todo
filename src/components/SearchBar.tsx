import { Icon } from '@iconify/react';
import './SearchBar.css';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <Icon icon="mdi:magnify" width="18" height="18" className="search-icon" />
      <input
        className="search-input"
        type="text"
        placeholder="Search tasks"
        aria-label="Search tasks"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <Icon icon="mdi:close" width="14" height="14" />
        </button>
      )}
    </div>
  );
}

