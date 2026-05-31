import { useMemo, useState, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer } from '@deck.gl/layers'
import { LinearInterpolator, MapView } from '@deck.gl/core'
import type { CountryFeatureCollection, GeoEntry, FilterState } from '../../types'

interface Props {
  geo: GeoEntry[]
  countriesGeo: CountryFeatureCollection
  filter: FilterState
  onCountryClick: (iso: string, name: string, continent: string | null) => void
}

const CONTINENTS_URL = '/data/continents.geojson'

const INITIAL_VIEW_STATE = {
  longitude: 15,
  latitude: 15,
  zoom: 1.4,
  pitch: 45,
  bearing: 0,
  minZoom: 0.8,
  maxZoom: 6,
}

type RGBA = [number, number, number, number]

const GOLD_R = 212, GOLD_G = 175, GOLD_B = 55

function goldScale(t: number): RGBA {
  const t2 = t ** 0.4
  const r = Math.round(0x40 + t2 * (GOLD_R - 0x40))
  const g = Math.round(0x30 + t2 * (GOLD_G - 0x30))
  const b = Math.round(0x08 + t2 * (GOLD_B - 0x08))
  return [r, g, b, 220]
}

const INACTIVE: RGBA         = [255, 255, 255, 16]
const LINE_DEFAULT: RGBA     = [80, 70, 60, 100]
const LINE_HOVERED: RGBA     = [232, 204, 106, 200]
const LINE_SELECTED: RGBA    = [232, 204, 106, 255]

const BTN: React.CSSProperties = {
  width: '2rem',
  height: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(20,20,20,0.85)',
  border: '1px solid rgba(255,255,255,0.35)',
  color: 'var(--text-primary)',
  fontSize: '1.125rem',
  lineHeight: 1,
  cursor: 'pointer',
  borderRadius: '0.25rem',
  userSelect: 'none',
}

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function ColorLegend({ maxCount }: { maxCount: number }) {
  const steps = 5
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '5.5rem',
        left: '3.5rem',
        zIndex: 20,
        backgroundColor: 'rgba(14,12,10,0.82)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '0.375rem',
        padding: '0.625rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.5rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.625rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Films
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{
          width: '0.5rem',
          height: '4.5rem',
          borderRadius: '0.25rem',
          background: 'linear-gradient(to top, #403008, #D4AF37)',
          flexShrink: 0,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '4.5rem' }}>
          {Array.from({ length: steps }, (_, i) => {
            const t = (steps - 1 - i) / (steps - 1)
            const val = Math.round(t * maxCount)
            return (
              <span key={i} style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.5625rem',
                color: 'var(--text-secondary)',
                lineHeight: 1,
              }}>
                {fmtK(val)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ChoroplethMap({ geo, countriesGeo, filter, onCountryClick }: Props) {
  const [hovered, setHovered]             = useState<string | null>(null)
  const [continentsGeo, setContinentsGeo] = useState<any>(null)
  const [viewState, setViewState]         = useState<any>(INITIAL_VIEW_STATE)

  useEffect(() => {
    fetch(CONTINENTS_URL).then(r => r.json()).then(setContinentsGeo)
  }, [])

  const geoMap = useMemo(() => {
    const m = new Map<string, GeoEntry>()
    for (const e of geo) m.set(e.iso_a2, e)
    return m
  }, [geo])

  const maxCount = useMemo(
    () => Math.max(1, ...geo.map(e => e.film_count)),
    [geo]
  )

  const continentOutlineData = useMemo(() => {
    if (!filter.continent || filter.country || !continentsGeo) return null
    return {
      type: 'FeatureCollection',
      features: continentsGeo.features.filter(
        (f: any) => f.properties?.continent === filter.continent
      ),
    }
  }, [continentsGeo, filter.continent, filter.country])

  const layers = useMemo(() => {
    const base = new GeoJsonLayer({
      id: 'countries',
      data: countriesGeo as any,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      lineWidthMinPixels: 1,

      getFillColor: (feature: any): RGBA => {
        const iso   = feature.properties?.ISO_A2 ?? ''
        const entry = geoMap.get(iso)
        const count = entry?.film_count ?? 0

        if (filter.country) {
          if (iso !== filter.country) return INACTIVE
          return count === 0 ? INACTIVE : goldScale(count / maxCount)
        }

        const inContinent = !filter.continent || feature.properties?.CONTINENT === filter.continent
        if (!inContinent || count === 0) return INACTIVE
        return goldScale(count / maxCount)
      },

      getLineColor: (feature: any): RGBA => {
        const iso = feature.properties?.ISO_A2 ?? ''
        if (filter.country === iso) return LINE_SELECTED
        if (hovered === iso)        return LINE_HOVERED
        return LINE_DEFAULT
      },

      getLineWidth: (feature: any): number => {
        const iso = feature.properties?.ISO_A2 ?? ''
        if (filter.country === iso) return 2.5
        if (hovered === iso)        return 2
        return 0.5
      },

      onClick: ({ object }: any) => {
        const iso: string       = object?.properties?.ISO_A2 ?? ''
        const name: string      = object?.properties?.NAME ?? object?.properties?.NAME_LONG ?? iso
        const continent: string = object?.properties?.CONTINENT ?? ''
        if (iso) onCountryClick(iso, name, continent || null)
      },

      onHover: ({ object }: any) => {
        setHovered(object?.properties?.ISO_A2 ?? null)
      },

      updateTriggers: {
        getFillColor: [geoMap, filter.country, filter.continent, maxCount],
        getLineColor: [filter.country, hovered],
        getLineWidth: [filter.country, hovered],
      },
    })

    const continentOutline = continentOutlineData
      ? new GeoJsonLayer({
          id: 'continent-outline',
          data: continentOutlineData as any,
          pickable: false,
          stroked: true,
          filled: false,
          getLineColor: LINE_SELECTED,
          getLineWidth: 2,
          lineWidthMinPixels: 2,
        })
      : null

    return continentOutline ? [base, continentOutline] : [base]
  }, [geoMap, countriesGeo, filter.country, filter.continent, hovered, maxCount, onCountryClick, continentOutlineData])

  return (
    <div style={{ position: 'absolute', inset: 0, cursor: hovered ? 'pointer' : 'default' }}>
      <DeckGL
        views={new MapView({
          repeat: false,
          controller: { scrollZoom: false, dragRotate: false, doubleClickZoom: false },
        })}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }: any) => setViewState({
          ...vs,
          longitude: Math.max(-175, Math.min(175, vs.longitude)),
        })}
        layers={layers}
        style={{ background: '#0A0A0A' }}
      />

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '5.5rem',
          right: '1.5rem',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        <button
          style={BTN}
          onClick={() => setViewState((v: any) => ({
            ...v,
            zoom: Math.min(v.zoom + 0.75, 6),
            transitionDuration: 300,
            transitionInterpolator: new LinearInterpolator(['zoom']),
          }))}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          style={BTN}
          onClick={() => setViewState((v: any) => ({
            ...v,
            zoom: Math.max(v.zoom - 0.75, 0.8),
            transitionDuration: 300,
            transitionInterpolator: new LinearInterpolator(['zoom']),
          }))}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>

      {/* Color legend */}
      <ColorLegend maxCount={maxCount} />
    </div>
  )
}
