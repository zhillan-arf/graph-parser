import type { Course, LayoutType } from '../types';

interface HeaderProps {
  courses: Course[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  courseFilter: string;
  onCourseFilterChange: (courseId: string) => void;
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  onFitView: () => void;
  onReset: () => void;
}

export default function Header({
  courses,
  searchQuery,
  onSearchChange,
  courseFilter,
  onCourseFilterChange,
  layout,
  onLayoutChange,
  onFitView,
  onReset,
}: HeaderProps) {
  return (
    <header>
      <h1>Knowledge Graph</h1>
      <div className="controls">
        <div className="search-container">
          <input
            type="text"
            id="search"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            id="clear-search"
            title="Clear search"
            onClick={() => onSearchChange('')}
          >
            &times;
          </button>
        </div>
        <div className="filter-container">
          <label htmlFor="course-filter">Filter by course:</label>
          <select
            id="course-filter"
            value={courseFilter}
            onChange={(e) => onCourseFilterChange(e.target.value)}
          >
            <option value="all">All Courses</option>
            {courses
              .filter((c) => c.name !== 'Missing')
              .map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
          </select>
        </div>
        <div className="layout-container">
          <label htmlFor="layout-select">Layout:</label>
          <select
            id="layout-select"
            value={layout}
            onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
          >
            <option value="dagre">Hierarchical (Dagre)</option>
            <option value="force">Force-Directed</option>
          </select>
        </div>
        <button id="fit-btn" title="Fit graph to view" onClick={onFitView}>
          Fit View
        </button>
        <button id="reset-btn" title="Reset highlights" onClick={onReset}>
          Reset
        </button>
      </div>
    </header>
  );
}
