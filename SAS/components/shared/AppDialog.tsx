'use client';

export type AppDialogVariant = 'success' | 'error' | 'confirm';

export interface AppDialogState {
  variant: AppDialogVariant;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const ICONS: Record<AppDialogVariant, { bg: string; fg: string; path: React.ReactNode }> = {
  success: {
    bg: 'bg-green-100',
    fg: 'text-green-600',
    path: (
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    ),
  },
  error: {
    bg: 'bg-red-100',
    fg: 'text-red-600',
    path: (
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    ),
  },
  confirm: {
    bg: 'bg-amber-100',
    fg: 'text-amber-600',
    path: (
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.515-2.63L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    ),
  },
};

export default function AppDialog({
  dialog,
  onClose,
}: {
  dialog: AppDialogState | null;
  onClose: () => void;
}) {
  if (!dialog) return null;

  const icon = ICONS[dialog.variant];
  const isConfirm = dialog.variant === 'confirm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${icon.bg}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${icon.fg}`} viewBox="0 0 20 20" fill="currentColor">
            {icon.path}
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">{dialog.title}</h3>
        <p className="mt-1 whitespace-pre-line text-sm text-gray-500">{dialog.message}</p>

        {isConfirm ? (
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {dialog.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => dialog.onConfirm?.()}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              {dialog.confirmLabel ?? 'Delete'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              onClose();
              dialog.onConfirm?.();
            }}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
