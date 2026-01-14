import type { Course, LayoutType, ViewMode, KnowledgeGraph } from '../types';
import { GraphSelector } from './graph-selector';

interface HeaderProps {
  // Graph selection
  graphs: KnowledgeGraph[];
  selectedGraphId: string | null;
  onGraphChange: (id: string) => void;
  onCreateEmptyGraph: () => void;
  onCreateCopyGraph: () => void;
  onDeleteGraph?: (id: string) => void;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Edit mode
  isReadonly: boolean;
  isEditMode: boolean;
  onEditModeToggle: () => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  isSaving: boolean;

  // Existing props
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
  // Graph selection
  graphs,
  selectedGraphId,
  onGraphChange,
  onCreateEmptyGraph,
  onCreateCopyGraph,
  onDeleteGraph,

  // View mode
  viewMode,
  onViewModeChange,

  // Edit mode
  isReadonly,
  isEditMode,
  onEditModeToggle,
  hasUnsavedChanges,
  onSave,
  isSaving,

  // Existing props
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
      <div className="header-left">
        <h1>pacukelas tutors</h1>

        {/* Graph Selector - fixed position */}
        <GraphSelector
          graphs={graphs}
          selectedId={selectedGraphId}
          onChange={onGraphChange}
          onCreateEmpty={onCreateEmptyGraph}
          onCreateCopy={onCreateCopyGraph}
          onDelete={onDeleteGraph}
        />

        {/* View Mode Toggle - fixed position */}
        <div className="view-toggle">
          <button
            className={viewMode === 'graph' ? 'active' : ''}
            onClick={() => onViewModeChange('graph')}
            type="button"
          >
            Graph
          </button>
          <button
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => onViewModeChange('table')}
            type="button"
          >
            Table
          </button>
        </div>
      </div>

      <div className="controls">
        {/* Search - shown in both views */}
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
            type="button"
          >
            &times;
          </button>
        </div>

        {/* Course Filter - shown in both views */}
        <div className="filter-container">
          <label htmlFor="course-filter">Course:</label>
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

        {/* Layout selector - only in graph view */}
        {viewMode === 'graph' && (
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
        )}

        {/* Graph view buttons */}
        {viewMode === 'graph' && (
          <>
            <button id="fit-btn" title="Fit graph to view" onClick={onFitView} type="button">
              Fit View
            </button>
            <button id="reset-btn" title="Reset highlights" onClick={onReset} type="button">
              Reset
            </button>
          </>
        )}

        {/* Edit mode toggle - only for non-readonly graphs */}
        {!isReadonly && (
          <div className="edit-toggle">
            <label className="edit-toggle-label">Edit</label>
            <button
              className={`edit-toggle-switch ${isEditMode ? 'active' : ''}`}
              onClick={onEditModeToggle}
              title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
              type="button"
            />
          </div>
        )}

        {/* Save button - only in edit mode with changes */}
        {isEditMode && (
          <button
            className="save-btn"
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSaving}
            type="button"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </header>
  );
}
