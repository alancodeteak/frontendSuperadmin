export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'indigo', // indigo | red
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmBtn =
    tone === 'red'
      ? 'bg-red-600 hover:bg-red-500 focus-visible:outline-red-400'
      : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-400'

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!loading) onCancel?.()
        }}
      />

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {message ? (
            <p className="mt-2 text-sm text-slate-300">{message}</p>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => onCancel?.()}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm?.()}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${confirmBtn}`}
            >
              {loading ? 'Please wait…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

