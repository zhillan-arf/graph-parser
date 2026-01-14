import { useState } from 'react';
import type { Course, CreateTopicDTO } from '../../types';
import './CreateModal.css';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateTopicDTO) => void;
  courses: Course[];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function CreateTopicModal({
  isOpen,
  onClose,
  onCreate,
  courses,
}: CreateTopicModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [urlSlug, setUrlSlug] = useState('');
  const [courseId, setCourseId] = useState<number>(courses[0]?.id || 0);
  const [autoSlug, setAutoSlug] = useState(true);

  const handleNameChange = (name: string) => {
    setDisplayName(name);
    if (autoSlug) {
      setUrlSlug(generateSlug(name));
    }
  };

  const handleSlugChange = (slug: string) => {
    setUrlSlug(slug);
    setAutoSlug(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !urlSlug.trim() || !courseId) return;

    onCreate({
      displayName: displayName.trim(),
      urlSlug: urlSlug.trim(),
      courseId,
    });

    setDisplayName('');
    setUrlSlug('');
    setAutoSlug(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Topic</h2>
          <button className="modal-close" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="topic-name">Display Name</label>
            <input
              id="topic-name"
              type="text"
              value={displayName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Neural Networks"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="topic-slug">URL Slug</label>
            <input
              id="topic-slug"
              type="text"
              value={urlSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g., neural-networks"
            />
            <span className="form-hint">
              {autoSlug ? 'Auto-generated from name' : 'Custom slug'}
            </span>
          </div>
          <div className="form-group">
            <label htmlFor="topic-course">Course</label>
            <select
              id="topic-course"
              value={courseId}
              onChange={(e) => setCourseId(parseInt(e.target.value))}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!displayName.trim() || !urlSlug.trim() || !courseId}
            >
              Create Topic
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
