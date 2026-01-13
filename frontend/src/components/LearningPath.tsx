import type { Node } from '@xyflow/react';
import type { TopicNodeData } from '../utils/graphUtils';

interface LearningPathProps {
  path: Node<TopicNodeData>[];
  onNodeClick: (nodeId: string) => void;
}

export default function LearningPath({ path, onNodeClick }: LearningPathProps) {
  return (
    <div id="learning-path">
      <h3>
        Learning Path <span id="path-count">({path.length} topics)</span>
      </h3>
      <p className="path-description">
        All topics you need to master, in recommended order:
      </p>
      <ol id="learning-path-list">
        {path.map((node) => (
          <li key={node.id} onClick={() => onNodeClick(node.id)}>
            <span
              className="course-dot"
              style={{ backgroundColor: node.data.borderColor }}
            />
            {node.data.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
