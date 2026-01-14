import './EditModeToggle.css';

interface EditModeToggleProps {
  isEditMode: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function EditModeToggle({
  isEditMode,
  onToggle,
  disabled = false,
}: EditModeToggleProps) {
  return (
    <button
      className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      type="button"
      title={disabled ? 'This graph is read-only' : isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
    >
      <span className="toggle-icon">{isEditMode ? '✓' : '✎'}</span>
      <span className="toggle-label">{isEditMode ? 'Editing' : 'Edit'}</span>
    </button>
  );
}
