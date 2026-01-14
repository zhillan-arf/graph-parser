import { useState, useMemo } from 'react';
import type { Topic, CreateEdgeDTO } from '../../types';
import './CreateModal.css';

interface CreateEdgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateEdgeDTO) => void;
  topics: Topic[];
  existingEdges: Set<string>; // "parentSlug->childSlug"
}

export function CreateEdgeModal({
  isOpen,
  onClose,
  onCreate,
  topics,
  existingEdges,
}: CreateEdgeModalProps) {
  const [parentSlug, setParentSlug] = useState('');
  const [childSlug, setChildSlug] = useState('');
  const [searchParent, setSearchParent] = useState('');
  const [searchChild, setSearchChild] = useState('');

  const filteredParentTopics = useMemo(() => {
    if (!searchParent) return topics.slice(0, 50);
    const query = searchParent.toLowerCase();
    return topics
      .filter(
        (t) =>
          t.display_name.toLowerCase().includes(query) ||
          t.url_slug.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [topics, searchParent]);

  const filteredChildTopics = useMemo(() => {
    if (!searchChild) return topics.slice(0, 50);
    const query = searchChild.toLowerCase();
    return topics
      .filter(
        (t) =>
          t.display_name.toLowerCase().includes(query) ||
          t.url_slug.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [topics, searchChild]);

  const edgeExists = useMemo(() => {
    if (!parentSlug || !childSlug) return false;
    return existingEdges.has(`${parentSlug}->${childSlug}`);
  }, [parentSlug, childSlug, existingEdges]);

  const isSameNode = Boolean(parentSlug && childSlug && parentSlug === childSlug);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentSlug || !childSlug || edgeExists || isSameNode) return;

    onCreate({ parentSlug, childSlug });
    setParentSlug('');
    setChildSlug('');
    setSearchParent('');
    setSearchChild('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Prerequisite</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="edge-form-row">
            <div className="form-group edge-select">
              <label>Prerequisite (Parent)</label>
              <input
                type="text"
                placeholder="Search topics..."
                value={searchParent}
                onChange={(e) => setSearchParent(e.target.value)}
                className="topic-search"
              />
              <div className="topic-list">
                {filteredParentTopics.map((topic) => (
                  <button
                    key={topic.url_slug}
                    type="button"
                    className={`topic-option ${parentSlug === topic.url_slug ? 'selected' : ''}`}
                    onClick={() => setParentSlug(topic.url_slug)}
                  >
                    <span className="topic-name">{topic.display_name}</span>
                    <span className="topic-slug">{topic.url_slug}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="edge-arrow">→</div>

            <div className="form-group edge-select">
              <label>Leads To (Child)</label>
              <input
                type="text"
                placeholder="Search topics..."
                value={searchChild}
                onChange={(e) => setSearchChild(e.target.value)}
                className="topic-search"
              />
              <div className="topic-list">
                {filteredChildTopics.map((topic) => (
                  <button
                    key={topic.url_slug}
                    type="button"
                    className={`topic-option ${childSlug === topic.url_slug ? 'selected' : ''}`}
                    onClick={() => setChildSlug(topic.url_slug)}
                  >
                    <span className="topic-name">{topic.display_name}</span>
                    <span className="topic-slug">{topic.url_slug}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {edgeExists && (
            <div className="form-error">This prerequisite relationship already exists.</div>
          )}
          {isSameNode && (
            <div className="form-error">A topic cannot be a prerequisite of itself.</div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!parentSlug || !childSlug || edgeExists || isSameNode}
            >
              Create Prerequisite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
