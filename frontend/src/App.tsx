import { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider, useReactFlow, type Node, type Edge } from '@xyflow/react';

import GraphViewer from './components/GraphViewer';
import Header from './components/Header';
import Footer from './components/Footer';
import DetailPanel from './components/DetailPanel';
import { CreateGraphModal } from './components/graph-selector';
import { TableView } from './components/table';
import { Notification, UnsavedBanner } from './components/edit';
import { useGraphData } from './hooks/useGraphData';
import { useGraphList } from './hooks/useGraphList';
import { useChangeTracking } from './hooks/useChangeTracking';
import { api } from './api';
import type { LayoutType, ViewMode, CreateGraphDTO } from './types';
import type { TopicNodeData } from './utils/graphUtils';

// Max zoom in level - matches the zoom when clicking on a topic in Learning Path
const MAX_ZOOM_IN = 2;


function AppContent() {
  // Graph list state
  const {
    graphs,
    loading: graphsLoading,
    createGraph: createNewGraph,
    deleteGraph: deleteExistingGraph,
    getDefaultGraph,
  } = useGraphList();

  // Selected graph state
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  // Auto-select default graph on initial load
  useEffect(() => {
    if (!graphsLoading && graphs.length > 0 && !selectedGraphId) {
      const defaultGraph = getDefaultGraph();
      if (defaultGraph) {
        setSelectedGraphId(defaultGraph.id);
      }
    }
  }, [graphsLoading, graphs, selectedGraphId, getDefaultGraph]);

  // Fetch data for selected graph
  const { data, loading: dataLoading, error, courseMap, currentGraph, refetch: refetchData } = useGraphData({
    graphId: selectedGraphId,
  });

  // Change tracking for edit mode
  const {
    mergedData,
    hasUnsavedChanges,
    toBatchOperations,
    clearChanges,
    createCourse,
    updateCourse,
    deleteCourse,
    createTopic,
    updateTopic,
    deleteTopic,
    createEdge,
    deleteEdge,
  } = useChangeTracking(data);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [layout, setLayout] = useState<LayoutType>('dagre');
  const [selectedNode, setSelectedNode] = useState<Node<TopicNodeData> | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [graphNodes, setGraphNodes] = useState<Node<TopicNodeData>[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<'empty' | 'copy'>('empty');

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { fitView } = useReactFlow();

  // Handlers
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.1 });
  }, [fitView]);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setCourseFilter('all');
    setSelectedNode(null);
    setTimeout(() => fitView({ padding: 0.1 }), 100);
  }, [fitView]);

  const handleNodeSelect = useCallback((node: Node<TopicNodeData> | null) => {
    setSelectedNode(node);
  }, []);

  const handleStatsUpdate = useCallback((visible: number, nodes: Node<TopicNodeData>[], edges: Edge[]) => {
    setVisibleCount(visible);
    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = graphNodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        fitView({ nodes: [node], padding: 0.5, duration: 300, maxZoom: MAX_ZOOM_IN });
      }
    },
    [graphNodes, fitView]
  );

  const handleGraphChange = useCallback((id: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Switch graphs anyway?')) {
        return;
      }
      clearChanges();
    }
    setSelectedGraphId(id);
    setIsEditMode(false);
    setSelectedNode(null);
  }, [hasUnsavedChanges, clearChanges]);

  const handleCreateEmptyGraph = useCallback(() => {
    setCreateModalMode('empty');
    setCreateModalOpen(true);
  }, []);

  const handleCreateCopyGraph = useCallback(() => {
    setCreateModalMode('copy');
    setCreateModalOpen(true);
  }, []);

  const handleCreateGraph = useCallback(async (dto: CreateGraphDTO) => {
    const newGraph = await createNewGraph(dto);
    setSelectedGraphId(newGraph.id);
    setNotification({ message: `Created "${newGraph.name}"`, type: 'success' });
  }, [createNewGraph]);

  const handleDeleteGraph = useCallback(async (id: string) => {
    try {
      await deleteExistingGraph(id);
      if (selectedGraphId === id) {
        const defaultGraph = getDefaultGraph();
        setSelectedGraphId(defaultGraph?.id || null);
      }
      setNotification({ message: 'Graph deleted', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Failed to delete graph', type: 'error' });
    }
  }, [deleteExistingGraph, selectedGraphId, getDefaultGraph]);

  const handleEditModeToggle = useCallback(() => {
    if (isEditMode && hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Exit edit mode anyway?')) {
        return;
      }
      clearChanges();
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, hasUnsavedChanges, clearChanges]);

  const handleSave = useCallback(async () => {
    if (!selectedGraphId || !hasUnsavedChanges) return;

    try {
      setIsSaving(true);
      const operations = toBatchOperations();
      await api.graphs.batchUpdate(selectedGraphId, operations);
      clearChanges();
      await refetchData();
      setNotification({ message: 'Changes saved successfully', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Failed to save changes', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [selectedGraphId, hasUnsavedChanges, toBatchOperations, clearChanges, refetchData]);

  const handleDiscard = useCallback(() => {
    if (window.confirm('Discard all unsaved changes?')) {
      clearChanges();
    }
  }, [clearChanges]);

  // Loading state
  const loading = graphsLoading || dataLoading;

  if (loading && !data) {
    return (
      <div id="app">
        <div id="loading">Loading graph data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="app">
        <div id="loading">
          Failed to load graph data. Please ensure the server is running.
        </div>
      </div>
    );
  }

  // Use merged data (with pending changes) in edit mode, otherwise original data
  const displayData = isEditMode && mergedData ? mergedData : data;

  if (!displayData) {
    return null;
  }

  const isReadonly = currentGraph?.isReadonly ?? true;

  return (
    <div id="app">
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Unsaved changes banner */}
      {isEditMode && hasUnsavedChanges && (
        <UnsavedBanner onSave={handleSave} onDiscard={handleDiscard} isSaving={isSaving} />
      )}

      <Header
        // Graph selection
        graphs={graphs}
        selectedGraphId={selectedGraphId}
        onGraphChange={handleGraphChange}
        onCreateEmptyGraph={handleCreateEmptyGraph}
        onCreateCopyGraph={handleCreateCopyGraph}
        onDeleteGraph={handleDeleteGraph}
        // View mode
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        // Edit mode
        isReadonly={isReadonly}
        isEditMode={isEditMode}
        onEditModeToggle={handleEditModeToggle}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        isSaving={isSaving}
        // Existing props
        courses={displayData.courses}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        courseFilter={courseFilter}
        onCourseFilterChange={setCourseFilter}
        layout={layout}
        onLayoutChange={setLayout}
        onFitView={handleFitView}
        onReset={handleReset}
      />

      <main>
        {viewMode === 'graph' ? (
          <>
            <GraphViewer
              data={displayData}
              courseMap={courseMap}
              searchQuery={searchQuery}
              courseFilter={courseFilter}
              layout={layout}
              onNodeSelect={handleNodeSelect}
              onStatsUpdate={handleStatsUpdate}
            />
            {selectedNode && (
              <DetailPanel
                node={selectedNode}
                allNodes={graphNodes}
                edges={graphEdges}
                onClose={() => setSelectedNode(null)}
                onNodeClick={handleNodeClick}
                isEditMode={isEditMode}
                allTopics={displayData.topics}
                onCreateEdge={createEdge}
                onDeleteEdge={deleteEdge}
                onUpdateTopic={updateTopic}
              />
            )}
          </>
        ) : (
          <TableView
            data={displayData}
            isEditMode={isEditMode}
            editHandlers={{
              createCourse,
              updateCourse,
              deleteCourse,
              createTopic,
              updateTopic,
              deleteTopic,
              createEdge,
              deleteEdge,
            }}
          />
        )}
      </main>

      <Footer
        courses={displayData.courses}
        totalTopics={displayData.topics.length}
        totalEdges={displayData.edges.length}
        visibleCount={visibleCount}
      />

      {/* Create Graph Modal */}
      <CreateGraphModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateGraph}
        defaultGraphId={getDefaultGraph()?.id}
        mode={createModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
