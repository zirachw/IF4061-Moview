import { useMemo, useRef, useEffect, useState } from 'react'
import cloud from 'd3-cloud'
import * as d3 from 'd3'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor } from '../../utils/chartHelpers'
import { useKeywords } from '../../hooks/useData'
import { getShardScope } from '../../hooks/useFilter'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

interface Word { text: string; size: number; genre: string; x?: number; y?: number; rotate?: number; color?: string }

export default function WordCloud({ data, filter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef       = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 300, h: 200 })

  // Derive sorted genre list from current scope's genre aggregation
  const genres = useMemo(() => {
    const rows = filterAgg(data.genreAgg, filter)
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (r.genre) counts.set(r.genre, (counts.get(r.genre) ?? 0) + r.film_count)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g)
  }, [data.genreAgg, filter])

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  // Default to top genre when genre list changes (scope change)
  useEffect(() => {
    setSelectedGenre(genres[0] ?? null)
  }, [genres])

  const { scope_type, scope_id } = getShardScope(filter)
  const keywordRows = useKeywords(scope_type, scope_id, selectedGenre)

  const words = useMemo<Word[]>(() => {
    if (!keywordRows.length) return []
    const kMap = new Map<string, number>()
    for (const r of keywordRows) {
      kMap.set(r.keyword, (kMap.get(r.keyword) ?? 0) + r.count)
    }
    const sorted = [...kMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)
    const maxCount = sorted[0]?.[1] ?? 1
    return sorted.map(([text, count]) => ({
      text,
      size: 8 + (count / maxCount) * 28,
      genre: selectedGenre ?? '',
      color: genreColor(selectedGenre),
    }))
  }, [keywordRows, selectedGenre])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || !words.length) return
    const { w, h } = dims

    cloud<Word>()
      .size([w, h])
      .words(words)
      .padding(2)
      .rotate(() => (Math.random() > 0.8 ? 90 : 0))
      .font('Inter, sans-serif')
      .fontSize(d => d.size)
      .on('end', (laid: Word[]) => {
        const svg = d3.select(svgRef.current!)
        svg.selectAll('*').remove()
        svg.attr('viewBox', `0 0 ${w} ${h}`)

        const g = svg.append('g').attr('transform', `translate(${w / 2},${h / 2})`)
        g.selectAll('text')
          .data(laid)
          .enter()
          .append('text')
          .style('font-size', d => `${d.size}px`)
          .style('font-family', 'Inter, sans-serif')
          .style('font-weight', '600')
          .style('fill', d => d.color ?? '#9E9589')
          .style('fill-opacity', 0.85)
          .attr('text-anchor', 'middle')
          .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})rotate(${d.rotate ?? 0})`)
          .text(d => d.text)
          .append('title').text(d => d.text)
      })
      .start()
  }, [dims, words])

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'rgba(20,20,20,0.85)',
    color: selectedGenre ? genreColor(selectedGenre) : 'var(--text-secondary)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '0.25rem',
    padding: '0.15rem 0.35rem',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.7rem',
    cursor: 'pointer',
    outline: 'none',
    maxWidth: '9rem',
  }

  return (
    <ChartPanel
      title="Keywords"
      right={
        genres.length > 0 ? (
          <select
            value={selectedGenre ?? ''}
            onChange={e => setSelectedGenre(e.target.value || null)}
            style={selectStyle}
          >
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        ) : undefined
      }
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </ChartPanel>
  )
}
