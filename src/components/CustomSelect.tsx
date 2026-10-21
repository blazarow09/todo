import { Icon } from '@iconify/react';
import { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

type Option = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function CustomSelect({ 
  value, 
  options, 
  onChange, 
  placeholder = "Select...",
  className = "",
  disabled = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className={`custom-select ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`} ref={selectRef}>
      <button
        className="select-button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        type="button"
        disabled={disabled}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <Icon icon="mdi:chevron-down" width="16" height="16" className="select-arrow" />
      </button>
      {isOpen && (
        <div className="select-dropdown">
          {options.map((option) => (
            <button
              key={option.value}
              className={`select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

