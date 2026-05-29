/* Particle logo — "Interstices" in Instrument Serif, assembled from a field of
   drifting particles. Inspired by the PARTICLES shader at
   https://shaders.evilrabbit.com: the wordmark is sampled into points that fly
   in, settle into the letterforms, and shimmer with a slow flow.

   A 2D canvas (not WebGL) keeps it dependency-free and light — a few thousand
   points at 60fps — while reading as the same "text made of particles" effect. */
;(function () {
  const TEXT = 'Interstices'
  const canvas = document.getElementById('logo')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(2, window.devicePixelRatio || 1)

  let particles = []
  let color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#fff'
  let raf = 0
  let start = null

  const rand = (a, b) => a + Math.random() * (b - a)

  function sampleTargets() {
    const fs = Math.max(46, Math.min(104, window.innerWidth * 0.078))
    const off = document.createElement('canvas')
    const o = off.getContext('2d')
    const font = `500 ${fs}px "Instrument Serif", Georgia, "Times New Roman", serif`
    o.font = font
    const w = Math.ceil(o.measureText(TEXT).width) + 24
    const h = Math.ceil(fs * 1.32)
    off.width = w
    off.height = h
    o.font = font
    o.fillStyle = '#fff'
    o.textBaseline = 'alphabetic'
    o.fillText(TEXT, 12, fs)

    const data = o.getImageData(0, 0, w, h).data
    const gap = 2
    const targets = []
    for (let y = 0; y < h; y += gap) {
      for (let x = 0; x < w; x += gap) {
        if (data[(y * w + x) * 4 + 3] > 130) targets.push({ x: x + 0.5, y: y + 0.5 })
      }
    }
    return { targets, w, h }
  }

  function build() {
    const { targets, w, h } = sampleTargets()
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.scale(dpr, dpr)
    // one particle per target; keep previous positions for a smooth re-flow
    const prev = particles
    particles = targets.map((t, i) => {
      const p = prev[i] || {
        x: rand(0, w),
        y: rand(0, h),
        sx: rand(-1, 1),
        sy: rand(-1, 1),
        ph: Math.random() * Math.PI * 2,
        sp: rand(0.6, 1.4),
        r: rand(0.8, 1.7),
      }
      p.tx = t.x
      p.ty = t.y
      return p
    })
    start = null
  }

  function frame(now) {
    if (start == null) start = now
    const t = (now - start) / 1000
    const intro = Math.min(1, t / 1.4)
    const settle = intro * intro * (3 - 2 * intro) // smoothstep
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = color
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      // ease toward the letterform, with a small perpetual shimmer
      const k = 0.04 + 0.06 * settle
      const sh = (1 - settle) * 0
      const driftX = Math.sin(t * p.sp + p.ph) * (0.35 + (1 - settle) * 6)
      const driftY = Math.cos(t * p.sp * 0.9 + p.ph) * (0.35 + (1 - settle) * 6)
      p.x += (p.tx - p.x) * k + (p.sx * (1 - settle) * 0.6)
      p.y += (p.ty - p.y) * k + (p.sy * (1 - settle) * 0.6)
      const dx = p.x + driftX
      const dy = p.y + driftY
      const a = 0.5 + 0.5 * settle
      ctx.globalAlpha = a
      ctx.beginPath()
      ctx.arc(dx, dy, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }

  function setColor(c) {
    color = c
  }
  window.__intersticesLogo = { setColor, replay: () => { build() } }

  function go() {
    build()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(frame)
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(go)
    // re-sample once Instrument Serif is definitely ready
    document.fonts.load('500 80px "Instrument Serif"').then(() => setTimeout(go, 50))
  } else {
    go()
  }
  let rt = null
  window.addEventListener('resize', () => {
    clearTimeout(rt)
    rt = setTimeout(build, 200)
  })
})()
