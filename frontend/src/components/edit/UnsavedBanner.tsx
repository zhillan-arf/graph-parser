import './UnsavedBanner.css';

interface UnsavedBannerProps {
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

export function UnsavedBanner({
  onSave,
  onDiscard,
  isSaving = false,
}: UnsavedBannerProps) {
  return (
    <div className="unsaved-banner">
      <div className="unsaved-banner-content">
        <span className="warning-icon">⚠</span>
        <span className="message">You have unsaved changes</span>
      </div>
      <div className="unsaved-banner-actions">
        <button
          className="discard-btn"
          onClick={onDiscard}
          type="button"
          disabled={isSaving}
        >
          Discard
        </button>
        <button
          className="save-btn"
          onClick={onSave}
          type="button"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
