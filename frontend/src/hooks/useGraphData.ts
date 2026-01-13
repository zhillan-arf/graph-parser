import { useState, useEffect } from 'react';
import type { GraphData, Course } from '../types';

export function useGraphData() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseMap, setCourseMap] = useState<Map<number, Course>>(new Map());

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/graph');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const graphData: GraphData = await response.json();
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
    }

    fetchData();
  }, []);

  return { data, loading, error, courseMap };
}
