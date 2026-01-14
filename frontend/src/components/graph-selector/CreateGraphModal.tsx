/**
 * Modal for creating a new knowledge graph.
 */

import { useState } from 'react';
import type { CreateGraphDTO } from '../../types';
import './CreateGraphModal.css';

interface CreateGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateGraphDTO) => Promise<void>;
  defaultGraphId?: string;
  mode: 'empty' | 'copy';
}

export default function CreateGraphModal({
  isOpen,
  onClose,
  onCreate,
  defaultGraphId,
  mode,
}: CreateGraphModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        copyFromGraphId: mode === 'copy' ? defaultGraphId : undefined,
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create graph');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{mode === 'empty' ? 'Create Empty Graph' : 'Create Copy of Default'}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {mode === 'copy' && (
              <p className="modal-description">
                This will create a new editable copy of the default knowledge graph.
              </p>
            )}

            <div className="form-group">
              <label htmlFor="graph-name">Name *</label>
              <input
                id="graph-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Knowledge Graph"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="graph-description">Description</label>
              <textarea
                id="graph-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Graph'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
