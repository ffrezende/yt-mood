'use client';

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

/**
 * Error alert component
 * Displays error messages with optional dismiss functionality
 */
export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8 flex items-start justify-between gap-4">
      <div className="flex-1">
        <strong className="block mb-1">Error:</strong>
        <p className="text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-700 hover:text-red-900 font-bold text-xl leading-none"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}

