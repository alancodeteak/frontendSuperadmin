import { useEffect, useRef } from 'react'

function StatCard({ label, value, delta }) {
  const labelRef = useRef(null)

  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    const s = window.getComputedStyle(el)
    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3b199916-37e1-41e0-afdc-9e7dca648ca4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f18df4'},body:JSON.stringify({sessionId:'f18df4',runId:'fade-fonts-1',hypothesisId:'H4',location:'StatCard.jsx:computedStyle',message:'StatCard label computed style',data:{className:el.className,color:s.color,opacity:s.opacity,filter:s.filter,fontWeight:s.fontWeight},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [])

  return (
    <article className="teamify-surface rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:ring-slate-700">
      <p ref={labelRef} className="text-sm text-black dark:text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-black dark:text-slate-100">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-black dark:text-emerald-400">{delta} this month</p>
    </article>
  )
}

export default StatCard
