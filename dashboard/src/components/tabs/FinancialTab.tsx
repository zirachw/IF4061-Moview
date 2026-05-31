import type { AppData, FilterState } from '../../types'
import StackedArea from '../charts/StackedArea'
import BubblePlot from '../charts/BubblePlot'
import Sankey from '../charts/Sankey'

interface Props { data: AppData; filter: FilterState }

export default function FinancialTab({ data, filter }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.15fr 0.85fr',
      gridTemplateRows: '0.92fr 1.08fr',
      gridTemplateAreas: `"stream stream" "bubble sankey"`,
      gap: '0.6rem',
      height: '100%',
      minHeight: 0,
    }}>
      <div style={{ gridArea: 'stream', minWidth: 0, minHeight: 0 }}>
        <StackedArea data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'bubble', minWidth: 0, minHeight: 0 }}>
        <BubblePlot data={data} filter={filter} mode="financial" />
      </div>
      <div style={{ gridArea: 'sankey', minWidth: 0, minHeight: 0 }}>
        <Sankey data={data} filter={filter} mode="financial" />
      </div>
    </div>
  )
}
