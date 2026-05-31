import { useMemo, useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { AppData, FilterState } from '../../types'
import { filterAgg, genreColor } from '../../utils/chartHelpers'
import ChartPanel from '../ui/ChartPanel'

interface Props { data: AppData; filter: FilterState }

export default function BumpChart({ data, filter }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 300, h: 200 })

  const { periods, ranks } = useMemo(() => {
    const rows = filterAgg(data.genreAgg, filter).filter(r => r.genre !== null)
    const [yMin, yMax] = filter.yearRange
    const span = yMax - yMin

    const bucket = (year: number) => span >= 15 ? Math.floor(year / 10) * 10 : year

    const byPeriodGenre = new Map<number, Map<string, number>>()
    for (const r of rows) {
      const p = bucket(r.year)
      if (!byPeriodGenre.has(p)) byPeriodGenre.set(p, new Map())
      const gMap = byPeriodGenre.get(p)!
      gMap.set(r.genre!, (gMap.get(r.genre!) ?? 0) + r.film_count)
    }

    const periodList = [...byPeriodGenre.keys()].sort((a, b) => a - b)
    if (periodList.length < 2) return { periods: [], ranks: new Map() }

    const genreSet = new Set<string>()
    for (const gMap of byPeriodGenre.values()) for (const g of gMap.keys()) genreSet.add(g)

    const allGenres = [...genreSet]
    const rankMap = new Map<string, Array<{ period: number; rank: number }>>()
    for (const period of periodList) {
      const gMap = byPeriodGenre.get(period)!
      const sorted = allGenres
        .map(g => ({ g, v: gMap.get(g) ?? 0 }))
        .filter(x => x.v > 0)
        .sort((a, b) => b.v - a.v)
      sorted.forEach(({ g }, i) => {
        if (!rankMap.has(g)) rankMap.set(g, [])
        rankMap.get(g)!.push({ period, rank: i + 1 })
      })
    }

    const topGenres = allGenres
      .filter(g => {
        const entries = rankMap.get(g) ?? []
        return entries.some(e => e.rank <= 8)
      })
      .slice(0, 12)

    return { periods: periodList, ranks: rankMap, topGenres }
  }, [data.genreAgg, filter]) as { periods: number[]; ranks: Map<string, Array<{ period: number; rank: number }>> }

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || !periods.length || !ranks.size) return
    const { w, h } = dims
    const margin = { top: 12, right: 80, bottom: 20, left: 36 }
    const iw = w - margin.left - margin.right
    const ih = h - margin.top - margin.bottom

    const topGenres = [...ranks.keys()].filter(g =>
      (ranks.get(g) ?? []).some(e => e.rank <= 8),
    ).slice(0, 12)

    const maxRank = Math.max(...[...ranks.values()].flat().map(e => e.rank))
    const clampedRank = Math.min(maxRank, topGenres.length)

    const xScale = d3.scalePoint<number>().domain(periods).range([0, iw]).padding(0.15)
    const yScale = d3.scaleLinear().domain([1, clampedRank]).range([0, ih])

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${w} ${h}`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Period labels
    g.selectAll('.period-label')
      .data(periods)
      .enter().append('text')
      .attr('class', 'period-label')
      .attr('x', d => xScale(d) ?? 0)
      .attr('y', ih + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9E9589')
      .attr('font-size', 9)
      .attr('font-family', 'Inter, sans-serif')
      .text(d => String(d))

    // Lines
    const line = d3.line<{ period: number; rank: number }>()
      .x(d => xScale(d.period) ?? 0)
      .y(d => yScale(d.rank))
      .curve(d3.curveMonotoneX)

    for (const genre of topGenres) {
      const pts = (ranks.get(genre) ?? []).filter(e => e.rank <= clampedRank)
      if (pts.length < 2) continue
      const color = genreColor(genre)

      g.append('path')
        .datum(pts)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.85)
        .attr('d', line)

      pts.forEach(pt => {
        g.append('circle')
          .attr('cx', xScale(pt.period) ?? 0)
          .attr('cy', yScale(pt.rank))
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('stroke', '#141414')
          .attr('stroke-width', 1)
      })

      const last = pts[pts.length - 1]
      g.append('text')
        .attr('x', (xScale(last.period) ?? 0) + 8)
        .attr('y', yScale(last.rank) + 3.5)
        .attr('fill', color)
        .attr('font-size', 9)
        .attr('font-family', 'Inter, sans-serif')
        .text(genre.length > 9 ? genre.slice(0, 8) + '…' : genre)
    }

    // Rank labels on left
    for (let rank = 1; rank <= Math.min(clampedRank, 8); rank++) {
      g.append('text')
        .attr('x', -4)
        .attr('y', yScale(rank) + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', '#4A4540')
        .attr('font-size', 8)
        .attr('font-family', '"JetBrains Mono", monospace')
        .text(`#${rank}`)
    }
  }, [dims, periods, ranks])

  return (
    <ChartPanel title="Genre Rank">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </ChartPanel>
  )
}
