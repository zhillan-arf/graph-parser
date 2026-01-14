/**
 * Hook for tracking pending changes in edit mode.
 * Changes are accumulated locally until the user saves.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  GraphData,
  Course,
  Topic,
  Edge,
  CreateCourseDTO,
  UpdateCourseDTO,
  CreateTopicDTO,
  UpdateTopicDTO,
  CreateEdgeDTO,
  BatchOperations,
} from '../types';

interface PendingChanges {
  courses: {
    created: Map<string, CreateCourseDTO & { tempId: string }>;
    updated: Map<number, UpdateCourseDTO>;
    deleted: Set<number>;
  };
  topics: {
    created: Map<string, CreateTopicDTO & { tempId: string }>;
    updated: Map<string, UpdateTopicDTO>;
    deleted: Set<string>;
  };
  edges: {
    created: Set<string>; // "parentSlug->childSlug"
    deleted: Set<string>; // "parentSlug->childSlug"
  };
}

function createEmptyChanges(): PendingChanges {
  return {
    courses: {
      created: new Map(),
      updated: new Map(),
      deleted: new Set(),
    },
    topics: {
      created: new Map(),
      updated: new Map(),
      deleted: new Set(),
    },
    edges: {
      created: new Set(),
      deleted: new Set(),
    },
  };
}

function edgeKey(parentSlug: string, childSlug: string): string {
  return `${parentSlug}->${childSlug}`;
}

function parseEdgeKey(key: string): { parentSlug: string; childSlug: string } {
  const [parentSlug, childSlug] = key.split('->');
  return { parentSlug, childSlug };
}

let tempIdCounter = 0;
function generateTempId(): string {
  return `temp-${++tempIdCounter}`;
}

export function useChangeTracking(originalData: GraphData | null) {
  const [changes, setChanges] = useState<PendingChanges>(createEmptyChanges());

  // Check if there are any unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return (
      changes.courses.created.size > 0 ||
      changes.courses.updated.size > 0 ||
      changes.courses.deleted.size > 0 ||
      changes.topics.created.size > 0 ||
      changes.topics.updated.size > 0 ||
      changes.topics.deleted.size > 0 ||
      changes.edges.created.size > 0 ||
      changes.edges.deleted.size > 0
    );
  }, [changes]);

  // Get merged data (original + pending changes)
  const mergedData = useMemo((): GraphData | null => {
    if (!originalData) return null;

    // Merge courses
    let courses = originalData.courses
      .filter((c) => !changes.courses.deleted.has(c.id))
      .map((c) => {
        const update = changes.courses.updated.get(c.id);
        if (update) {
          return { ...c, ...update };
        }
        return c;
      });

    // Add created courses (with temp IDs as negative numbers)
    const createdCourses: Course[] = Array.from(changes.courses.created.values()).map(
      (data, index) => ({
        id: -(index + 1), // Negative ID to distinguish from real courses
        name: data.name,
        color: data.color,
      })
    );
    courses = [...courses, ...createdCourses];

    // Merge topics
    let topics = originalData.topics
      .filter((t) => !changes.topics.deleted.has(t.url_slug))
      .map((t) => {
        const update = changes.topics.updated.get(t.url_slug);
        if (update) {
          return {
            ...t,
            display_name: update.displayName ?? t.display_name,
            course_id: update.courseId ?? t.course_id,
            content_html: update.contentHtml !== undefined ? update.contentHtml ?? null : t.content_html,
            content_text: update.contentText !== undefined ? update.contentText ?? null : t.content_text,
          };
        }
        return t;
      });

    // Add created topics
    const createdTopics: Topic[] = Array.from(changes.topics.created.values()).map(
      (data, index) => ({
        id: -(index + 1),
        url_slug: data.urlSlug,
        display_name: data.displayName,
        course_id: data.courseId,
        parent_slugs: [],
        content_html: data.contentHtml ?? null,
        content_text: data.contentText ?? null,
        has_content: Boolean(data.contentHtml || data.contentText),
      })
    );
    topics = [...topics, ...createdTopics];

    // Merge edges
    let edges = originalData.edges.filter(
      (e) => !changes.edges.deleted.has(edgeKey(e.parent_slug, e.child_slug))
    );

    // Add created edges
    const createdEdges: Edge[] = Array.from(changes.edges.created).map((key, index) => {
      const { parentSlug, childSlug } = parseEdgeKey(key);
      return {
        id: -(index + 1),
        parent_slug: parentSlug,
        child_slug: childSlug,
      };
    });
    edges = [...edges, ...createdEdges];

    // Update parent_slugs based on edges
    const parentSlugsMap = new Map<string, string[]>();
    for (const edge of edges) {
      const existing = parentSlugsMap.get(edge.child_slug) || [];
      existing.push(edge.parent_slug);
      parentSlugsMap.set(edge.child_slug, existing);
    }
    topics = topics.map((t) => ({
      ...t,
      parent_slugs: parentSlugsMap.get(t.url_slug) || [],
    }));

    return { courses, topics, edges };
  }, [originalData, changes]);

  // ==========================================================================
  // Course operations
  // ==========================================================================

  const createCourse = useCallback((data: CreateCourseDTO): string => {
    const tempId = generateTempId();
    setChanges((prev) => {
      const newCreated = new Map(prev.courses.created);
      newCreated.set(tempId, { ...data, tempId });
      return {
        ...prev,
        courses: { ...prev.courses, created: newCreated },
      };
    });
    return tempId;
  }, []);

  const updateCourse = useCallback((courseId: number, data: UpdateCourseDTO) => {
    setChanges((prev) => {
      const newUpdated = new Map(prev.courses.updated);
      const existing = newUpdated.get(courseId) || {};
      newUpdated.set(courseId, { ...existing, ...data });
      return {
        ...prev,
        courses: { ...prev.courses, updated: newUpdated },
      };
    });
  }, []);

  const deleteCourse = useCallback((courseId: number) => {
    setChanges((prev) => {
      const newDeleted = new Set(prev.courses.deleted);
      newDeleted.add(courseId);
      // Also remove any pending updates for this course
      const newUpdated = new Map(prev.courses.updated);
      newUpdated.delete(courseId);
      return {
        ...prev,
        courses: { ...prev.courses, deleted: newDeleted, updated: newUpdated },
      };
    });
  }, []);

  const undoDeleteCourse = useCallback((courseId: number) => {
    setChanges((prev) => {
      const newDeleted = new Set(prev.courses.deleted);
      newDeleted.delete(courseId);
      return {
        ...prev,
        courses: { ...prev.courses, deleted: newDeleted },
      };
    });
  }, []);

  // ==========================================================================
  // Topic operations
  // ==========================================================================

  const createTopic = useCallback((data: CreateTopicDTO): string => {
    const tempId = generateTempId();
    setChanges((prev) => {
      const newCreated = new Map(prev.topics.created);
      newCreated.set(tempId, { ...data, tempId });
      return {
        ...prev,
        topics: { ...prev.topics, created: newCreated },
      };
    });
    return tempId;
  }, []);

  const updateTopic = useCallback((urlSlug: string, data: UpdateTopicDTO) => {
    setChanges((prev) => {
      const newUpdated = new Map(prev.topics.updated);
      const existing = newUpdated.get(urlSlug) || {};
      newUpdated.set(urlSlug, { ...existing, ...data });
      return {
        ...prev,
        topics: { ...prev.topics, updated: newUpdated },
      };
    });
  }, []);

  const deleteTopic = useCallback((urlSlug: string) => {
    setChanges((prev) => {
      const newDeleted = new Set(prev.topics.deleted);
      newDeleted.add(urlSlug);
      // Remove pending updates
      const newUpdated = new Map(prev.topics.updated);
      newUpdated.delete(urlSlug);
      // Remove edges involving this topic
      const newEdgesCreated = new Set(prev.edges.created);
      const newEdgesDeleted = new Set(prev.edges.deleted);
      for (const key of newEdgesCreated) {
        const { parentSlug, childSlug } = parseEdgeKey(key);
        if (parentSlug === urlSlug || childSlug === urlSlug) {
          newEdgesCreated.delete(key);
        }
      }
      return {
        ...prev,
        topics: { ...prev.topics, deleted: newDeleted, updated: newUpdated },
        edges: { ...prev.edges, created: newEdgesCreated, deleted: newEdgesDeleted },
      };
    });
  }, []);

  const undoDeleteTopic = useCallback((urlSlug: string) => {
    setChanges((prev) => {
      const newDeleted = new Set(prev.topics.deleted);
      newDeleted.delete(urlSlug);
      return {
        ...prev,
        topics: { ...prev.topics, deleted: newDeleted },
      };
    });
  }, []);

  // ==========================================================================
  // Edge operations
  // ==========================================================================

  const createEdge = useCallback((data: CreateEdgeDTO) => {
    const key = edgeKey(data.parentSlug, data.childSlug);
    setChanges((prev) => {
      const newCreated = new Set(prev.edges.created);
      const newDeleted = new Set(prev.edges.deleted);
      // If it was previously deleted, just remove from deleted
      if (newDeleted.has(key)) {
        newDeleted.delete(key);
      } else {
        newCreated.add(key);
      }
      return {
        ...prev,
        edges: { created: newCreated, deleted: newDeleted },
      };
    });
  }, []);

  const deleteEdge = useCallback((parentSlug: string, childSlug: string) => {
    const key = edgeKey(parentSlug, childSlug);
    setChanges((prev) => {
      const newCreated = new Set(prev.edges.created);
      const newDeleted = new Set(prev.edges.deleted);
      // If it was previously created, just remove from created
      if (newCreated.has(key)) {
        newCreated.delete(key);
      } else {
        newDeleted.add(key);
      }
      return {
        ...prev,
        edges: { created: newCreated, deleted: newDeleted },
      };
    });
  }, []);

  // ==========================================================================
  // Batch operations
  // ==========================================================================

  const toBatchOperations = useCallback((): BatchOperations => {
    const ops: BatchOperations = {};

    // Courses
    if (changes.courses.created.size > 0 || changes.courses.updated.size > 0 || changes.courses.deleted.size > 0) {
      ops.courses = {};
      if (changes.courses.created.size > 0) {
        ops.courses.create = Array.from(changes.courses.created.values()).map(({ tempId, ...data }) => data);
      }
      if (changes.courses.updated.size > 0) {
        ops.courses.update = Array.from(changes.courses.updated.entries()).map(([courseId, data]) => ({
          courseId,
          data,
        }));
      }
      if (changes.courses.deleted.size > 0) {
        ops.courses.delete = Array.from(changes.courses.deleted);
      }
    }

    // Topics
    if (changes.topics.created.size > 0 || changes.topics.updated.size > 0 || changes.topics.deleted.size > 0) {
      ops.topics = {};
      if (changes.topics.created.size > 0) {
        ops.topics.create = Array.from(changes.topics.created.values()).map(({ tempId, ...data }) => data);
      }
      if (changes.topics.updated.size > 0) {
        ops.topics.update = Array.from(changes.topics.updated.entries()).map(([urlSlug, data]) => ({
          urlSlug,
          data,
        }));
      }
      if (changes.topics.deleted.size > 0) {
        ops.topics.delete = Array.from(changes.topics.deleted);
      }
    }

    // Edges
    if (changes.edges.created.size > 0 || changes.edges.deleted.size > 0) {
      ops.edges = {};
      if (changes.edges.created.size > 0) {
        ops.edges.create = Array.from(changes.edges.created).map(parseEdgeKey);
      }
      if (changes.edges.deleted.size > 0) {
        ops.edges.delete = Array.from(changes.edges.deleted).map(parseEdgeKey);
      }
    }

    return ops;
  }, [changes]);

  const clearChanges = useCallback(() => {
    setChanges(createEmptyChanges());
  }, []);

  const discardChanges = clearChanges;

  return {
    // State
    mergedData,
    hasUnsavedChanges,
    changes,

    // Course operations
    createCourse,
    updateCourse,
    deleteCourse,
    undoDeleteCourse,

    // Topic operations
    createTopic,
    updateTopic,
    deleteTopic,
    undoDeleteTopic,

    // Edge operations
    createEdge,
    deleteEdge,

    // Batch operations
    toBatchOperations,
    clearChanges,
    discardChanges,
  };
}
