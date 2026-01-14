import { useState, useMemo } from 'react';
import type { GraphData } from '../../types';
import type {
  CreateCourseDTO,
  UpdateCourseDTO,
  CreateTopicDTO,
  UpdateTopicDTO,
  CreateEdgeDTO,
} from '../../types';
import { CoursesTable } from './CoursesTable';
import { TopicsTable } from './TopicsTable';
import { EdgesTable } from './EdgesTable';
import './TableView.css';

type TabType = 'courses' | 'topics' | 'edges';

export interface TableEditHandlers {
  createCourse: (data: CreateCourseDTO) => string;
  updateCourse: (courseId: number, data: UpdateCourseDTO) => void;
  deleteCourse: (courseId: number) => void;
  createTopic: (data: CreateTopicDTO) => string;
  updateTopic: (urlSlug: string, data: UpdateTopicDTO) => void;
  deleteTopic: (urlSlug: string) => void;
  createEdge: (data: CreateEdgeDTO) => void;
  deleteEdge: (parentSlug: string, childSlug: string) => void;
}

interface TableViewProps {
  data: GraphData;
  isEditMode?: boolean;
  editHandlers?: TableEditHandlers;
}

export function TableView({ data, isEditMode = false, editHandlers }: TableViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('topics');

  // Compute existing edges set for duplicate checking
  const existingEdgesSet = useMemo(() => {
    const set = new Set<string>();
    data.edges.forEach((e) => {
      set.add(`${e.parent_slug}->${e.child_slug}`);
    });
    return set;
  }, [data.edges]);

  return (
    <div className="table-view-container">
      <div className="table-tabs">
        <button
          className={`table-tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
          type="button"
        >
          Courses
          <span className="tab-count">{data.courses.length}</span>
        </button>
        <button
          className={`table-tab ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
          type="button"
        >
          Topics
          <span className="tab-count">{data.topics.length}</span>
        </button>
        <button
          className={`table-tab ${activeTab === 'edges' ? 'active' : ''}`}
          onClick={() => setActiveTab('edges')}
          type="button"
        >
          Prerequisites
          <span className="tab-count">{data.edges.length}</span>
        </button>
      </div>

      <div className="table-content">
        {activeTab === 'courses' && (
          <CoursesTable
            courses={data.courses}
            isEditMode={isEditMode}
            onCreateCourse={editHandlers?.createCourse}
            onUpdateCourse={editHandlers?.updateCourse}
            onDeleteCourse={editHandlers?.deleteCourse}
          />
        )}
        {activeTab === 'topics' && (
          <TopicsTable
            topics={data.topics}
            courses={data.courses}
            isEditMode={isEditMode}
            onCreateTopic={editHandlers?.createTopic}
            onUpdateTopic={editHandlers?.updateTopic}
            onDeleteTopic={editHandlers?.deleteTopic}
          />
        )}
        {activeTab === 'edges' && (
          <EdgesTable
            edges={data.edges}
            topics={data.topics}
            courses={data.courses}
            isEditMode={isEditMode}
            existingEdgesSet={existingEdgesSet}
            onCreateEdge={editHandlers?.createEdge}
            onDeleteEdge={editHandlers?.deleteEdge}
          />
        )}
      </div>
    </div>
  );
}
