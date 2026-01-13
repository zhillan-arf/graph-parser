import { useState, useCallback } from 'react';
import { ReactFlowProvider, useReactFlow, type Node, type Edge } from '@xyflow/react';

import GraphViewer from './components/GraphViewer';
import Header from './components/Header';
import Footer from './components/Footer';
import DetailPanel from './components/DetailPanel';
import { useGraphData } from './hooks/useGraphData';
import type { LayoutType } from './types';
import type { TopicNodeData } from './utils/graphUtils';

function AppContent() {
  const { data, loading, error, courseMap } = useGraphData();
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [layout, setLayout] = useState<LayoutType>('dagre');
  const [selectedNode, setSelectedNode] = useState<Node<TopicNodeData> | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [graphNodes, setGraphNodes] = useState<Node<TopicNodeData>[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);

  const { fitView } = useReactFlow();

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
        fitView({ nodes: [node], padding: 0.5, duration: 300 });
      }
    },
    [graphNodes, fitView]
  );

  if (loading) {
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

  if (!data) {
    return null;
  }

  return (
    <div id="app">
      <Header
        courses={data.courses}
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
        <GraphViewer
          data={data}
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
          />
        )}
      </main>
      <Footer
        courses={data.courses}
        totalTopics={data.topics.length}
        totalEdges={data.edges.length}
        visibleCount={visibleCount}
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
