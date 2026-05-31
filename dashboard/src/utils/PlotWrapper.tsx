import _Plot from 'react-plotly.js'
// react-plotly.js ships CJS; Vite may wrap it so .default holds the real component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot: typeof _Plot = ((_Plot as any).default ?? _Plot) as typeof _Plot
export default Plot
