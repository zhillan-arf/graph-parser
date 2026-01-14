import { useState, useMemo } from 'react';
import type { Course, CreateCourseDTO, UpdateCourseDTO } from '../../types';
import { TableToolbar } from './TableToolbar';
import { EditableCell } from './EditableCell';
import { CreateCourseModal, ConfirmDialog } from '../edit';
import './DataTable.css';

type SortField = 'id' | 'name' | 'color';
type SortDirection = 'asc' | 'desc';

interface CoursesTableProps {
  courses: Course[];
  isEditMode?: boolean;
  onCreateCourse?: (data: CreateCourseDTO) => string;
  onUpdateCourse?: (courseId: number, data: UpdateCourseDTO) => void;
  onDeleteCourse?: (courseId: number) => void;
}

export function CoursesTable({
  courses,
  isEditMode = false,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
}: CoursesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Course | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedCourses = useMemo(() => {
    let result = courses;

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (course) =>
          course.name.toLowerCase().includes(query) ||
          course.id.toString().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.id - b.id;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'color':
          comparison = a.color.localeCompare(b.color);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [courses, searchQuery, sortField, sortDirection]);

  const handleNameChange = (course: Course, name: string) => {
    if (name && name !== course.name && onUpdateCourse) {
      onUpdateCourse(course.id, { name });
    }
  };

  const handleColorChange = (course: Course, color: string) => {
    if (color && color !== course.color && onUpdateCourse) {
      onUpdateCourse(course.id, { color });
    }
  };

  const handleDelete = (course: Course) => {
    setDeleteConfirm(course);
  };

  const confirmDelete = () => {
    if (deleteConfirm && onDeleteCourse) {
      onDeleteCourse(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-indicator">⇅</span>;
    return (
      <span className="sort-indicator active">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="data-table-container">
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search courses..."
      />

      {isEditMode && (
        <div className="table-actions-bar">
          <button
            className="add-btn"
            onClick={() => setCreateModalOpen(true)}
            type="button"
          >
            + Add Course
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('id')}>
                ID <SortIndicator field="id" />
              </th>
              <th className="sortable" onClick={() => handleSort('name')}>
                Name <SortIndicator field="name" />
              </th>
              <th className="sortable" onClick={() => handleSort('color')}>
                Color <SortIndicator field="color" />
              </th>
              {isEditMode && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCourses.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 4 : 3} className="empty-message">
                  {searchQuery ? 'No courses match your search.' : 'No courses found.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedCourses.map((course) => (
                <tr key={course.id} className={course.id < 0 ? 'new-row' : ''}>
                  <td className="id-cell">
                    {course.id < 0 ? <span className="new-badge">NEW</span> : course.id}
                  </td>
                  <td>
                    {isEditMode ? (
                      <EditableCell
                        value={course.name}
                        onChange={(name) => handleNameChange(course, name)}
                      />
                    ) : (
                      <span className="course-badge" style={{ backgroundColor: `${course.color}20` }}>
                        <span className="color-dot" style={{ backgroundColor: course.color }} />
                        {course.name}
                      </span>
                    )}
                  </td>
                  <td>
                    {isEditMode ? (
                      <EditableCell
                        value={course.color}
                        onChange={(color) => handleColorChange(course, color)}
                        type="color"
                      />
                    ) : (
                      <div className="color-preview">
                        <span
                          className="color-swatch"
                          style={{ backgroundColor: course.color }}
                        />
                        <code>{course.color}</code>
                      </div>
                    )}
                  </td>
                  {isEditMode && (
                    <td className="actions-cell">
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(course)}
                        type="button"
                        title="Delete course"
                      >
                        🗑
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Showing {filteredAndSortedCourses.length} of {courses.length} courses
      </div>

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={(data) => {
          if (onCreateCourse) {
            onCreateCourse(data);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
