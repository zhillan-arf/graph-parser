import { useState, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { TopicNodeData } from '../utils/graphUtils';
import type { Topic, CreateEdgeDTO, UpdateTopicDTO } from '../types';
import { getParents, getChildren, getLearningPath, isLightColor } from '../utils/graphUtils';
import { AutocompleteInput } from './edit';
import LearningPath from './LearningPath';

interface DetailPanelProps {
  node: Node<TopicNodeData>;
  allNodes: Node<TopicNodeData>[];
  edges: Edge[];
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
  // Edit mode props
  isEditMode?: boolean;
  allTopics?: Topic[];
  onCreateEdge?: (data: CreateEdgeDTO) => void;
  onDeleteEdge?: (parentSlug: string, childSlug: string) => void;
  onUpdateTopic?: (urlSlug: string, data: UpdateTopicDTO) => void;
}

export default function DetailPanel({
  node,
  allNodes,
  edges,
  onClose,
  onNodeClick,
  isEditMode = false,
  allTopics = [],
  onCreateEdge,
  onDeleteEdge,
  onUpdateTopic,
}: DetailPanelProps) {
  const [showLearningPath, setShowLearningPath] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(node.data.label);

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

  const parentSlugs = useMemo(() => {
    return new Set(parents.map((p) => p.id));
  }, [parents]);

  const childSlugs = useMemo(() => {
    return new Set(children.map((c) => c.id));
  }, [children]);

  const badgeTextColor = isLightColor(node.data.color) ? '#1d1d1f' : '#ffffff';

  const handleAddPrereq = (topic: Topic) => {
    if (onCreateEdge) {
      onCreateEdge({ parentSlug: topic.url_slug, childSlug: node.id });
    }
  };

  const handleRemovePrereq = (parentId: string) => {
    if (onDeleteEdge) {
      onDeleteEdge(parentId, node.id);
    }
  };

  const handleAddLeadsTo = (topic: Topic) => {
    if (onCreateEdge) {
      onCreateEdge({ parentSlug: node.id, childSlug: topic.url_slug });
    }
  };

  const handleRemoveLeadsTo = (childId: string) => {
    if (onDeleteEdge) {
      onDeleteEdge(node.id, childId);
    }
  };

  const handleTitleSave = () => {
    if (editTitle && editTitle !== node.data.label && onUpdateTopic) {
      onUpdateTopic(node.id, { displayName: editTitle });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(node.data.label);
      setIsEditingTitle(false);
    }
  };

  // Slugs to exclude from autocomplete (current node + already connected)
  const prereqExcludeSlugs = useMemo(() => {
    const slugs = [node.id, ...parentSlugs];
    return slugs;
  }, [node.id, parentSlugs]);

  const leadsToExcludeSlugs = useMemo(() => {
    const slugs = [node.id, ...childSlugs];
    return slugs;
  }, [node.id, childSlugs]);

  return (
    <aside id="detail-panel" className={isEditMode ? 'edit-mode' : ''}>
      <button id="close-panel" title="Close panel" onClick={onClose}>
        &times;
      </button>
      <div id="panel-content">
        {isEditMode && isEditingTitle ? (
          <input
            type="text"
            className="title-edit-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h2
            id="topic-title"
            className={isEditMode ? 'editable' : ''}
            onClick={() => isEditMode && setIsEditingTitle(true)}
            title={isEditMode ? 'Click to edit' : undefined}
          >
            {node.data.label}
            {isEditMode && <span className="edit-icon">✎</span>}
          </h2>
        )}
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
                <li key={parent.id} className={isEditMode ? 'with-action' : ''}>
                  <span onClick={() => onNodeClick(parent.id)}>
                    {parent.data.label}
                  </span>
                  {isEditMode && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemovePrereq(parent.id)}
                      title="Remove prerequisite"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li className="no-items">No prerequisites</li>
            )}
          </ul>
          {isEditMode && (
            <div className="add-relationship">
              <AutocompleteInput
                topics={allTopics}
                excludeSlugs={prereqExcludeSlugs}
                placeholder="Add prerequisite..."
                onSelect={handleAddPrereq}
              />
            </div>
          )}
        </div>

        <div id="leads-to">
          <h3>Leads To</h3>
          <ul id="leads-list">
            {children.length > 0 ? (
              children.map((child) => (
                <li key={child.id} className={isEditMode ? 'with-action' : ''}>
                  <span onClick={() => onNodeClick(child.id)}>
                    {child.data.label}
                  </span>
                  {isEditMode && (
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveLeadsTo(child.id)}
                      title="Remove relationship"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li className="no-items">No dependent topics</li>
            )}
          </ul>
          {isEditMode && (
            <div className="add-relationship">
              <AutocompleteInput
                topics={allTopics}
                excludeSlugs={leadsToExcludeSlugs}
                placeholder="Add leads-to topic..."
                onSelect={handleAddLeadsTo}
              />
            </div>
          )}
        </div>

        <div id="topic-content">
          <h3>Content</h3>
          <div id="content-text">
            {node.data.hasContent && node.data.contentText ? (
              node.data.contentText
            ) : (
              <em>No content available</em>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
