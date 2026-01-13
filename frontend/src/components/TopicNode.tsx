import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { TopicNodeData } from '../utils/graphUtils';

type TopicNodeType = Node<TopicNodeData, 'topic'>;

function TopicNode({ data, selected }: NodeProps<TopicNodeType>) {
  return (
    <div
      className={`topic-node ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: data.color,
        borderColor: selected ? '#0071e3' : data.borderColor,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="topic-label">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(TopicNode);
