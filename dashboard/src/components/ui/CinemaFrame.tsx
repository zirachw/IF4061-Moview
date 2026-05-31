export default function CinemaFrame() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Left curtain */}
      <img
        src="/curtain.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: '-7vw',
          height: '100%',
          width: 'auto',
        }}
      />

      {/* Right curtain — flipped horizontally */}
      <img
        src="/curtain.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          right: '-7vw',
          height: '100%',
          width: 'auto',
          transform: 'scaleX(-1)',
        }}
      />
    </div>
  )
}
