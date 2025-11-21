import { useState, useRef, useEffect } from 'react';
import './LabelInput.css';

type LabelInputProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onAddNew?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function LabelInput({
  value,
  options,
  onChange,
  onAddNew,
  placeholder = "Label",
  className = ""
}: LabelInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const labelInputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (inputValue) {
      const filtered = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [inputValue, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (labelInputRef.current && !labelInputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If input has value and it's not in options, add it
        if (inputValue && inputValue.trim() && !options.includes(inputValue.trim()) && onAddNew) {
          onAddNew(inputValue.trim());
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, options, onAddNew]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelectOption = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue && inputValue.trim()) {
      if (!options.includes(inputValue.trim()) && onAddNew) {
        onAddNew(inputValue.trim());
      }
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const showAddNew = inputValue && 
    inputValue.trim() && 
    !options.includes(inputValue.trim()) &&
    filteredOptions.length === 0;

  return (
    <div className={`label-input-wrapper ${isOpen ? 'open' : ''}`} ref={labelInputRef}>
      <input
        ref={inputRef}
        type="text"
        className={`label-input ${className}`}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {isOpen && (filteredOptions.length > 0 || showAddNew) && (
        <div className="label-dropdown">
          {filteredOptions.map((option) => (
            <button
              key={option}
              className={`label-option ${value === option ? 'selected' : ''}`}
              onClick={() => handleSelectOption(option)}
              type="button"
            >
              {option}
            </button>
          ))}
          {showAddNew && (
            <button
              className="label-option add-new"
              onClick={() => {
                if (onAddNew) {
                  onAddNew(inputValue.trim());
                  onChange(inputValue.trim());
                }
                setIsOpen(false);
              }}
              type="button"
            >
              + Add "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

