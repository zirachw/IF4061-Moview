export const GENRE_COLORS: Record<string, string> = {
  Action:      '#C0392B',
  Drama:       '#2980B9',
  Comedy:      '#D4AF37',
  Thriller:    '#8E44AD',
  Romance:     '#E8607A',
  Animation:   '#27AE60',
  Documentary: '#E67E22',
  Horror:      '#E74C3C',
  Adventure:   '#1ABC9C',
  'Science Fiction': '#3498DB',
  Fantasy:     '#9B59B6',
  Crime:       '#E67E22',
  Mystery:     '#7F8C8D',
  History:     '#D35400',
  Music:       '#F39C12',
  Family:      '#2ECC71',
  Western:     '#8B7355',
  War:         '#95A5A6',
  'TV Movie':  '#BDC3C7',
  Foreign:     '#AAB7B8',
}

export const FALLBACK_COLOR = '#7F8C8D'

export function genreColor(genre: string | null): string {
  if (!genre) return FALLBACK_COLOR
  return GENRE_COLORS[genre] ?? FALLBACK_COLOR
}

export const PROFIT_DIVERGING = {
  negative: '#C0392B',
  zero:     '#F5F0E8',
  positive: '#2980B9',
}

export const MAP_SCALE = {
  empty:  'rgba(255,255,255,0.06)',
  low:    '#8B7322',
  mid:    '#D4AF37',
  high:   '#E8CC6A',
}
