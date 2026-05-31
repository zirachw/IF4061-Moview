import { useState, useMemo, useEffect, useRef } from 'react'
import type { FilterState, TabId } from './types'
import {
  DEFAULT_FILTER,
  clampYearRange,
  getYearBoundsForScope,
  getScope,
} from './hooks/useFilter'
import { useData } from './hooks/useData'

import Clapperboard from './components/layout/Clapperboard'
import ChoroplethMap from './components/map/ChoroplethMap'
import CinemaFrame from './components/ui/CinemaFrame'
import KpiStrip from './components/layout/KpiStrip'
import FilmRoll from './components/layout/FilmRoll'
import PopularityTab from './components/tabs/PopularityTab'
import GenreTab from './components/tabs/GenreTab'
import FinancialTab from './components/tabs/FinancialTab'
import PeopleTab from './components/tabs/PeopleTab'

const SCENE_SNAP_THRESHOLD = 120
const SMOOTH_SNAP_MS = 650
const TAB_PANEL_STYLE: React.CSSProperties = {
  padding: '2.5rem',
  height: '100%',
  overflow: 'hidden',
}

function cssLengthPx(name: string, fallback: number) {
  const root = getComputedStyle(document.documentElement)
  const value = root.getPropertyValue(name).trim()
  const rootFontSize = Number.parseFloat(root.fontSize) || 16
  if (value.endsWith('rem')) return Number.parseFloat(value) * rootFontSize
  if (value.endsWith('px')) return Number.parseFloat(value)
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function TabJumpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open selected tab"
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '50%',
        top: '-3rem',
        width: '2.5rem',
        height: '2.5rem',
        transform: 'translateX(-50%)',
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.45)',
        backgroundColor: '#F5F0E8',
        color: '#111111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.65rem',
        lineHeight: 1,
        cursor: 'pointer',
        zIndex: 80,
        boxShadow: '0 0.5rem 1.5rem rgba(0,0,0,0.35)',
      }}
    >
      &#8593;
    </button>
  )
}

export default function App() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [activeTab, setActiveTab] = useState<TabId>('popularity')
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set<TabId>(['popularity']))
  const [countryDisplayName, setCountryDisplayName] = useState<string | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const wheelIntentRef = useRef(0)
  const touchStartRef = useRef<number | null>(null)
  const touchIntentRef = useRef(0)
  const snappingRef = useRef(false)
  const filmViewRef = useRef(false)
  const smoothSnapTimeoutRef = useRef<number | null>(null)
  const syncedYearScopeRef = useRef('')

  const { scope_type, scope_id } = getScope(filter)
  const selectedScopeKey = `${scope_type}:${scope_id}`
  const data = useData(scope_type, scope_id, filter.yearRange)

  useEffect(() => {
    if (!filter.country) setCountryDisplayName(null)
  }, [filter.country])

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    return () => {
      if (smoothSnapTimeoutRef.current !== null) {
        window.clearTimeout(smoothSnapTimeoutRef.current)
      }
    }
  }, [])

  function sceneStartY() {
    const scene = sceneRef.current
    return scene ? Math.max(0, scene.offsetTop - cssLengthPx('--nav-h', 44)) : 0
  }

  function snapInstantlyTo(y: number) {
    filmViewRef.current = y > 2
    const html = document.documentElement
    const previousScrollBehavior = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo({ top: y, behavior: 'auto' })
    html.style.scrollBehavior = previousScrollBehavior
  }

  function smoothSnapTo(y: number) {
    filmViewRef.current = y > 2
    snappingRef.current = true
    window.scrollTo({ top: y, behavior: 'smooth' })
    if (smoothSnapTimeoutRef.current !== null) {
      window.clearTimeout(smoothSnapTimeoutRef.current)
    }
    smoothSnapTimeoutRef.current = window.setTimeout(() => {
      snappingRef.current = false
      smoothSnapTimeoutRef.current = null
    }, SMOOTH_SNAP_MS)
  }

  useEffect(() => {
    let resizeFrame = 0
    let resizeTimer = 0

    function alignFilmScene() {
      if (!filmViewRef.current) return
      snapInstantlyTo(sceneStartY())
    }

    function keepSceneAligned() {
      window.cancelAnimationFrame(resizeFrame)
      window.clearTimeout(resizeTimer)
      resizeFrame = window.requestAnimationFrame(() => {
        alignFilmScene()
        resizeFrame = window.requestAnimationFrame(alignFilmScene)
      })
      resizeTimer = window.setTimeout(alignFilmScene, 180)
    }

    window.addEventListener('resize', keepSceneAligned)
    window.visualViewport?.addEventListener('resize', keepSceneAligned)
    document.addEventListener('fullscreenchange', keepSceneAligned)

    return () => {
      window.cancelAnimationFrame(resizeFrame)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', keepSceneAligned)
      window.visualViewport?.removeEventListener('resize', keepSceneAligned)
      document.removeEventListener('fullscreenchange', keepSceneAligned)
    }
  }, [])

  useEffect(() => {
    function trackFilmView() {
      const sceneStart = sceneStartY()
      if (Math.abs(window.scrollY - sceneStart) < 4) filmViewRef.current = true
      if (window.scrollY < 4) filmViewRef.current = false
    }

    window.addEventListener('scroll', trackFilmView, { passive: true })
    return () => window.removeEventListener('scroll', trackFilmView)
  }, [])

  useEffect(() => {
    function consumeIntent(amount: number) {
      const next = amount + wheelIntentRef.current
      wheelIntentRef.current = next
      return Math.abs(next) >= SCENE_SNAP_THRESHOLD
    }

    function resetIntent() {
      wheelIntentRef.current = 0
      touchIntentRef.current = 0
    }

    function onWheel(event: WheelEvent) {
      if (!sceneRef.current) return

      const sceneStart = sceneStartY()
      const y = window.scrollY
      const goingDown = event.deltaY > 0
      const beforeScene = y < sceneStart - 2
      const atSceneTop = y <= sceneStart + 2 && y > 2

      if (snappingRef.current) {
        event.preventDefault()
        return
      }

      if (goingDown && beforeScene) {
        event.preventDefault()
        if (consumeIntent(event.deltaY)) {
          resetIntent()
          smoothSnapTo(sceneStart)
        }
        return
      }

      if (!goingDown && atSceneTop) {
        event.preventDefault()
        if (consumeIntent(event.deltaY)) {
          resetIntent()
          smoothSnapTo(0)
        }
        return
      }

      resetIntent()
    }

    function onTouchStart(event: TouchEvent) {
      touchStartRef.current = event.touches[0]?.clientY ?? null
      touchIntentRef.current = 0
    }

    function onTouchMove(event: TouchEvent) {
      if (!sceneRef.current || touchStartRef.current === null) return

      const currentY = event.touches[0]?.clientY ?? touchStartRef.current
      const delta = touchStartRef.current - currentY
      const sceneStart = sceneStartY()
      const y = window.scrollY
      const goingDown = delta > 0
      const beforeScene = y < sceneStart - 2
      const atSceneTop = y <= sceneStart + 2 && y > 2

      if (snappingRef.current) {
        event.preventDefault()
        return
      }

      if (goingDown && beforeScene) {
        event.preventDefault()
        touchIntentRef.current += delta
        touchStartRef.current = currentY
        if (Math.abs(touchIntentRef.current) >= SCENE_SNAP_THRESHOLD) {
          resetIntent()
          smoothSnapTo(sceneStart)
        }
        return
      }

      if (!goingDown && atSceneTop) {
        event.preventDefault()
        touchIntentRef.current += delta
        touchStartRef.current = currentY
        if (Math.abs(touchIntentRef.current) >= SCENE_SNAP_THRESHOLD) {
          resetIntent()
          smoothSnapTo(0)
        }
        return
      }

      resetIntent()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const dataYearBounds = useMemo(
    () => getYearBoundsForScope(data.kpi, { country: null, continent: null }),
    [data.kpi],
  )

  useEffect(() => {
    if (!dataYearBounds) return
    setFilter(current => {
      if (
        current.yearRange[0] === DEFAULT_FILTER.yearRange[0] &&
        current.yearRange[1] === DEFAULT_FILTER.yearRange[1]
      ) {
        return { ...current, yearRange: dataYearBounds }
      }
      const yearRange = clampYearRange(current.yearRange, dataYearBounds)
      return yearRange[0] === current.yearRange[0] && yearRange[1] === current.yearRange[1]
        ? current
        : { ...current, yearRange }
    })
  }, [dataYearBounds])

  const geoByIso = useMemo(() => {
    const m = new Map<string, typeof data.geo[0]>()
    for (const e of data.geo) m.set(e.iso_a2, e)
    return m
  }, [data.geo])

  const currentYearBounds = useMemo(
    () => getYearBoundsForScope(data.kpi, filter) ?? dataYearBounds ?? filter.yearRange,
    [data.kpi, filter, dataYearBounds],
  )

  useEffect(() => {
    const nextBounds = getYearBoundsForScope(data.kpi, filter)
    if (!nextBounds || syncedYearScopeRef.current === selectedScopeKey) return

    syncedYearScopeRef.current = selectedScopeKey
    setFilter(current => {
      const currentScope = getScope(current)
      if (`${currentScope.scope_type}:${currentScope.scope_id}` !== selectedScopeKey) return current
      return current.yearRange[0] === nextBounds[0] && current.yearRange[1] === nextBounds[1]
        ? current
        : { ...current, yearRange: nextBounds }
    })
  }, [data.kpi, filter, selectedScopeKey])

  useEffect(() => {
    const nextBounds = getYearBoundsForScope(data.kpi, filter)
    if (!nextBounds) return

    setFilter(current => {
      if (current.country !== filter.country || current.continent !== filter.continent) return current
      const yearRange = clampYearRange(current.yearRange, nextBounds)
      return yearRange[0] === current.yearRange[0] && yearRange[1] === current.yearRange[1]
        ? current
        : { ...current, yearRange }
    })
  }, [data.kpi, filter.country, filter.continent])

  function updateFilter(nextFilter: FilterState | ((current: FilterState) => FilterState)) {
    setFilter(current => {
      const next = typeof nextFilter === 'function' ? nextFilter(current) : nextFilter
      const scopeChanged = current.country !== next.country || current.continent !== next.continent
      if (!scopeChanged) return next
      const nextBounds = getYearBoundsForScope(data.kpi, next)
      return { ...next, yearRange: nextBounds ?? current.yearRange }
    })
  }

  function handleCountryClick(iso: string, name: string, continent: string | null) {
    if (filter.country === iso) {
      updateFilter(f => ({ ...f, country: null, continent: null }))
    } else {
      const entry = geoByIso.get(iso)
      updateFilter(f => ({ ...f, country: iso, continent: entry?.continent ?? continent }))
      setCountryDisplayName(name)
    }
  }


  return (
    <main>
      <Clapperboard activeTab={activeTab} onTabChange={tab => {
        setActiveTab(tab)
        setMountedTabs(prev => prev.has(tab) ? prev : new Set([...prev, tab]))
      }} />

      <section id="hero">
        <ChoroplethMap
          geo={data.geo}
          countriesGeo={data.countriesGeo}
          filter={filter}
          onCountryClick={handleCountryClick}
        />
        <CinemaFrame />
      </section>

      <div style={{ height: 'calc(100svh - var(--nav-h) - var(--kpi-h))' }} aria-hidden />

      <div
        ref={sceneRef}
        style={{
          position: 'relative',
          height: 'calc(100svh - var(--nav-h))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          zIndex: 10,
          scrollMarginTop: 'var(--nav-h)',
        }}
      >
        <div
          style={{
            position: 'relative',
            flexShrink: 0,
            zIndex: 50,
          }}
        >
          <TabJumpButton onClick={() => smoothSnapTo(sceneStartY())} />
          <KpiStrip
            activeTab={activeTab}
            kpiTiles={data.kpiTiles}
            kpiTileShard={data.kpiTileShard}
            filter={filter}
            onFilterChange={updateFilter}
            geo={data.geo}
            countryDisplayName={countryDisplayName}
            yearBounds={currentYearBounds}
          />
        </div>

        <div style={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>
          <FilmRoll>
            {(['popularity', 'financial', 'genre', 'people'] as TabId[]).map(tab => (
              mountedTabs.has(tab) && (
                <div key={tab} style={{ ...TAB_PANEL_STYLE, display: activeTab === tab ? 'block' : 'none' }}>
                  {tab === 'popularity' && <PopularityTab data={data} filter={filter} />}
                  {tab === 'financial' && <FinancialTab data={data} filter={filter} />}
                  {tab === 'genre' && <GenreTab data={data} filter={filter} />}
                  {tab === 'people' && <PeopleTab data={data} filter={filter} />}
                </div>
              )
            ))}
          </FilmRoll>
        </div>
      </div>
    </main>
  )
}
