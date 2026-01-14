import { createContext, useContext } from 'react';
import type {
  CreateCourseDTO,
  UpdateCourseDTO,
  CreateTopicDTO,
  UpdateTopicDTO,
  CreateEdgeDTO,
} from '../types';

interface EditContextValue {
  isEditMode: boolean;

  // Course operations
  createCourse: (data: CreateCourseDTO) => string;
  updateCourse: (courseId: number, data: UpdateCourseDTO) => void;
  deleteCourse: (courseId: number) => void;
  undoDeleteCourse: (courseId: number) => void;

  // Topic operations
  createTopic: (data: CreateTopicDTO) => string;
  updateTopic: (urlSlug: string, data: UpdateTopicDTO) => void;
  deleteTopic: (urlSlug: string) => void;
  undoDeleteTopic: (urlSlug: string) => void;

  // Edge operations
  createEdge: (data: CreateEdgeDTO) => void;
  deleteEdge: (parentSlug: string, childSlug: string) => void;
}

const EditContext = createContext<EditContextValue | null>(null);

export function EditProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: EditContextValue;
}) {
  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}

export function useEditContext(): EditContextValue {
  const context = useContext(EditContext);
  if (!context) {
    throw new Error('useEditContext must be used within an EditProvider');
  }
  return context;
}

export function useEditContextSafe(): EditContextValue | null {
  return useContext(EditContext);
}
