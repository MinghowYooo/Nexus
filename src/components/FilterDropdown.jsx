import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { 
  DURATION_FILTERS, 
  SORT_BY_FILTERS 
} from '../utils/constants.js';

const FilterDropdown = ({ onFiltersChange, currentFilters = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    duration: currentFilters.duration || null,
    sortBy: currentFilters.sortBy || SORT_BY_FILTERS.RELEVANCE
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (category, value) => {
    const newFilters = { ...filters };
    newFilters[category] = value;
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      duration: null,
      sortBy: SORT_BY_FILTERS.RELEVANCE
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.duration) count++;
    if (filters.sortBy !== SORT_BY_FILTERS.RELEVANCE) count++;
    return count;
  };

  const FilterSection = ({ title, children, horizontal = false }) => (
    <div className="border-b border-gray-700 pb-3 mb-3 last:border-b-0 last:mb-0">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">{title}</h3>
      <div className={horizontal ? "flex flex-wrap gap-1.5" : "space-y-2"}>
        {children}
      </div>
    </div>
  );

  const FilterOption = ({ value, label, isSelected, onChange, type = 'radio' }) => (
    <label className="flex items-center space-x-1.5 cursor-pointer hover:bg-gray-700/50 rounded px-1.5 py-0.5 whitespace-nowrap">
      <input
        type={type}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="w-3.5 h-3.5 text-rose-500 bg-gray-700 border-gray-600 rounded focus:ring-rose-500 focus:ring-1"
      />
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );

  const activeCount = getActiveFiltersCount();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full transition-colors backdrop-blur-lg bg-dark-soft-800/70 text-gray-300 hover:bg-white/20"
        title="Filters"
      >
        <Filter size={20} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center text-[10px]">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-dark-soft-800/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl z-50">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              {activeCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <X size={14} />
                  Clear all
                </button>
              )}
            </div>



            <FilterSection title="DURATION" horizontal>
              <FilterOption
                value={DURATION_FILTERS.UNDER_4_MIN}
                label="Under 4 min"
                isSelected={filters.duration === DURATION_FILTERS.UNDER_4_MIN}
                onChange={(value) => handleFilterChange('duration', value)}
              />
              <FilterOption
                value={DURATION_FILTERS.FOUR_TO_TWENTY_MIN}
                label="4-20 min"
                isSelected={filters.duration === DURATION_FILTERS.FOUR_TO_TWENTY_MIN}
                onChange={(value) => handleFilterChange('duration', value)}
              />
              <FilterOption
                value={DURATION_FILTERS.OVER_20_MIN}
                label="Over 20 min"
                isSelected={filters.duration === DURATION_FILTERS.OVER_20_MIN}
                onChange={(value) => handleFilterChange('duration', value)}
              />
            </FilterSection>


            <FilterSection title="SORT BY" horizontal>
              <FilterOption
                value={SORT_BY_FILTERS.RELEVANCE}
                label="Relevance"
                isSelected={filters.sortBy === SORT_BY_FILTERS.RELEVANCE}
                onChange={(value) => handleFilterChange('sortBy', value)}
              />
              <FilterOption
                value={SORT_BY_FILTERS.VIEW_COUNT}
                label="Views"
                isSelected={filters.sortBy === SORT_BY_FILTERS.VIEW_COUNT}
                onChange={(value) => handleFilterChange('sortBy', value)}
              />
              <FilterOption
                value={SORT_BY_FILTERS.RATING}
                label="Rating"
                isSelected={filters.sortBy === SORT_BY_FILTERS.RATING}
                onChange={(value) => handleFilterChange('sortBy', value)}
              />
            </FilterSection>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
