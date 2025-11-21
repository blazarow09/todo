import { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Due date",
  className = ""
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [position, setPosition] = useState<'left' | 'right'>('left');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && datePickerRef.current && dropdownRef.current) {
      const rect = datePickerRef.current.getBoundingClientRect();
      const dropdownWidth = 260; // Approximate width of dropdown
      const windowWidth = window.innerWidth;
      const spaceOnRight = windowWidth - rect.right;
      const spaceOnLeft = rect.left;

      // If not enough space on right, align to right edge of button
      if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
        setPosition('right');
      } else {
        setPosition('left');
      }
    }
  }, [isOpen]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    onChange(dateString);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`date-picker ${className} ${isOpen ? 'open' : ''}`} ref={datePickerRef}>
      <button
        className="date-picker-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <svg className="date-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path 
            d="M12 2H4C2.9 2 2 2.9 2 4v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM4 4h8v2H4V4zm8 10H4V8h8v6z" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            fill="none"
          />
        </svg>
        <span className={value ? '' : 'placeholder'}>{formatDisplayDate(value) || placeholder}</span>
        {value && (
          <button className="clear-date" onClick={(e) => { e.stopPropagation(); handleClear(); }} type="button">
            ×
          </button>
        )}
      </button>
      {isOpen && (
        <div className={`date-picker-dropdown ${position === 'right' ? 'align-right' : ''}`} ref={dropdownRef}>
          <div className="calendar-header">
            <button className="nav-button" onClick={() => navigateMonth('prev')} type="button">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="month-year">{monthName}</div>
            <button className="nav-button" onClick={() => navigateMonth('next')} type="button">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="calendar-days-header">
            {daysOfWeek.map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="calendar-day empty"></div>;
              }
              return (
                <button
                  key={day}
                  className={`calendar-day ${isSelected(day) ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                  onClick={() => handleDateSelect(day)}
                  type="button"
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="calendar-footer">
            <button className="footer-btn clear-btn" onClick={handleClear} type="button">
              Clear
            </button>
            <button className="footer-btn today-btn" onClick={handleToday} type="button">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
