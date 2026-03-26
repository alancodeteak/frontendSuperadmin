import { useId } from 'react'

export default function ToggleBar({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  tone = 'indigo', // indigo | red
}) {
  const id = useId()
  const track =
    tone === 'red'
      ? checked
        ? 'bg-red-600'
        : 'bg-slate-700'
      : checked
        ? 'bg-indigo-600'
        : 'bg-slate-700'

  const ring =
    tone === 'red'
      ? checked
        ? 'ring-red-500/30'
        : 'ring-slate-500/20'
      : checked
        ? 'ring-indigo-500/30'
        : 'ring-slate-500/20'

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-white">
          {label}
        </label>
        {description ? (
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        ) : null}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full ${track} ring-1 ${ring} transition ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

