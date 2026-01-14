/**
 * Dropdown component for selecting and managing knowledge graphs.
 */

import { useState, useRef, useEffect } from 'react';
import type { KnowledgeGraph } from '../../types';
import './GraphSelector.css';

interface GraphSelectorProps {
  graphs: KnowledgeGraph[];
  selectedId: string | null;
  onChange: (id: string) => void;
  onCreateEmpty: () => void;
  onCreateCopy: () => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
}

export default function GraphSelector({
  graphs,
  selectedId,
  onChange,
  onCreateEmpty,
  onCreateCopy,
  onDelete,
  disabled = false,
}: GraphSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedGraph = graphs.find((g) => g.id === selectedId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Are you sure you want to delete this graph?')) {
      onDelete(id);
    }
  };

  return (
    <div className="graph-selector" ref={dropdownRef}>
      <button
        className="graph-selector-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        type="button"
      >
        <span className="graph-selector-name">
          {selectedGraph?.name || 'Select Graph'}
        </span>
        {selectedGraph?.isReadonly && (
          <span className="graph-selector-badge readonly">Read-only</span>
        )}
        <span className="graph-selector-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="graph-selector-dropdown">
          <div className="graph-selector-create-section">
            <button
              className="graph-selector-create-btn"
              onClick={() => {
                onCreateEmpty();
                setIsOpen(false);
              }}
              type="button"
            >
              + Empty Graph
            </button>
            <button
              className="graph-selector-create-btn"
              onClick={() => {
                onCreateCopy();
                setIsOpen(false);
              }}
              type="button"
            >
              + Copy Default
            </button>
          </div>

          <div className="graph-selector-divider" />

          <div className="graph-selector-list">
            {graphs.map((graph) => (
              <div
                key={graph.id}
                className={`graph-selector-option ${graph.id === selectedId ? 'selected' : ''}`}
                onClick={() => handleSelect(graph.id)}
              >
                <span className="graph-selector-option-name">{graph.name}</span>
                <div className="graph-selector-option-badges">
                  {graph.isDefault && (
                    <span className="graph-selector-badge default">Default</span>
                  )}
                  {graph.isReadonly && (
                    <span className="graph-selector-badge readonly">Read-only</span>
                  )}
                  {!graph.isDefault && onDelete && (
                    <button
                      className="graph-selector-delete-btn"
                      onClick={(e) => handleDelete(e, graph.id)}
                      title="Delete graph"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
