// =============================================================================
// Legacy types (for backwards compatibility with existing components)
// =============================================================================

export interface Course {
  id: number;
  name: string;
  color: string;
}

export interface Topic {
  id: number;
  url_slug: string;
  display_name: string;
  course_id: number;
  parent_slugs: string[];
  content_html: string | null;
  content_text: string | null;
  has_content: boolean;
}

export interface Edge {
  id: number;
  parent_slug: string;
  child_slug: string;
}

export interface GraphData {
  courses: Course[];
  topics: Topic[];
  edges: Edge[];
}

export type LayoutType = 'dagre' | 'force';
export type ViewMode = 'graph' | 'table';

// =============================================================================
// New API types (v1 API)
// =============================================================================

export interface KnowledgeGraph {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isReadonly: boolean;
  sourceGraphId: string | null;
  createdAt: string;
  updatedAt: string;
}

// API response course (camelCase from new API)
export interface ApiCourse {
  id: number;
  courseId: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// API response topic (camelCase from new API)
export interface ApiTopic {
  id: number;
  urlSlug: string;
  displayName: string;
  courseId: number;
  parentSlugs: string[];
  contentHtml: string | null;
  contentText: string | null;
  hasContent: boolean;
  createdAt: string;
  updatedAt: string;
}

// API response edge (camelCase from new API)
export interface ApiEdge {
  id: number;
  parentSlug: string;
  childSlug: string;
  createdAt: string;
}

export interface FullGraphData {
  graph: KnowledgeGraph;
  courses: ApiCourse[];
  topics: ApiTopic[];
  edges: ApiEdge[];
}

// =============================================================================
// DTOs (Data Transfer Objects for mutations)
// =============================================================================

export interface CreateGraphDTO {
  name: string;
  description?: string;
  copyFromGraphId?: string;
}

export interface UpdateGraphDTO {
  name?: string;
  description?: string;
}

export interface CreateCourseDTO {
  name: string;
  color: string;
}

export interface UpdateCourseDTO {
  name?: string;
  color?: string;
}

export interface CreateTopicDTO {
  urlSlug: string;
  displayName: string;
  courseId: number;
  contentHtml?: string;
  contentText?: string;
}

export interface UpdateTopicDTO {
  displayName?: string;
  courseId?: number;
  contentHtml?: string;
  contentText?: string;
}

export interface CreateEdgeDTO {
  parentSlug: string;
  childSlug: string;
}

export interface BatchOperations {
  courses?: {
    create?: CreateCourseDTO[];
    update?: Array<{ courseId: number; data: UpdateCourseDTO }>;
    delete?: number[];
  };
  topics?: {
    create?: CreateTopicDTO[];
    update?: Array<{ urlSlug: string; data: UpdateTopicDTO }>;
    delete?: string[];
  };
  edges?: {
    create?: CreateEdgeDTO[];
    delete?: Array<{ parentSlug: string; childSlug: string }>;
  };
}

export interface BatchResult {
  coursesCreated: number;
  coursesUpdated: number;
  coursesDeleted: number;
  topicsCreated: number;
  topicsUpdated: number;
  topicsDeleted: number;
  edgesCreated: number;
  edgesDeleted: number;
}

// =============================================================================
// API Response wrapper
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// Utility: Convert API types to legacy types for components
// =============================================================================

export function apiCourseToLegacy(course: ApiCourse): Course {
  return {
    id: course.courseId,
    name: course.name,
    color: course.color,
  };
}

export function apiTopicToLegacy(topic: ApiTopic): Topic {
  return {
    id: topic.id,
    url_slug: topic.urlSlug,
    display_name: topic.displayName,
    course_id: topic.courseId,
    parent_slugs: topic.parentSlugs,
    content_html: topic.contentHtml,
    content_text: topic.contentText,
    has_content: topic.hasContent,
  };
}

export function apiEdgeToLegacy(edge: ApiEdge): Edge {
  return {
    id: edge.id,
    parent_slug: edge.parentSlug,
    child_slug: edge.childSlug,
  };
}

export function fullGraphDataToLegacy(data: FullGraphData): GraphData {
  return {
    courses: data.courses.map(apiCourseToLegacy),
    topics: data.topics.map(apiTopicToLegacy),
    edges: data.edges.map(apiEdgeToLegacy),
  };
}
