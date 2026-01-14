import type { Course } from '../../types';
import './TableToolbar.css';

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  courses?: Course[];
  courseFilter?: string;
  onCourseFilterChange?: (value: string) => void;
  showCourseFilter?: boolean;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  courses = [],
  courseFilter = 'all',
  onCourseFilterChange,
  showCourseFilter = false,
}: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="table-search-input"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchValue && (
          <button
            className="clear-search-btn"
            onClick={() => onSearchChange('')}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {showCourseFilter && onCourseFilterChange && (
        <select
          className="table-course-filter"
          value={courseFilter}
          onChange={(e) => onCourseFilterChange(e.target.value)}
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id.toString()}>
              {course.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
