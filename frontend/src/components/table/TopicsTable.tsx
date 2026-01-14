import { useState, useMemo } from 'react';
import type { Topic, Course, CreateTopicDTO, UpdateTopicDTO } from '../../types';
import { TableToolbar } from './TableToolbar';
import { EditableCell } from './EditableCell';
import { CreateTopicModal, ConfirmDialog } from '../edit';
import './DataTable.css';

type SortField = 'display_name' | 'url_slug' | 'course' | 'has_content';
type SortDirection = 'asc' | 'desc';

interface TopicsTableProps {
  topics: Topic[];
  courses: Course[];
  isEditMode?: boolean;
  onCreateTopic?: (data: CreateTopicDTO) => string;
  onUpdateTopic?: (urlSlug: string, data: UpdateTopicDTO) => void;
  onDeleteTopic?: (urlSlug: string) => void;
}

export function TopicsTable({
  topics,
  courses,
  isEditMode = false,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
}: TopicsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('display_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Topic | null>(null);

  const courseMap = useMemo(() => {
    const map = new Map<number, Course>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTopics = useMemo(() => {
    let result = topics;

    // Filter by course
    if (courseFilter !== 'all') {
      const courseId = parseInt(courseFilter);
      result = result.filter((t) => t.course_id === courseId);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (topic) =>
          topic.display_name.toLowerCase().includes(query) ||
          topic.url_slug.toLowerCase().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'display_name':
          comparison = a.display_name.localeCompare(b.display_name);
          break;
        case 'url_slug':
          comparison = a.url_slug.localeCompare(b.url_slug);
          break;
        case 'course':
          const courseA = courseMap.get(a.course_id)?.name || '';
          const courseB = courseMap.get(b.course_id)?.name || '';
          comparison = courseA.localeCompare(courseB);
          break;
        case 'has_content':
          comparison = (a.has_content ? 1 : 0) - (b.has_content ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [topics, searchQuery, courseFilter, sortField, sortDirection, courseMap]);

  const handleNameChange = (topic: Topic, displayName: string) => {
    if (displayName && displayName !== topic.display_name && onUpdateTopic) {
      onUpdateTopic(topic.url_slug, { displayName });
    }
  };

  const handleCourseChange = (topic: Topic, courseId: number) => {
    if (courseId !== topic.course_id && onUpdateTopic) {
      onUpdateTopic(topic.url_slug, { courseId });
    }
  };

  const handleDelete = (topic: Topic) => {
    setDeleteConfirm(topic);
  };

  const confirmDelete = () => {
    if (deleteConfirm && onDeleteTopic) {
      onDeleteTopic(deleteConfirm.url_slug);
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
        searchPlaceholder="Search topics..."
        courses={courses}
        courseFilter={courseFilter}
        onCourseFilterChange={setCourseFilter}
        showCourseFilter={true}
      />

      {isEditMode && (
        <div className="table-actions-bar">
          <button
            className="add-btn"
            onClick={() => setCreateModalOpen(true)}
            type="button"
          >
            + Add Topic
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('display_name')}>
                Name <SortIndicator field="display_name" />
              </th>
              <th className="sortable" onClick={() => handleSort('url_slug')}>
                URL Slug <SortIndicator field="url_slug" />
              </th>
              <th className="sortable" onClick={() => handleSort('course')}>
                Course <SortIndicator field="course" />
              </th>
              <th className="sortable" onClick={() => handleSort('has_content')}>
                Has Content <SortIndicator field="has_content" />
              </th>
              {isEditMode && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTopics.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 5 : 4} className="empty-message">
                  {searchQuery || courseFilter !== 'all'
                    ? 'No topics match your filters.'
                    : 'No topics found.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedTopics.map((topic) => {
                const course = courseMap.get(topic.course_id);
                const isNew = topic.id < 0;
                return (
                  <tr key={topic.url_slug} className={isNew ? 'new-row' : ''}>
                    <td className="name-cell">
                      {isEditMode ? (
                        <div className="name-with-badge">
                          {isNew && <span className="new-badge">NEW</span>}
                          <EditableCell
                            value={topic.display_name}
                            onChange={(name) => handleNameChange(topic, name)}
                          />
                        </div>
                      ) : (
                        topic.display_name
                      )}
                    </td>
                    <td className="slug-cell truncated" title={topic.url_slug}>
                      <code>{topic.url_slug}</code>
                    </td>
                    <td>
                      {isEditMode ? (
                        <select
                          className="course-select"
                          value={topic.course_id}
                          onChange={(e) => handleCourseChange(topic, parseInt(e.target.value))}
                        >
                          {courses.filter(c => c.id > 0).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : course ? (
                        <span
                          className="course-badge"
                          style={{ backgroundColor: `${course.color}20` }}
                        >
                          <span
                            className="color-dot"
                            style={{ backgroundColor: course.color }}
                          />
                          {course.name}
                        </span>
                      ) : null}
                    </td>
                    <td className="boolean-cell">
                      <span className={`status-badge ${topic.has_content ? 'yes' : 'no'}`}>
                        {topic.has_content ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {isEditMode && (
                      <td className="actions-cell">
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(topic)}
                          type="button"
                          title="Delete topic"
                        >
                          🗑
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Showing {filteredAndSortedTopics.length} of {topics.length} topics
      </div>

      {/* Create Topic Modal */}
      <CreateTopicModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={(data) => {
          if (onCreateTopic) {
            onCreateTopic(data);
          }
        }}
        courses={courses.filter(c => c.id > 0)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Topic"
        message={`Are you sure you want to delete "${deleteConfirm?.display_name}"? This will also remove all prerequisites involving this topic.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
