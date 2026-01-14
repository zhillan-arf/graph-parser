import { useState, useEffect, useCallback } from 'react';
import type { GraphData, Course, KnowledgeGraph, FullGraphData } from '../types';
import { fullGraphDataToLegacy } from '../types';
import { api } from '../api';

interface UseGraphDataOptions {
  graphId?: string | null;
  useLegacyApi?: boolean;
}

export function useGraphData(options: UseGraphDataOptions = {}) {
  const { graphId = null, useLegacyApi = false } = options;

  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseMap, setCourseMap] = useState<Map<number, Course>>(new Map());
  const [currentGraph, setCurrentGraph] = useState<KnowledgeGraph | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let graphData: GraphData;

      if (useLegacyApi || !graphId) {
        // Use legacy API (for backwards compatibility)
        const response = await fetch('/api/graph');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        graphData = await response.json();
        setCurrentGraph(null);
      } else {
        // Use new v1 API
        const fullData: FullGraphData = await api.graphs.getData(graphId);
        graphData = fullGraphDataToLegacy(fullData);
        setCurrentGraph(fullData.graph);
      }

      setData(graphData);

      // Build course map for quick lookup
      const map = new Map<number, Course>();
      graphData.courses.forEach(course => {
        map.set(course.id, course);
      });
      setCourseMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [graphId, useLegacyApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    courseMap,
    currentGraph,
    refetch: fetchData,
  };
}
