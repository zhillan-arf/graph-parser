/**
 * Hook for fetching and managing the list of knowledge graphs.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { KnowledgeGraph, CreateGraphDTO } from '../types';

export function useGraphList() {
  const [graphs, setGraphs] = useState<KnowledgeGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.graphs.list();
      setGraphs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graphs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphs();
  }, [fetchGraphs]);

  const createGraph = useCallback(async (data: CreateGraphDTO): Promise<KnowledgeGraph> => {
    const newGraph = await api.graphs.create(data);
    setGraphs((prev) => [...prev, newGraph]);
    return newGraph;
  }, []);

  const deleteGraph = useCallback(async (id: string): Promise<void> => {
    await api.graphs.delete(id);
    setGraphs((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const getDefaultGraph = useCallback((): KnowledgeGraph | undefined => {
    return graphs.find((g) => g.isDefault);
  }, [graphs]);

  return {
    graphs,
    loading,
    error,
    refetch: fetchGraphs,
    createGraph,
    deleteGraph,
    getDefaultGraph,
  };
}
