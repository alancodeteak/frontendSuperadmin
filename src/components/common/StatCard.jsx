function StatCard({ label, value, delta }) {
  return (
    <article className="teamify-surface rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900 dark:ring-slate-700">
      <p className="text-sm text-black dark:text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-black dark:text-slate-100">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-black dark:text-emerald-400">{delta} this month</p>
    </article>
  )
}

export default StatCard
