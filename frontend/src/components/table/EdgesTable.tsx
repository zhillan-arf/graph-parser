import { useState, useMemo } from 'react';
import type { Edge, Topic, Course, CreateEdgeDTO } from '../../types';
import { TableToolbar } from './TableToolbar';
import { CreateEdgeModal, ConfirmDialog } from '../edit';
import './DataTable.css';

type SortField = 'parent' | 'child' | 'parent_course' | 'child_course';
type SortDirection = 'asc' | 'desc';

interface EdgesTableProps {
  edges: Edge[];
  topics: Topic[];
  courses: Course[];
  isEditMode?: boolean;
  existingEdgesSet?: Set<string>;
  onCreateEdge?: (data: CreateEdgeDTO) => void;
  onDeleteEdge?: (parentSlug: string, childSlug: string) => void;
}

interface EnrichedEdge extends Edge {
  parentTopic: Topic | undefined;
  childTopic: Topic | undefined;
  parentCourse: Course | null | undefined;
  childCourse: Course | null | undefined;
  parentName: string;
  childName: string;
}

export function EdgesTable({
  edges,
  topics,
  courses,
  isEditMode = false,
  existingEdgesSet = new Set(),
  onCreateEdge,
  onDeleteEdge,
}: EdgesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('parent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EnrichedEdge | null>(null);

  const topicMap = useMemo(() => {
    const map = new Map<string, Topic>();
    topics.forEach((t) => map.set(t.url_slug, t));
    return map;
  }, [topics]);

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

  // Enrich edges with topic and course info
  const enrichedEdges = useMemo((): EnrichedEdge[] => {
    return edges.map((edge) => {
      const parentTopic = topicMap.get(edge.parent_slug);
      const childTopic = topicMap.get(edge.child_slug);
      const parentCourse = parentTopic ? courseMap.get(parentTopic.course_id) : null;
      const childCourse = childTopic ? courseMap.get(childTopic.course_id) : null;
      return {
        ...edge,
        parentTopic,
        childTopic,
        parentCourse,
        childCourse,
        parentName: parentTopic?.display_name || edge.parent_slug,
        childName: childTopic?.display_name || edge.child_slug,
      };
    });
  }, [edges, topicMap, courseMap]);

  const filteredAndSortedEdges = useMemo(() => {
    let result = enrichedEdges;

    // Filter by course (matches either parent or child)
    if (courseFilter !== 'all') {
      const courseId = parseInt(courseFilter);
      result = result.filter(
        (e) =>
          e.parentTopic?.course_id === courseId ||
          e.childTopic?.course_id === courseId
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (edge) =>
          edge.parent_slug.toLowerCase().includes(query) ||
          edge.child_slug.toLowerCase().includes(query) ||
          edge.parentName.toLowerCase().includes(query) ||
          edge.childName.toLowerCase().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'parent':
          comparison = a.parentName.localeCompare(b.parentName);
          break;
        case 'child':
          comparison = a.childName.localeCompare(b.childName);
          break;
        case 'parent_course':
          const pcA = a.parentCourse?.name || '';
          const pcB = b.parentCourse?.name || '';
          comparison = pcA.localeCompare(pcB);
          break;
        case 'child_course':
          const ccA = a.childCourse?.name || '';
          const ccB = b.childCourse?.name || '';
          comparison = ccA.localeCompare(ccB);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [enrichedEdges, searchQuery, courseFilter, sortField, sortDirection]);

  const handleDelete = (edge: EnrichedEdge) => {
    setDeleteConfirm(edge);
  };

  const confirmDelete = () => {
    if (deleteConfirm && onDeleteEdge) {
      onDeleteEdge(deleteConfirm.parent_slug, deleteConfirm.child_slug);
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
        searchPlaceholder="Search prerequisites..."
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
            + Add Prerequisite
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table edges-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('parent')}>
                Prerequisite (Parent) <SortIndicator field="parent" />
              </th>
              <th className="sortable" onClick={() => handleSort('parent_course')}>
                Parent Course <SortIndicator field="parent_course" />
              </th>
              <th className="arrow-col">→</th>
              <th className="sortable" onClick={() => handleSort('child')}>
                Leads To (Child) <SortIndicator field="child" />
              </th>
              <th className="sortable" onClick={() => handleSort('child_course')}>
                Child Course <SortIndicator field="child_course" />
              </th>
              {isEditMode && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEdges.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 6 : 5} className="empty-message">
                  {searchQuery || courseFilter !== 'all'
                    ? 'No prerequisites match your filters.'
                    : 'No prerequisites found.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedEdges.map((edge) => {
                const isNew = edge.id < 0;
                return (
                  <tr key={`${edge.parent_slug}-${edge.child_slug}`} className={isNew ? 'new-row' : ''}>
                    <td className="name-cell" title={edge.parent_slug}>
                      {isNew && <span className="new-badge">NEW</span>}
                      {edge.parentName}
                    </td>
                    <td>
                      {edge.parentCourse && (
                        <span
                          className="course-badge"
                          style={{ backgroundColor: `${edge.parentCourse.color}20` }}
                        >
                          <span
                            className="color-dot"
                            style={{ backgroundColor: edge.parentCourse.color }}
                          />
                          {edge.parentCourse.name}
                        </span>
                      )}
                    </td>
                    <td className="arrow-cell">→</td>
                    <td className="name-cell" title={edge.child_slug}>
                      {edge.childName}
                    </td>
                    <td>
                      {edge.childCourse && (
                        <span
                          className="course-badge"
                          style={{ backgroundColor: `${edge.childCourse.color}20` }}
                        >
                          <span
                            className="color-dot"
                            style={{ backgroundColor: edge.childCourse.color }}
                          />
                          {edge.childCourse.name}
                        </span>
                      )}
                    </td>
                    {isEditMode && (
                      <td className="actions-cell">
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(edge)}
                          type="button"
                          title="Delete prerequisite"
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
        Showing {filteredAndSortedEdges.length} of {edges.length} prerequisites
      </div>

      {/* Create Edge Modal */}
      <CreateEdgeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={(data) => {
          if (onCreateEdge) {
            onCreateEdge(data);
          }
        }}
        topics={topics}
        existingEdges={existingEdgesSet}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Prerequisite"
        message={`Are you sure you want to remove the prerequisite relationship between "${deleteConfirm?.parentName}" and "${deleteConfirm?.childName}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
