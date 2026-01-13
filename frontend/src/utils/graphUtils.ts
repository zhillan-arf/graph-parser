import type { Node, Edge } from '@xyflow/react';
import Dagre from '@dagrejs/dagre';

export interface TopicNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  borderColor: string;
  courseId: number;
  courseName: string;
  hasContent: boolean;
  contentText: string | null;
  urlSlug: string;
}

export function darkenColor(hex: string, factor: number): string {
  if (hex === 'gray') return '#555555';
  if (!hex.startsWith('#')) return hex;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darken = (c: number) => Math.floor(c * (1 - factor));

  return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}

export function isLightColor(hex: string): boolean {
  if (hex === 'gray') return false;
  if (!hex.startsWith('#')) return true;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function getLayoutedElements(
  nodes: Node<TopicNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node<TopicNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 150, height: 40 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const position = g.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - 75,
        y: position.y - 20,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Get all ancestor node IDs (predecessors)
export function getAncestors(
  nodeId: string,
  edges: Edge[]
): Set<string> {
  const ancestors = new Set<string>();
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.target === current && !ancestors.has(edge.source)) {
        ancestors.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return ancestors;
}

// Get all descendant node IDs (successors)
export function getDescendants(
  nodeId: string,
  edges: Edge[]
): Set<string> {
  const descendants = new Set<string>();
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current && !descendants.has(edge.target)) {
        descendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return descendants;
}

// Get direct parents (immediate predecessors)
export function getParents(nodeId: string, edges: Edge[]): string[] {
  return edges.filter(e => e.target === nodeId).map(e => e.source);
}

// Get direct children (immediate successors)
export function getChildren(nodeId: string, edges: Edge[]): string[] {
  return edges.filter(e => e.source === nodeId).map(e => e.target);
}

// Topological sort for learning path (Kahn's algorithm)
export function getLearningPath(
  nodeId: string,
  nodes: Node<TopicNodeData>[],
  edges: Edge[]
): Node<TopicNodeData>[] {
  const ancestors = getAncestors(nodeId, edges);
  ancestors.add(nodeId);

  // Filter nodes and edges to only those in the subgraph
  const subgraphNodes = nodes.filter(n => ancestors.has(n.id));
  const subgraphEdges = edges.filter(e => ancestors.has(e.source) && ancestors.has(e.target));

  // Build in-degree map
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  subgraphNodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  });

  subgraphEdges.forEach(e => {
    adjList.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // Start with nodes that have no prerequisites in the subgraph
  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  const sorted: Node<TopicNodeData>[] = [];
  const nodeMap = new Map(subgraphNodes.map(n => [n.id, n]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    adjList.get(id)?.forEach(childId => {
      const newDegree = (inDegree.get(childId) || 0) - 1;
      inDegree.set(childId, newDegree);
      if (newDegree === 0) queue.push(childId);
    });
  }

  return sorted;
}
