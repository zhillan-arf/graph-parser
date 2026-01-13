import { useState, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { TopicNodeData } from '../utils/graphUtils';
import { getParents, getChildren, getLearningPath, isLightColor } from '../utils/graphUtils';
import LearningPath from './LearningPath';

interface DetailPanelProps {
  node: Node<TopicNodeData>;
  allNodes: Node<TopicNodeData>[];
  edges: Edge[];
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
}

export default function DetailPanel({
  node,
  allNodes,
  edges,
  onClose,
  onNodeClick,
}: DetailPanelProps) {
  const [showLearningPath, setShowLearningPath] = useState(false);

  const parents = useMemo(() => {
    const parentIds = getParents(node.id, edges);
    return allNodes.filter((n) => parentIds.includes(n.id));
  }, [node.id, edges, allNodes]);

  const children = useMemo(() => {
    const childIds = getChildren(node.id, edges);
    return allNodes.filter((n) => childIds.includes(n.id));
  }, [node.id, edges, allNodes]);

  const learningPath = useMemo(() => {
    if (!showLearningPath) return [];
    return getLearningPath(node.id, allNodes, edges);
  }, [showLearningPath, node.id, allNodes, edges]);

  const badgeTextColor = isLightColor(node.data.color) ? '#1d1d1f' : '#ffffff';

  return (
    <aside id="detail-panel">
      <button id="close-panel" title="Close panel" onClick={onClose}>
        &times;
      </button>
      <div id="panel-content">
        <h2 id="topic-title">{node.data.label}</h2>
        <div id="topic-meta">
          <span
            id="topic-course"
            className="course-badge"
            style={{
              backgroundColor: node.data.color,
              color: badgeTextColor,
            }}
          >
            {node.data.courseName}
          </span>
        </div>
        <div id="topic-actions">
          <button
            id="show-learning-path"
            className={`action-btn ${showLearningPath ? 'active' : ''}`}
            onClick={() => setShowLearningPath(!showLearningPath)}
          >
            {showLearningPath ? 'Hide Learning Path' : 'Show Learning Path'}
          </button>
        </div>

        {showLearningPath && (
          <LearningPath path={learningPath} onNodeClick={onNodeClick} />
        )}

        <div id="prerequisites">
          <h3>Direct Prerequisites</h3>
          <ul id="prereq-list">
            {parents.length > 0 ? (
              parents.map((parent) => (
                <li key={parent.id} onClick={() => onNodeClick(parent.id)}>
                  {parent.data.label}
                </li>
              ))
            ) : (
              <li className="no-items">No prerequisites</li>
            )}
          </ul>
        </div>

        <div id="leads-to">
          <h3>Leads To</h3>
          <ul id="leads-list">
            {children.length > 0 ? (
              children.map((child) => (
                <li key={child.id} onClick={() => onNodeClick(child.id)}>
                  {child.data.label}
                </li>
              ))
            ) : (
              <li className="no-items">No dependent topics</li>
            )}
          </ul>
        </div>

        <div id="topic-content">
          <h3>Content Preview</h3>
          <div id="content-text">
            {node.data.hasContent && node.data.contentText ? (
              node.data.contentText.substring(0, 500) +
              (node.data.contentText.length > 500 ? '...' : '')
            ) : (
              <em>No content available</em>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
