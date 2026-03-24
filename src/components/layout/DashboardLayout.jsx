function DashboardLayout({ children }) {
  return (
    <div className="dashboard-root min-h-screen bg-slate-100 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-2 py-3 sm:px-3 md:px-4 md:py-4 lg:flex-row lg:gap-4 lg:px-5 lg:py-5 xl:px-6">
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout
