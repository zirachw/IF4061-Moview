import type { AppData, FilterState } from '../../types'
import TopFilmsBar from '../charts/TopFilmsBar'
import TrendLine from '../charts/TrendLine'
import BubblePlot from '../charts/BubblePlot'
import RadialBar from '../charts/RadialBar'

interface Props { data: AppData; filter: FilterState }

export default function PopularityTab({ data, filter }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gridTemplateAreas: `"topFilms trend" "bubble waffle"`,
      gap: '0.6rem',
      height: '100%',
      minHeight: 0,
    }}>
      <div style={{ gridArea: 'topFilms', minWidth: 0, minHeight: 0 }}>
        <TopFilmsBar data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'trend', minWidth: 0, minHeight: 0 }}>
        <TrendLine data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'bubble', minWidth: 0, minHeight: 0 }}>
        <BubblePlot data={data} filter={filter} mode="popularity" />
      </div>
      <div style={{ gridArea: 'waffle', minWidth: 0, minHeight: 0 }}>
        <RadialBar data={data} filter={filter} />
      </div>
    </div>
  )
}
