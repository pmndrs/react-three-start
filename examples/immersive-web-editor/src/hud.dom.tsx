import { color, config, string, val, vec2 } from 'immersive-web-editor'

const hudLabel = config('HUD Label', val("Edit values at /editor", string()))

const hudPosition = config('HUD Position', val([24, 24], vec2({ min: 0, max: 96, step: 1 })))

const hudColor = config('HUD Color', val("#202124", color()))

export default function Hud() {
  return (
    <div
      style={{
        position: 'absolute',
        top: hudPosition[1],
        left: hudPosition[0],
        color: hudColor,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        pointerEvents: 'auto'
      }}
    >
      {hudLabel}
    </div>
  )
}
