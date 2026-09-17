export default function Logo({ size = 40 }) {
  const ticks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 30 * Math.PI) / 180
    const x1 = 50 + Math.cos(angle) * 43
    const y1 = 50 + Math.sin(angle) * 43
    const x2 = 50 + Math.cos(angle) * 48
    const y2 = 50 + Math.sin(angle) * 48
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9971F" strokeWidth="3" strokeLinecap="round" />
  })

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="PESOS">
      {ticks}
      <circle cx="50" cy="50" r="37" fill="#14532D" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#C9971F" strokeWidth="2.5" />
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fontFamily="Fraunces, serif"
        fontWeight="700"
        fontSize="42"
        fill="#F3F0E6"
      >
        $
      </text>
    </svg>
  )
}