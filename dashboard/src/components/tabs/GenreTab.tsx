import type { AppData, FilterState } from '../../types'
import GenreDonut from '../charts/GenreDonut'
import GenreBar from '../charts/GenreBar'
import WordCloud from '../charts/WordCloud'
import BumpChart from '../charts/BumpChart'
import CooccurrenceHeatmap from '../charts/CooccurrenceHeatmap'
import Sankey from '../charts/Sankey'

interface Props { data: AppData; filter: FilterState }

export default function GenreTab({ data, filter }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '0.9fr 1.1fr 1fr',
      gridTemplateRows: '0.82fr 1.18fr',
      gridTemplateAreas: `"donut bar keywords" "bump chord sankey"`,
      gap: '0.6rem',
      height: '100%',
      minHeight: 0,
    }}>
      <div style={{ gridArea: 'donut', minWidth: 0, minHeight: 0 }}>
        <GenreDonut data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'bar', minWidth: 0, minHeight: 0 }}>
        <GenreBar data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'keywords', minWidth: 0, minHeight: 0 }}>
        <WordCloud data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'bump', minWidth: 0, minHeight: 0 }}>
        <BumpChart data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'chord', minWidth: 0, minHeight: 0 }}>
        <CooccurrenceHeatmap data={data} filter={filter} />
      </div>
      <div style={{ gridArea: 'sankey', minWidth: 0, minHeight: 0 }}>
        <Sankey data={data} filter={filter} mode="genre" />
      </div>
    </div>
  )
}
