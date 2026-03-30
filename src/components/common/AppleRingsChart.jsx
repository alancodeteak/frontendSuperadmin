import { ResponsiveContainer, PieChart, Pie } from 'recharts'

/**
 * Apple-style concentric rings chart used across dashboard + accounts overview.
 *
 * @param {Object} props
 * @param {Array<{ label: string, value: number, color: string }>} props.rings - outer → inner
 * @param {string} [props.trackColor='#e5e7eb'] - base track color
 * @param {number} [props.startAngle=90]
 * @param {number} [props.endAngle=-270]
 */
export default function AppleRingsChart({
  rings,
  trackColor = '#e5e7eb',
  startAngle = 90,
  endAngle = -270,
}) {
  if (!Array.isArray(rings) || !rings.length) return null

  const clampedRings = rings.map((r) => ({
    ...r,
    value: Math.max(0, Math.min(100, Number(r.value ?? 0))),
  }))

  const layers = clampedRings.slice(0, 3)

  const hasAnyValue = layers.some((r) => r.value > 0)
  const MIN_VISIBLE_ARC = 4

  const radii = [
    { inner: '66%', outer: '88%' }, // outer ring
    { inner: '48%', outer: '61%' }, // middle ring
    { inner: '32%', outer: '43%' }, // inner ring
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        {layers.map((ring, index) => {
          let pct = ring.value
          if (!hasAnyValue) {
            // No real data yet: show equal thirds just for visual balance.
            pct = 100 / layers.length
          } else if (pct <= 0) {
            // Ensure a tiny visible arc even for 0% so color is always present.
            pct = MIN_VISIBLE_ARC
          }
          const rem = Math.max(0, 100 - pct)
          const { inner, outer } = radii[index] ?? radii[radii.length - 1]
          const angleOffset = index * 10
          return (
            <Pie
              key={`${ring.label}-${index}`}
              data={[
                { name: ring.label, value: pct, fill: ring.color },
                { name: `${ring.label}Rem`, value: rem, fill: trackColor },
              ]}
              dataKey="value"
              startAngle={startAngle + angleOffset}
              endAngle={endAngle + angleOffset}
              innerRadius={inner}
              outerRadius={outer}
              strokeWidth={0}
            />
          )
        })}
      </PieChart>
    </ResponsiveContainer>
  )
}

