import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TopicNode from './TopicNode';
import type { GraphData, Course, LayoutType } from '../types';
import {
  darkenColor,
  getLayoutedElements,
  getAncestors,
  type TopicNodeData,
} from '../utils/graphUtils';

interface GraphViewerProps {
  data: GraphData;
  courseMap: Map<number, Course>;
  searchQuery: string;
  courseFilter: string;
  layout: LayoutType;
  onNodeSelect: (node: Node<TopicNodeData> | null) => void;
  onStatsUpdate: (visible: number, nodes: Node<TopicNodeData>[], edges: Edge[]) => void;
}

const nodeTypes = { topic: TopicNode };

export default function GraphViewer({
  data,
  courseMap,
  searchQuery,
  courseFilter,
  layout,
  onNodeSelect,
  onStatsUpdate,
}: GraphViewerProps) {
  const [highlightedPath, setHighlightedPath] = useState<{
    ancestors: Set<string>;
    selectedId: string;
  } | null>(null);

  // Build initial nodes and edges from data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<TopicNodeData>[] = data.topics.map((topic) => {
      const course = courseMap.get(topic.course_id);
      const color = course?.color || '#888888';
      const borderColor = darkenColor(color, 0.3);

      return {
        id: topic.url_slug,
        type: 'topic',
        position: { x: 0, y: 0 },
        data: {
          label: topic.display_name,
          color,
          borderColor,
          courseId: topic.course_id,
          courseName: course?.name || 'Unknown',
          hasContent: topic.has_content,
          contentText: topic.content_text,
          urlSlug: topic.url_slug,
        },
      };
    });

    const edges: Edge[] = data.edges.map((edge) => ({
      id: `${edge.parent_slug}->${edge.child_slug}`,
      source: edge.parent_slug,
      target: edge.child_slug,
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      style: { strokeWidth: 1.5, stroke: '#86868b' },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [data, courseMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Re-layout when layout type changes or initial data changes
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layout, initialNodes, initialEdges, setNodes, setEdges]);

  // Apply search and course filters
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();

    setNodes((nds) =>
      nds.map((node) => {
        const matchesSearch =
          !searchQuery ||
          node.data.label.toLowerCase().includes(lowerQuery) ||
          node.id.toLowerCase().includes(lowerQuery);

        const matchesCourse =
          courseFilter === 'all' || node.data.courseId === parseInt(courseFilter);

        const isVisible = matchesCourse;
        const isDimmed = searchQuery && !matchesSearch;
        const isSearchMatch = searchQuery && matchesSearch;

        return {
          ...node,
          hidden: !isVisible,
          className: `${isDimmed ? 'dimmed' : ''} ${isSearchMatch ? 'search-match' : ''} ${
            highlightedPath?.ancestors.has(node.id) ? 'path-ancestor' : ''
          } ${highlightedPath?.selectedId === node.id ? 'highlighted' : ''} ${
            highlightedPath && !highlightedPath.ancestors.has(node.id) && highlightedPath.selectedId !== node.id ? 'dimmed' : ''
          }`.trim(),
        };
      })
    );
  }, [searchQuery, courseFilter, highlightedPath, setNodes]);

  // Update edges based on node visibility and highlighting
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        const sourceHidden = sourceNode?.hidden;
        const targetHidden = targetNode?.hidden;

        const isHighlighted =
          highlightedPath &&
          (highlightedPath.ancestors.has(edge.source) &&
            (highlightedPath.ancestors.has(edge.target) ||
              edge.target === highlightedPath.selectedId));

        return {
          ...edge,
          hidden: sourceHidden || targetHidden,
          className: highlightedPath
            ? isHighlighted
              ? 'highlighted'
              : 'dimmed'
            : '',
          style: {
            ...edge.style,
            stroke: isHighlighted ? '#bf8f00' : '#86868b',
            strokeWidth: isHighlighted ? 3 : 1.5,
          },
        };
      })
    );
  }, [nodes, highlightedPath, setEdges]);

  // Update stats
  useEffect(() => {
    const visibleCount = nodes.filter((n) => !n.hidden).length;
    onStatsUpdate(visibleCount, nodes as Node<TopicNodeData>[], edges);
  }, [nodes, edges, onStatsUpdate]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0] as Node<TopicNodeData>;
        onNodeSelect(node);
        const ancestors = getAncestors(node.id, edges);
        setHighlightedPath({ ancestors, selectedId: node.id });
      } else {
        onNodeSelect(null);
        setHighlightedPath(null);
      }
    },
    [onNodeSelect, edges]
  );

  return (
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={3}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
