import type { ReactNode } from 'react'

interface MetricOpt<T extends string> { value: T; label: string }

interface Props<T extends string> {
  title: string
  metric?: T
  metrics?: MetricOpt<T>[]
  onMetric?: (v: T) => void
  right?: ReactNode
  noData?: boolean
  children: ReactNode
}

export default function ChartPanel<T extends string>({
  title, metric, metrics, onMetric, right, noData, children,
}: Props<T>) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      backgroundColor: 'rgba(20,20,20,0.88)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '0.35rem',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.3rem 0.6rem',
        flexShrink: 0, gap: '0.4rem',
        minHeight: '1.8rem',
      }}>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.62rem',
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: '#9E9589', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </span>
        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', flexShrink: 0 }}>
          {right}
          {metrics && onMetric && metrics.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMetric(m.value)}
              style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem',
                padding: '0.1rem 0.35rem', borderRadius: '0.18rem',
                border: `1px solid ${metric === m.value ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.12)'}`,
                cursor: 'pointer',
                backgroundColor: metric === m.value ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: metric === m.value ? '#D4AF37' : '#9E9589',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {children}
        {noData && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(20,20,20,0.88)',
          }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#4A4540' }}>
              No data
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
