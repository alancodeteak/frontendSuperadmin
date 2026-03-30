function StatCard({ label, value, delta, deltaLabel = 'this month', compact = false }) {
  return (
    <article
      className={`teamify-surface rounded-2xl shadow-sm ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:ring-slate-700 ${
        compact ? 'p-3 sm:p-3.5' : 'p-5'
      }`}
    >
      <p className={`${compact ? 'text-xs' : 'text-sm'} text-black dark:text-slate-300`}>{label}</p>
      <p
        className={`mt-2 font-semibold tracking-tight text-black dark:text-slate-100 ${
          compact ? 'text-xl sm:text-2xl' : 'text-3xl'
        }`}
      >
        {value}
      </p>
      {delta ? (
        <p
          className={`mt-1 font-medium text-black dark:text-emerald-400 ${
            compact ? 'text-xs sm:text-sm' : 'text-sm'
          }`}
        >
          {delta}
          {deltaLabel ? ` ${deltaLabel}` : ''}
        </p>
      ) : null}
    </article>
  )
}

export default StatCard
