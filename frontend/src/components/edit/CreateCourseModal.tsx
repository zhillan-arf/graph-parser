import { useState } from 'react';
import type { CreateCourseDTO } from '../../types';
import './CreateModal.css';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateCourseDTO) => void;
}

const DEFAULT_COLORS = [
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
];

export function CreateCourseModal({
  isOpen,
  onClose,
  onCreate,
}: CreateCourseModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({ name: name.trim(), color });
    setName('');
    setColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Course</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="course-name">Course Name</label>
            <input
              id="course-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Machine Learning"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="course-color">Color</label>
            <div className="color-picker-row">
              <input
                id="course-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="color-hex">{color}</span>
            </div>
            <div className="color-presets">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-preset ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Create Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
