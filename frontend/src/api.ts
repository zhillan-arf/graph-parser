/**
 * API client for the knowledge graph API.
 * Provides typed methods for all CRUD operations.
 */

import type {
  ApiResponse,
  KnowledgeGraph,
  FullGraphData,
  ApiCourse,
  ApiTopic,
  ApiEdge,
  CreateGraphDTO,
  UpdateGraphDTO,
  CreateCourseDTO,
  UpdateCourseDTO,
  CreateTopicDTO,
  UpdateTopicDTO,
  CreateEdgeDTO,
  BatchOperations,
  BatchResult,
} from './types';

const API_BASE = '/api/v1/graphs';

class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success || !data.data) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred',
      data.error?.details
    );
  }

  return data.data;
}

// =============================================================================
// Knowledge Graphs
// =============================================================================

export async function listGraphs(): Promise<KnowledgeGraph[]> {
  return request<KnowledgeGraph[]>(API_BASE);
}

export async function getGraph(id: string): Promise<KnowledgeGraph> {
  return request<KnowledgeGraph>(`${API_BASE}/${id}`);
}

export async function createGraph(data: CreateGraphDTO): Promise<KnowledgeGraph> {
  return request<KnowledgeGraph>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGraph(id: string, data: UpdateGraphDTO): Promise<KnowledgeGraph> {
  return request<KnowledgeGraph>(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGraph(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
}

export async function getFullGraphData(id: string): Promise<FullGraphData> {
  return request<FullGraphData>(`${API_BASE}/${id}/data`);
}

export async function batchUpdate(graphId: string, operations: BatchOperations): Promise<BatchResult> {
  return request<BatchResult>(`${API_BASE}/${graphId}/batch`, {
    method: 'POST',
    body: JSON.stringify(operations),
  });
}

// =============================================================================
// Courses
// =============================================================================

export async function listCourses(graphId: string): Promise<ApiCourse[]> {
  return request<ApiCourse[]>(`${API_BASE}/${graphId}/courses`);
}

export async function getCourse(graphId: string, courseId: number): Promise<ApiCourse> {
  return request<ApiCourse>(`${API_BASE}/${graphId}/courses/${courseId}`);
}

export async function createCourse(graphId: string, data: CreateCourseDTO): Promise<ApiCourse> {
  return request<ApiCourse>(`${API_BASE}/${graphId}/courses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(
  graphId: string,
  courseId: number,
  data: UpdateCourseDTO
): Promise<ApiCourse> {
  return request<ApiCourse>(`${API_BASE}/${graphId}/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(graphId: string, courseId: number): Promise<void> {
  await request<{ deleted: boolean }>(`${API_BASE}/${graphId}/courses/${courseId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Topics
// =============================================================================

export async function listTopics(graphId: string): Promise<ApiTopic[]> {
  return request<ApiTopic[]>(`${API_BASE}/${graphId}/topics`);
}

export async function getTopic(graphId: string, urlSlug: string): Promise<ApiTopic> {
  return request<ApiTopic>(`${API_BASE}/${graphId}/topics/${urlSlug}`);
}

export async function createTopic(graphId: string, data: CreateTopicDTO): Promise<ApiTopic> {
  return request<ApiTopic>(`${API_BASE}/${graphId}/topics`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTopic(
  graphId: string,
  urlSlug: string,
  data: UpdateTopicDTO
): Promise<ApiTopic> {
  return request<ApiTopic>(`${API_BASE}/${graphId}/topics/${urlSlug}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTopic(graphId: string, urlSlug: string): Promise<void> {
  await request<{ deleted: boolean }>(`${API_BASE}/${graphId}/topics/${urlSlug}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Edges
// =============================================================================

export async function listEdges(graphId: string): Promise<ApiEdge[]> {
  return request<ApiEdge[]>(`${API_BASE}/${graphId}/edges`);
}

export async function createEdge(graphId: string, data: CreateEdgeDTO): Promise<ApiEdge> {
  return request<ApiEdge>(`${API_BASE}/${graphId}/edges`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteEdge(
  graphId: string,
  parentSlug: string,
  childSlug: string
): Promise<void> {
  await request<{ deleted: boolean }>(`${API_BASE}/${graphId}/edges/${parentSlug}/${childSlug}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Export API client as object
// =============================================================================

export const api = {
  graphs: {
    list: listGraphs,
    get: getGraph,
    create: createGraph,
    update: updateGraph,
    delete: deleteGraph,
    getData: getFullGraphData,
    batchUpdate,
  },
  courses: {
    list: listCourses,
    get: getCourse,
    create: createCourse,
    update: updateCourse,
    delete: deleteCourse,
  },
  topics: {
    list: listTopics,
    get: getTopic,
    create: createTopic,
    update: updateTopic,
    delete: deleteTopic,
  },
  edges: {
    list: listEdges,
    create: createEdge,
    delete: deleteEdge,
  },
};

export { ApiError };
