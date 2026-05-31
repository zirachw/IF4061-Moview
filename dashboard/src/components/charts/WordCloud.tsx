import { useMemo, useRef, useEffect, useState } from 'react'
import cloud from 'd3-cloud'
import * as d3 from 'd3'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

interface Word { text: string; size: number; genre: string; x?: number; y?: number; rotate?: number; color?: string }

export default function WordCloud({ data, filter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 300, h: 200 })

  const words = useMemo<Word[]>(() => {
    const rows = filterAgg(data.keywordAgg, filter)
    const kMap = new Map<string, { count: number; genre: string }>()
    for (const r of rows) {
      const cur = kMap.get(r.keyword)
      if (!cur || r.count > cur.count) kMap.set(r.keyword, { count: r.count, genre: r.genre })
    }
    const sorted = [...kMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 60)
    const maxCount = sorted[0]?.[1].count ?? 1
    return sorted.map(([text, { count, genre }]) => ({
      text,
      size: 8 + (count / maxCount) * 28,
      genre,
      color: genreColor(genre),
    }))
  }, [data.keywordAgg, filter])

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

  return (
    <ChartPanel title="Keywords">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </ChartPanel>
  )
}
