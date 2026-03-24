function statusClass(status) {
  if (status === 'Online') return 'bg-emerald-500'
  if (status === 'Away') return 'bg-amber-400'
  return 'bg-slate-400'
}

function TeamMemberRow({ member }) {
  return (
    <li className="flex items-center justify-between rounded-xl px-3 py-2 transition duration-300 hover:bg-slate-100 dark:hover:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {member.avatar}
        </div>
        <div>
          <p className="font-medium text-black dark:text-slate-100">{member.name}</p>
          <p className="text-sm text-black dark:text-slate-400">{member.role}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-sm text-black md:block dark:text-slate-300">{member.progress}% done</div>
        <div className="flex items-center gap-2 text-sm text-black dark:text-slate-300">
          <span className={`h-2.5 w-2.5 rounded-full ${statusClass(member.status)}`} />
          {member.status}
        </div>
      </div>
    </li>
  )
}

export default TeamMemberRow
