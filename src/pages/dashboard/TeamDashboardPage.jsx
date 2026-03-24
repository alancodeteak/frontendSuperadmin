import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatCard from '@/components/common/StatCard'
import TeamMemberRow from '@/components/common/TeamMemberRow'
import {
  setActiveTab,
  setSelectedRange,
} from '@/redux/slices/dashboardSlice'
import { logoutLocal } from '@/redux/slices/authSlice'
import { getDashboardData } from '@/redux/thunks/dashboardThunks'
import { logoutAction } from '@/redux/thunks/authThunks'
import { useTheme } from '@/context/useTheme'
import '@/App.css'

const tabs = ['overview', 'tasks', 'analytics']
const ranges = ['daily', 'weekly', 'monthly']
const chartDataByRange = {
  daily: [
    { name: 'Mon', tasks: 22, productivity: 61 },
    { name: 'Tue', tasks: 30, productivity: 70 },
    { name: 'Wed', tasks: 26, productivity: 66 },
    { name: 'Thu', tasks: 35, productivity: 78 },
    { name: 'Fri', tasks: 40, productivity: 83 },
    { name: 'Sat', tasks: 28, productivity: 71 },
    { name: 'Sun', tasks: 24, productivity: 63 },
  ],
  weekly: [
    { name: 'W1', tasks: 160, productivity: 64 },
    { name: 'W2', tasks: 188, productivity: 72 },
    { name: 'W3', tasks: 176, productivity: 69 },
    { name: 'W4', tasks: 206, productivity: 81 },
  ],
  monthly: [
    { name: 'Jan', tasks: 690, productivity: 66 },
    { name: 'Feb', tasks: 740, productivity: 71 },
    { name: 'Mar', tasks: 802, productivity: 76 },
    { name: 'Apr', tasks: 768, productivity: 73 },
    { name: 'May', tasks: 846, productivity: 79 },
    { name: 'Jun', tasks: 882, productivity: 83 },
  ],
}

function TeamDashboardPage({
  brandTitle = 'Teamify',
  pageTitle = 'Team Dashboard',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { stats, members, loading, activeTab, selectedRange } = useSelector(
    (state) => state.dashboard,
  )
  const { logoutStatus } = useSelector((state) => state.auth)
  const { themeMode, toggleTheme } = useTheme()
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())

  useEffect(() => {
    dispatch(getDashboardData())
  }, [dispatch])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const utilization = useMemo(() => {
    if (!members.length) return 0
    const total = members.reduce((sum, member) => sum + member.progress, 0)
    return Math.round(total / members.length)
  }, [members])
  const mixedChartData = chartDataByRange[selectedRange]
  const axisTickColor = themeMode === 'dark' ? '#cbd5e1' : '#000000'
  const gridColor = themeMode === 'dark' ? '#334155' : '#d9deea'
  const tooltipStyle = {
    borderRadius: '12px',
    border: themeMode === 'dark' ? '1px solid #334155' : '1px solid #d9deea',
    backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
    color: themeMode === 'dark' ? '#f1f5f9' : '#000000',
    boxShadow:
      themeMode === 'dark'
        ? '0 8px 20px rgba(2,6,23,0.45)'
        : '0 8px 20px rgba(15,23,42,0.1)',
  }
  const ringChartData = [
    { name: 'Done', value: utilization, fill: '#34c759' },
    { name: 'Remaining', value: 100 - utilization, fill: '#e5e7eb' },
  ]
  const rangeContainerClass =
    themeMode === 'dark'
      ? 'inline-flex w-full max-w-full flex-wrap rounded-xl bg-slate-800 p-1 md:w-auto'
      : 'inline-flex w-full max-w-full flex-wrap rounded-xl bg-white p-1 ring-1 ring-slate-300 md:w-auto'
  const formattedDate = currentDateTime.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = currentDateTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const isLoggingOut = logoutStatus === 'loading'

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  return (
    <DashboardLayout>
      <aside className="teamify-side-panel teamify-surface mb-3 w-full rounded-3xl p-3 ring-1 ring-slate-200 transition duration-300 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 lg:mb-0 lg:w-[240px] lg:p-5">
        <div className="mb-6 flex items-center gap-3 lg:mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            T
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-black dark:text-slate-100">
              {brandTitle}
            </h1>
            <p className="text-xs text-black dark:text-slate-300">{pageTitle}</p>
          </div>
        </div>
        <div className="mb-5 rounded-xl bg-white/70 px-3 py-2 text-xs text-black ring-1 ring-slate-300 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-700">
          <p className="font-semibold">{formattedDate}</p>
          <p>{formattedTime}</p>
        </div>

        <nav className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => dispatch(setActiveTab(tab))}
              className={`w-full rounded-xl px-4 py-2 text-left text-sm font-medium capitalize transition duration-300 ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-black hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-black transition duration-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 lg:mt-8"
        >
          Switch to {themeMode === 'dark' ? 'Light' : 'Dark'} Mode
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-3 w-full rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition duration-300 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </aside>

      <main className="flex-1">
        <header className="teamify-surface mb-3 rounded-3xl p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 md:mb-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-black dark:text-slate-100 sm:text-2xl md:text-3xl">
                {pageTitle}
              </h2>
              <p className="mt-1 text-sm text-black dark:text-slate-300">
                Welcome back, monitor your team performance in real time.
              </p>
            </div>

            <div className={rangeContainerClass}>
              {ranges.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => dispatch(setSelectedRange(range))}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition duration-300 md:flex-none md:px-4 ${
                    selectedRange === range
                      ? themeMode === 'dark'
                        ? 'bg-slate-700 text-slate-100 shadow-sm'
                        : 'bg-indigo-600 text-white shadow-sm'
                      : themeMode === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700/60'
                        : 'text-black hover:bg-slate-100'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.id} {...item} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.32fr_0.9fr]">
          <article className="teamify-surface rounded-3xl p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 md:p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-slate-100">
                Team Performance
              </h3>
              <span className="text-sm text-black dark:text-slate-300">
                {selectedRange} report
              </span>
            </div>

            <div className="teamify-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mixedChartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: axisTickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisTickColor, fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="tasks" barSize={selectedRange === 'monthly' ? 18 : 20} fill="#818cf8" radius={[8, 8, 0, 0]} />
                  <Area
                    dataKey="productivity"
                    type="monotone"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fill="rgba(14,165,233,0.18)"
                    dot={{ r: 3, strokeWidth: 0, fill: '#0284c7' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="teamify-surface rounded-3xl p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 md:p-5">
            <h3 className="text-lg font-semibold text-black dark:text-slate-100">
              Utilization
            </h3>
            <p className="mt-1 text-sm text-black dark:text-slate-300">
              Apple Watch inspired activity ring
            </p>

            <div className="teamify-ring-wrap mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ringChartData}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius="66%"
                    outerRadius="88%"
                    strokeWidth={0}
                  />
                  <Pie
                    data={[
                      { name: 'Outer', value: Math.max(utilization - 8, 0), fill: '#0ea5e9' },
                      { name: 'OuterRem', value: 100 - Math.max(utilization - 8, 0), fill: '#e2e8f0' },
                    ]}
                    dataKey="value"
                    startAngle={100}
                    endAngle={-260}
                    innerRadius="48%"
                    outerRadius="61%"
                    strokeWidth={0}
                  />
                  <Pie
                    data={[
                      { name: 'Inner', value: Math.max(utilization - 16, 0), fill: '#f59e0b' },
                      { name: 'InnerRem', value: 100 - Math.max(utilization - 16, 0), fill: '#e2e8f0' },
                    ]}
                    dataKey="value"
                    startAngle={110}
                    endAngle={-250}
                    innerRadius="32%"
                    outerRadius="43%"
                    strokeWidth={0}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="teamify-ring-center">
                <div className="teamify-ring-value">
                  <strong className="text-2xl font-semibold text-black dark:text-slate-100">
                    {utilization}%
                  </strong>
                  <span className="text-xs text-black dark:text-slate-300">Current</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="teamify-surface mt-3 rounded-3xl p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:p-4 md:mt-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-slate-100">
              Team Members
            </h3>
            <span className="text-sm text-black dark:text-slate-300">
              {loading ? 'Loading...' : `${members.length} members`}
            </span>
          </div>

          <ul className="space-y-1">
            {members.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </ul>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default TeamDashboardPage
