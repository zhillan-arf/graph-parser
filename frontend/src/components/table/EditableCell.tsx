import { useState, useRef, useEffect } from 'react';
import './EditableCell.css';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: 'text' | 'color';
  placeholder?: string;
}

export function EditableCell({
  value,
  onChange,
  disabled = false,
  type = 'text',
  placeholder = '',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (disabled) {
    return <span className="editable-cell disabled">{value}</span>;
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        className="editable-cell-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className="editable-cell editable"
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {type === 'color' ? (
        <span className="color-value">
          <span className="color-swatch-small" style={{ backgroundColor: value }} />
          <code>{value}</code>
        </span>
      ) : (
        value || <span className="empty-placeholder">{placeholder || '(empty)'}</span>
      )}
    </span>
  );
}
