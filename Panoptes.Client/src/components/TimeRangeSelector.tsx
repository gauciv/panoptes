import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  TimeRange, 
  PresetTimeRange, 
  isCustomTimeRange, 
  isPresetTimeRange,
  formatTimeRangeLabel 
} from '../hooks/useStatsData';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
}

const PRESET_OPTIONS: { value: PresetTimeRange; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsCustomOpen(false);
      }
    }

    if (isCustomOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomOpen]);

  // Initialize dates when opening custom picker with existing custom range
  useEffect(() => {
    if (isCustomOpen && isCustomTimeRange(value)) {
      setStartDate(value.startDate);
      setEndDate(value.endDate);
    }
  }, [isCustomOpen, value]);

  const handlePresetClick = (preset: PresetTimeRange) => {
    setIsCustomOpen(false);
    onChange(preset);
  };

  const handleCustomClick = () => {
    setIsCustomOpen(!isCustomOpen);
    // Initialize with default dates if not set
    if (!startDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7); // Default to last 7 days
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate) {
      // Normalize dates to start/end of day
      const normalizedStart = new Date(startDate);
      normalizedStart.setHours(0, 0, 0, 0);
      
      const normalizedEnd = new Date(endDate);
      normalizedEnd.setHours(23, 59, 59, 999);

      onChange({
        type: 'custom',
        startDate: normalizedStart,
        endDate: normalizedEnd,
      });
      setIsCustomOpen(false);
    }
  };

  const isCustomActive = isCustomTimeRange(value);

  return (
    <div className={`relative inline-flex ${className}`} ref={popoverRef}>
      {/* Preset buttons */}
      <div className="inline-flex rounded-tech border border-gray-300 bg-white overflow-hidden">
        {PRESET_OPTIONS.map((option, index) => (
          <button
            key={option.value}
            onClick={() => handlePresetClick(option.value)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              isPresetTimeRange(value) && value === option.value
                ? 'bg-sentinel text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            } ${index < PRESET_OPTIONS.length - 1 ? 'border-r border-gray-300' : ''}`}
          >
            {option.label}
          </button>
        ))}
        
        {/* Custom button */}
        <button
          onClick={handleCustomClick}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-l border-gray-300 ${
            isCustomActive
              ? 'bg-sentinel text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {isCustomActive ? formatTimeRangeLabel(value) : 'Custom'}
        </button>
      </div>

      {/* Custom date picker popover */}
      {isCustomOpen && (
        <div className="absolute right-0 top-full mt-2 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Select Date Range</h3>
            
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={endDate ?? new Date()}
                  className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sentinel focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  dateFormat="MMM d, yyyy"
                  placeholderText="Start"
                />
              </div>
              
              <span className="text-gray-400 dark:text-gray-500 mt-5">→</span>
              
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate ?? undefined}
                  maxDate={new Date()}
                  className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sentinel focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  dateFormat="MMM d, yyyy"
                  placeholderText="End"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsCustomOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustomRange}
              disabled={!startDate || !endDate}
              className="px-3 py-1.5 text-xs font-medium bg-sentinel text-white rounded-md hover:bg-sentinel-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeRangeSelector;
