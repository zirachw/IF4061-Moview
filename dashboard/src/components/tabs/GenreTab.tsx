import type { AppData, FilterState } from '../../types'
import GenreBar from '../charts/GenreBar'
import WordCloud from '../charts/WordCloud'
import BumpChart from '../charts/BumpChart'
import CooccurrenceHeatmap from '../charts/CooccurrenceHeatmap'

interface Props { data: AppData; filter: FilterState }

export default function GenreTab({ data, filter }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1.1fr',
      gridTemplateRows: '1fr 1fr',
      gridTemplateAreas: `"bar keywords cooccurence" "rank rank cooccurence"`,
      gap: '0.6rem',
      height: '100%',
      minHeight: 0,
    }}>
      <div style={{ gridArea: 'bar', minWidth: 0, minHeight: 0 }}>
        <GenreBar data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'keywords', minWidth: 0, minHeight: 0 }}>
        <WordCloud data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'cooccurence', minWidth: 0, minHeight: 0 }}>
        <CooccurrenceHeatmap data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'rank', minWidth: 0, minHeight: 0 }}>
        <BumpChart data={data} filter={filter} />
      </div>
    </div>
  )
}
