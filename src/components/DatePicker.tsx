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
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      // Parse date string as local time (YYYY-MM-DD or YYYY-MM-DDTHH:mm format)
      // Handle both YYYY-MM-DD and potential ISO strings
      const [datePart, timePart] = value.split('T');
      const dateParts = datePart.split('-');
      if (dateParts.length >= 2) {
        const [yearStr, monthStr] = dateParts;
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed
        if (!isNaN(year) && !isNaN(month)) {
          setCurrentMonth(new Date(year, month, 1));
        }
      }
      
      // Parse time if present
      if (timePart) {
        const [hourStr, minuteStr] = timePart.split(':');
        const parsedHours = parseInt(hourStr, 10);
        const parsedMinutes = parseInt(minuteStr || '0', 10);
        if (!isNaN(parsedHours)) setHours(parsedHours);
        if (!isNaN(parsedMinutes)) setMinutes(parsedMinutes);
      } else {
        // Default to current time if no time specified
        const now = new Date();
        setHours(now.getHours());
        setMinutes(now.getMinutes());
      }
    } else {
      // Default to current time when no value
      const now = new Date();
      setHours(now.getHours());
      setMinutes(now.getMinutes());
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
      const dropdownWidth = 280; // Approximate width of dropdown
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
    // Parse date string as local time (YYYY-MM-DD or YYYY-MM-DDTHH:mm format)
    const [datePart, timePart] = dateString.split('T');
    const dateParts = datePart.split('-');
    if (dateParts.length !== 3) return '';
    
    const [yearStr, monthStr, dayStr] = dateParts;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed
    const day = parseInt(dayStr, 10);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    
    const date = new Date(year, month, day);
    let formatted = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    // Add time if present (24-hour format)
    if (timePart) {
      const [hourStr, minuteStr] = timePart.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr || '0', 10);
      if (!isNaN(hour) && !isNaN(minute)) {
        const hourFormatted = String(hour).padStart(2, '0');
        const minuteFormatted = String(minute).padStart(2, '0');
        formatted += `, ${hourFormatted}:${minuteFormatted}`;
      }
    }
    
    return formatted;
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
    // Format date string manually using local time to avoid timezone issues
    // Ensure we use the exact day number passed in, not from a Date object
    const datePart = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Use existing time if value has time, otherwise use current time
    let timeHours = hours;
    let timeMinutes = minutes;
    if (value && value.includes('T')) {
      const [, timePart] = value.split('T');
      if (timePart) {
        const [h, m] = timePart.split(':');
        const parsedH = parseInt(h, 10);
        const parsedM = parseInt(m || '0', 10);
        if (!isNaN(parsedH)) timeHours = parsedH;
        if (!isNaN(parsedM)) timeMinutes = parsedM;
      }
    } else {
      // If no existing time, use current time
      const now = new Date();
      timeHours = now.getHours();
      timeMinutes = now.getMinutes();
      setHours(timeHours);
      setMinutes(timeMinutes);
    }
    
    const timePart = `${String(timeHours).padStart(2, '0')}:${String(timeMinutes).padStart(2, '0')}`;
    onChange(`${datePart}T${timePart}`);
    // Don't close the picker so user can adjust time
  };

  const handleToday = () => {
    const today = new Date();
    // Format date string manually using local time to avoid timezone issues
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const hour = today.getHours();
    const minute = today.getMinutes();
    const datePart = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timePart = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onChange(`${datePart}T${timePart}`);
    setHours(hour);
    setMinutes(minute);
    // Don't close the picker so user can adjust time
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    
    // Update the value with new time if date is already selected
    if (value) {
      const [datePart] = value.split('T');
      if (datePart && datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const timePart = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        onChange(`${datePart}T${timePart}`);
      } else if (value.includes('T')) {
        // Value already has time, update it
        const [existingDatePart] = value.split('T');
        if (existingDatePart) {
          const timePart = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
          onChange(`${existingDatePart}T${timePart}`);
        }
      }
    }
  };

  const incrementHours = () => {
    const newHours = (hours + 1) % 24;
    handleTimeChange(newHours, minutes);
  };

  const decrementHours = () => {
    const newHours = (hours - 1 + 24) % 24;
    handleTimeChange(newHours, minutes);
  };

  const incrementMinutes = () => {
    const newMinutes = (minutes + 1) % 60;
    handleTimeChange(hours, newMinutes);
  };

  const decrementMinutes = () => {
    const newMinutes = (minutes - 1 + 60) % 60;
    handleTimeChange(hours, newMinutes);
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
    // Parse date string as local time (YYYY-MM-DD format)
    // Handle both YYYY-MM-DD and potential ISO strings
    const dateParts = value.split('T')[0].split('-');
    if (dateParts.length !== 3) return false;
    
    const [yearStr, monthStr, dayStr] = dateParts;
    const selectedYear = parseInt(yearStr, 10);
    const selectedMonth = parseInt(monthStr, 10) - 1; // Month is 0-indexed
    const selectedDay = parseInt(dayStr, 10);
    
    // Validate parsed values
    if (isNaN(selectedYear) || isNaN(selectedMonth) || isNaN(selectedDay)) return false;
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return (
      day === selectedDay &&
      month === selectedMonth &&
      year === selectedYear
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`date-picker ${className} ${isOpen ? 'open' : ''}`} ref={datePickerRef}>
      <div className="date-picker-button-wrapper">
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
        </button>
        {value && (
          <button className="clear-date" onClick={(e) => { e.stopPropagation(); handleClear(); }} type="button">
            ×
          </button>
        )}
      </div>
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
          <div className="time-picker">
            <div className="time-label">Time</div>
            <div className="time-controls">
              <div className="time-input-group">
                <button className="time-arrow" onClick={incrementHours} type="button">▲</button>
                <input
                  type="number"
                  className="time-input"
                  value={String(hours).padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0 && val < 24) {
                      handleTimeChange(val, minutes);
                    }
                  }}
                  min="0"
                  max="23"
                  step="1"
                />
                <button className="time-arrow" onClick={decrementHours} type="button">▼</button>
              </div>
              <span className="time-separator">:</span>
              <div className="time-input-group">
                <button className="time-arrow" onClick={incrementMinutes} type="button">▲</button>
                <input
                  type="number"
                  className="time-input"
                  value={String(minutes).padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0 && val < 60) {
                      handleTimeChange(hours, val);
                    }
                  }}
                  min="0"
                  max="59"
                  step="1"
                />
                <button className="time-arrow" onClick={decrementMinutes} type="button">▼</button>
              </div>
            </div>
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
