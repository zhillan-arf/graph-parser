import { useEffect } from 'react';
import './Notification.css';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Notification({
  message,
  type,
  onClose,
  duration = 3000,
}: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`notification ${type}`}>
      <span className="notification-icon">
        {type === 'success' ? '✓' : '✕'}
      </span>
      <span className="notification-message">{message}</span>
      <button className="notification-close" onClick={onClose} type="button">
        ×
      </button>
    </div>
  );
}
