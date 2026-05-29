/* Interstices — an interactive photography wall.

   A dense, gently drifting field of frames sized to each image's aspect ratio.
   Move the cursor and the wall *parts* — nearby frames are pushed outward into a
   clearing while the nearest one rises into a preview. Click to open it.

   - Drag-and-drop images/videos (or the Upload button) to fill the wall with
     your own media. Frames adapt to each file's true aspect ratio (no crop).
   - Hold the middle mouse button and drag to traverse the (endlessly wrapping)
     canvas. Scroll to zoom.

   One requestAnimationFrame loop owns the motion and mutates transforms
   imperatively, so it runs at 60fps with no per-frame allocations. */

const DEFAULT_PHOTOS = [
  { id: '1506905925346-21bda4d32df4', aspect: 1.5 }, { id: '1469474968028-56623f02e42e', aspect: 1.5 },
  { id: '1518837695005-2083093ee35b', aspect: 1.5 }, { id: '1441974231531-c6227db76b6e', aspect: 1.5 },
  { id: '1470071459604-3b5ec3a7fe05', aspect: 0.75 }, { id: '1447752875215-b2761acb3c5d', aspect: 1 },
  { id: '1500964757637-c85e8a162699', aspect: 1.5 }, { id: '1454496522488-7a8e488e8606', aspect: 1.5 },
  { id: '1501785888041-af3ef285b470', aspect: 1.5 }, { id: '1444080748397-f442aa95c3e5', aspect: 0.75 },
  { id: '1431794062232-2a99a5431c6c', aspect: 0.75 }, { id: '1426604966848-d7adac402bff', aspect: 1.5 },
  { id: '1490604001847-b712b0c2f967', aspect: 1.5 }, { id: '1497436072909-60f360e1d4b1', aspect: 1.5 },
  { id: '1505144808419-1957a94ca61e', aspect: 0.75 }, { id: '1505765050516-f72dcac9c60e', aspect: 1 },
  { id: '1542273917363-3b1817f69a2d', aspect: 1.5 }, { id: '1418065460487-3e41a6c84dc5', aspect: 1.5 },
  { id: '1502082553048-f009c37129b9', aspect: 1 }, { id: '1483347756197-71ef80e95f73', aspect: 1.5 },
  { id: '1485470733090-0aae1788d5af', aspect: 1.5 }, { id: '1495107334309-fcf20504a5ab', aspect: 0.75 },
  { id: '1472213984618-c79aaec7fef0', aspect: 1 }, { id: '1480714378408-67cf0d13bc1b', aspect: 1.5 },
  { id: '1449034446853-66c86144b0ad', aspect: 1.5 }, { id: '1506744038136-46273834b3fb', aspect: 1.5 },
  { id: '1519681393784-d120267933ba', aspect: 1.5 }, { id: '1500530855697-b586d89ba3ee', aspect: 1.5 },
  { id: '1469854523086-cc02fe5d8800', aspect: 1.5 }, { id: '1488972685288-c3fd157d7c7a', aspect: 0.75 },
  { id: '1518173946687-a4c8892bbd9f', aspect: 1.5 }, { id: '1444723121867-7a241cacace9', aspect: 0.75 },
  { id: '1492446845049-9c50cc313f00', aspect: 1.5 }, { id: '1465379944081-7f47de8d74ac', aspect: 1 },
  { id: '1499002238440-d264edd596ec', aspect: 1 }, { id: '1483728642387-6c3bdd6c93e5', aspect: 0.75 },
  { id: '1438761681033-6461ffad8d80', aspect: 0.75 }, { id: '1500916434205-0c77489c6cf7', aspect: 1.5 },
  { id: '1486325212027-8081e485255e', aspect: 0.75 }, { id: '1494500764479-0c8f2919a3d8', aspect: 1 },
  { id: '1417325384643-aac51acc9e5d', aspect: 1.5 }, { id: '1448375240586-882707db888b', aspect: 1.5 },
  { id: '1465056836041-7f43ac27dcb5', aspect: 1.5 }, { id: '1464822759023-fed622ff2c3b', aspect: 1.5 },
  { id: '1493246507139-91e8fad9978e', aspect: 1.5 }, { id: '1466692476868-aef1dfb1e735', aspect: 1.5 },
  { id: '1455218873509-8097305ee378', aspect: 1.5 }, { id: '1481018085669-2bc6e4f00eed', aspect: 1.5 },
  { id: '1473773508845-188df298d2d1', aspect: 1.5 }, { id: '1470770841072-f978cf4d019e', aspect: 1.5 },
  { id: '1487958449943-2429e8be8625', aspect: 0.75 }, { id: '1486718448742-163732cd1544', aspect: 0.75 },
  { id: '1525134479668-1bee5c7c6845', aspect: 0.75 }, { id: '1517248135467-4c7edcad34c4', aspect: 1 },
  { id: '1542038784456-1ea8e935640e', aspect: 1.5 },
]

// deterministic hash in [0,1) — stable layout, no Math.random
const rand = (n) => {
  const x = Math.sin(n * 127.1 + 13.7) * 43758.5453
  return x - Math.floor(x)
}
const clamp01 = (a, b, v) => Math.max(0, Math.min(1, (v - a) / (b - a)))

// ── media model ───────────────────────────────────────────────
// each item: { kind:'image'|'video', aspect, label, meta, url(local) | id(default) }
function defaultMedia() {
  return DEFAULT_PHOTOS.map((p) => ({
    kind: 'image',
    aspect: p.aspect,
    id: p.id,
    label: '',
    category: 'Photo',
    meta: '',
  }))
}
const unsplash = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?w=${Math.round(w)}&h=${Math.round(h)}&fit=crop&q=72&auto=format`

/** source URL for an item at a target height (width follows aspect) */
function srcFor(item, h) {
  if (item.url) return item.url
  return unsplash(item.id, h * item.aspect, h)
}

/** build (or reuse) a media element for a tile/preview/lightbox */
function makeMediaEl(item, h, fit) {
  let el
  if (item.kind === 'video') {
    el = document.createElement('video')
    el.src = item.url
    el.muted = true
    el.loop = true
    el.autoplay = true
    el.playsInline = true
    el.setAttribute('playsinline', '')
  } else {
    el = document.createElement('img')
    el.src = srcFor(item, h)
    el.alt = item.label || ''
    el.draggable = false
    el.decoding = 'async'
  }
  el.className = 'media'
  el.style.objectFit = fit || 'cover'
  return el
}

// ── app state ─────────────────────────────────────────────────
let media = defaultMedia()
let vp = { vw: innerWidth, vh: innerHeight, mobile: innerWidth < 768 }
let layout = null // { cells, m, h, rows }
let tiles = [] // DOM nodes, indexed by cell.index

const wall = document.getElementById('wall')
const stage = document.getElementById('stage')

// pointer + animation refs (ported names → readable)
const pointer = { x: 0, y: 0, has: false }
const rawPointer = { x: 0, y: 0 } // viewport-space cursor (for the preview)
const prevPos = { x: 0, y: 0 } // smoothed viewport cursor
let hovering = true
const cur = { x: 0, y: 0 } // smoothed cursor, pan-relative
const pan = { x: 0, y: 0 } // current pan (L)
const panTarget = { x: 0, y: 0 } // target pan (C)
let radius = 0
let introT = 0 // 0→1 reveal progress (M)
let radiusEnable = 0 // 0→1 (k)
let previewScale = 0 // 0→1 (j)
let focused = false
let featured = 0
let started = false
let rowDrift = []
let zoom = 1
let introStart = null

// ── layout (justified rows, toroidal) ─────────────────────────
function buildLayout() {
  const mobile = vp.mobile
  const n = mobile ? 72 : 100 // row height
  const a = mobile ? 8 : 12 // gap
  const over = mobile ? 2.6 : 3
  const c = n + a
  const wide = vp.vw * over
  const rows = Math.max(1, Math.ceil((vp.vh * over) / c))
  const totalH = rows * c
  const p = -totalH / 2 + n / 2 + a / 2

  const rowArrays = []
  let prev = null
  let maxW = 0
  for (let e = 0; e < rows; e++) {
    const row = []
    let rawX = 0
    let col = 0
    while (rawX < wide) {
      let mi = Math.floor(rand(17.3 * e + 31.7 * col + 5) * media.length)
      const prevInRow = row.length ? row[row.length - 1].mi : -1
      let above = -1
      if (prev) for (const ce of prev) if (rawX >= ce.rawX && rawX < ce.rawX + ce.width + a) { above = ce.mi; break }
      let guard = 0
      while ((mi === prevInRow || mi === above) && guard < media.length) { mi = (mi + 1) % media.length; guard++ }
      const w = n * media[mi].aspect
      row.push({ mi, width: w, rawX, col })
      rawX += w + a
      col++
    }
    rowArrays.push(row)
    prev = row
    const rw = row.length ? row[row.length - 1].rawX + row[row.length - 1].width : 0
    if (rw > maxW) maxW = rw
  }
  const m = maxW + a
  const cells = []
  let idx = 0
  for (let e = 0; e < rows; e++) {
    const row = rowArrays[e]
    if (!row.length) continue
    const last = row[row.length - 1]
    const slack = m - (last.rawX + last.width) - a
    const o = row.length > 1 ? slack / row.length : 0
    let i = -m / 2 + a / 2
    for (let r = 0; r < row.length; r++) {
      const cell = row[r]
      cells.push({
        index: idx++, rowIndex: e, mi: cell.mi,
        baseX: i + cell.width / 2, baseY: e * c + p,
        width: cell.width, height: n,
        angle: rand(31 * e + 17 * cell.col + 7) * Math.PI * 2,
        rotation: (rand(5 * e + 11 * cell.col + 3) - 0.5) * 3.6,
        scale: 1 + (rand(7 * e + 13 * cell.col + 5) - 0.5) * 0.05,
      })
      i += cell.width + a + o
    }
  }
  layout = { cells, m, h: totalH, rows }
}

// ── render tiles ──────────────────────────────────────────────
function renderTiles() {
  wall.textContent = ''
  tiles = []
  const h = vp.mobile ? 72 : 100
  for (const cell of layout.cells) {
    const tile = document.createElement('div')
    tile.className = 'tile'
    tile.style.width = cell.width + 'px'
    tile.style.height = cell.height + 'px'
    tile.appendChild(makeMediaEl(media[cell.mi], Math.round(2.4 * h)))
    wall.appendChild(tile)
    tiles[cell.index] = tile
  }
  rowDrift = Array(layout.rows).fill(0)
}

function relayout() {
  vp = { vw: innerWidth, vh: innerHeight, mobile: innerWidth < 768 }
  buildLayout()
  renderTiles()
  pan.x = panTarget.x = vp.vw / 2
  pan.y = panTarget.y = vp.vh / 2
  cur.x = 0
  cur.y = 0
  prevPos.x = rawPointer.x = vp.vw / 2
  prevPos.y = rawPointer.y = vp.vh / 2
}

// ── the loop ──────────────────────────────────────────────────
function frame(now) {
  if (introStart == null) introStart = now
  const t = (now - introStart) / 1000
  introT = Math.min(1, t / 1.7)
  radiusEnable = Math.min(1, Math.max(0, (t - 0.2) / 1.1))
  const targetPreview = !focused && featuredVisible() && hovering ? 1 : 0
  previewScale += (targetPreview - previewScale) * 0.14

  const L = layout
  if (!L) { requestAnimationFrame(frame); return }

  if (!focused) {
    for (let i = 0; i < rowDrift.length; i++) {
      rowDrift[i] += (0.05 + 0.18 * rand(41.3 * i + 17.1)) * (i % 2 === 0 ? -1 : 1)
    }
  }
  pan.x += (panTarget.x - pan.x) * 0.07
  pan.y += (panTarget.y - pan.y) * 0.07
  if (pointer.has) {
    cur.x += (pointer.x - pan.x - cur.x) * 0.25
    cur.y += (pointer.y - pan.y - cur.y) * 0.25
  }
  const rTarget = (focused ? (vp.mobile ? 280 : 420) : hovering ? (vp.mobile ? 200 : 280) : (vp.mobile ? 130 : 200)) * radiusEnable
  radius += (rTarget - radius) * 0.07

  // zoom is folded into the math (positions + sizes + wrap period all scale by
  // Z) rather than a CSS scale on the container — so the toroidal wrap keeps
  // filling the whole viewport at any zoom, leaving no blank edges.
  const Z = zoom
  const l = radius, c = 1.3 * l
  const d = cur.x, u = cur.y, hx = pan.x, hy = pan.y
  const f = L.m * Z, R = L.h * Z, halfW = vp.vw / 2, halfH = vp.vh / 2
  const diag = Math.hypot(vp.vw, vp.vh) / 2
  const intro = introT < 1
  let bestD = Infinity, bestIdx = featured

  for (let i = 0; i < L.cells.length; i++) {
    const cell = L.cells[i]
    const el = tiles[cell.index]
    if (!el) continue
    const sWorld = (cell.baseX + (rowDrift[cell.rowIndex] || 0)) * Z
    const byBase = cell.baseY * Z
    const yWrap = Math.round((halfH - (byBase + hy)) / R)
    const bx = sWorld + Math.round((halfW - (sWorld + hx)) / f) * f
    const by = byBase + yWrap * R
    const mdx = bx - d, mdy = by - u
    const dist = Math.hypot(mdx, mdy)
    if (dist < bestD) { bestD = dist; bestIdx = cell.index }

    const cx = bx + hx, cy = by + hy
    const hw = (cell.width * Z) / 2, hh = (cell.height * Z) / 2
    if (cx + hw < -260 || cx - hw > vp.vw + 260 || cy + hh < -260 || cy - hh > vp.vh + 260) {
      el.style.opacity = '0'
      continue
    }
    let px = bx, py = by, scale = cell.scale * Z, op = 1
    if (dist < c) {
      const o = 1 - dist / c
      const push = l * o * o
      let dx, dy
      if (dist < 0.5) { dx = Math.cos(cell.angle); dy = Math.sin(cell.angle) } else { dx = mdx / dist; dy = mdy / dist }
      px = bx + dx * push
      py = by + dy * push
      if (dist > 0.55 * l && dist < 1.05 * l) scale *= 1 + 0.06 * (clamp01(0.55 * l, 0.8 * l, dist) * (1 - clamp01(0.85 * l, 1.05 * l, dist)))
    }
    let ix = 0, iy = 0
    if (intro) {
      const fd = Math.hypot(cell.baseX, cell.baseY)
      const ti = Math.max(0, Math.min(1, 1.5 * (introT - (fd / diag) * 0.4)))
      op = ti
      scale *= 0.3 + 0.7 * ti
      if (fd > 1) { const k = (1 - ti) * 420; ix = (cell.baseX / fd) * k; iy = (cell.baseY / fd) * k }
    }
    // translate to put the tile's CENTRE at (px+hx, py+hy); scale expands around it
    el.style.transform = `translate3d(${(px + ix + hx - cell.width / 2).toFixed(2)}px, ${(py + iy + hy - cell.height / 2).toFixed(2)}px, 0) rotate(${cell.rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`
    el.style.opacity = op < 0.999 ? op.toFixed(3) : '1'
  }

  if (bestIdx !== featured && bestD < 0.9 * l && !focused) {
    featured = bestIdx
    updatePreview(layout.cells[featured].mi)
  }
  prevPos.x += (rawPointer.x - prevPos.x) * 0.25
  prevPos.y += (rawPointer.y - prevPos.y) * 0.25
  positionPreview(prevPos.x, prevPos.y)
  requestAnimationFrame(frame)
}
const featuredVisible = () => started

// ── hover preview (the floating card that follows the cursor) ──
const preview = document.getElementById('preview')
const previewMediaWrap = preview.querySelector('.preview-media')
const previewCat = preview.querySelector('.preview-cat')
const previewLabel = preview.querySelector('.preview-label')
let previewMi = -1
function updatePreview(mi) {
  if (mi === previewMi) return
  previewMi = mi
  const item = media[mi]
  previewMediaWrap.textContent = ''
  previewMediaWrap.appendChild(makeMediaEl(item, 320, 'cover'))
  previewMediaWrap.style.aspectRatio = String(item.aspect)
  previewCat.textContent = item.category
  previewLabel.textContent = item.label || ''
  previewLabel.style.display = item.label ? '' : 'none'
}
function positionPreview(x, y) {
  if (focused) { preview.style.opacity = '0'; return }
  preview.style.transform = `translate3d(${(x).toFixed(1)}px, ${(y).toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.7 + 0.3 * previewScale).toFixed(3)})`
  preview.style.opacity = previewScale.toFixed(3)
}

// ── lightbox ──────────────────────────────────────────────────
const lightbox = document.getElementById('lightbox')
const lbMedia = lightbox.querySelector('.lb-media')
const lbCat = lightbox.querySelector('.lb-cat')
const lbTitle = lightbox.querySelector('.lb-title')
const lbMeta = lightbox.querySelector('.lb-meta')
const lbDownload = lightbox.querySelector('.lb-download')
let lbIndex = 0

function openLightbox(mi) {
  lbIndex = mi
  focused = true
  renderLightbox()
  lightbox.classList.add('show')
  document.body.style.overflow = 'hidden'
}
function closeLightbox() {
  focused = false
  lightbox.classList.remove('show')
  document.body.style.overflow = ''
}
function navLightbox(dir) {
  lbIndex = (lbIndex + dir + media.length) % media.length
  renderLightbox()
}
function renderLightbox() {
  const item = media[lbIndex]
  lbMedia.textContent = ''
  const el = makeMediaEl(item, 1400, 'contain') // full photo, no crop
  if (item.kind === 'video') { el.controls = true }
  lbMedia.appendChild(el)
  lbMedia.style.aspectRatio = String(item.aspect)
  lbCat.textContent = item.category
  lbTitle.textContent = item.label || 'Untitled'
  lbMeta.textContent = item.meta || ''
  lbMeta.style.display = item.meta ? '' : 'none'
  lbDownload.href = item.url || srcFor(item, 1600)
  lbDownload.download = item.label || 'photo'
}
lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox)
lightbox.querySelector('.lb-prev').addEventListener('click', () => navLightbox(-1))
lightbox.querySelector('.lb-next').addEventListener('click', () => navLightbox(1))
lightbox.querySelector('.lb-backdrop').addEventListener('click', closeLightbox)
addEventListener('keydown', (e) => {
  if (!focused) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') navLightbox(-1)
  else if (e.key === 'ArrowRight') navLightbox(1)
})

// ── input: pointer, pan (middle drag), zoom (wheel) ───────────
addEventListener('pointermove', (e) => {
  rawPointer.x = e.clientX
  rawPointer.y = e.clientY
  if (panning) return
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.has = true
  if (!started) started = true
})
stage.addEventListener('pointerenter', () => { hovering = true })
stage.addEventListener('pointerleave', () => { hovering = false })
addEventListener('blur', () => { hovering = false })

// click anywhere opens the *featured* (nearest) photo — tiles part away from
// the cursor, so aiming at one is hard; opening the centred one is the fix.
let downPos = null
let dragged = false
stage.addEventListener('pointerdown', (e) => {
  if (e.button === 0) { downPos = { x: e.clientX, y: e.clientY }; dragged = false }
})
addEventListener('pointermove', (e) => {
  if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) dragged = true
})
stage.addEventListener('click', () => {
  if (focused || dragged) return
  if (layout && layout.cells[featured]) openLightbox(layout.cells[featured].mi)
})

// middle-button drag to pan
let panning = false
let panLast = null
addEventListener('pointerdown', (e) => {
  if (e.button !== 1) return
  e.preventDefault()
  panning = true
  panLast = { x: e.clientX, y: e.clientY }
  stage.classList.add('grabbing')
  stage.setPointerCapture && stage.setPointerCapture(e.pointerId)
})
addEventListener('pointermove', (e) => {
  if (!panning || !panLast) return
  panTarget.x += e.clientX - panLast.x
  panTarget.y += e.clientY - panLast.y
  panLast = { x: e.clientX, y: e.clientY }
})
addEventListener('pointerup', () => { panning = false; panLast = null; stage.classList.remove('grabbing') })
// block the middle-click autoscroll cursor
addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault() })
addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault() })

// scroll to zoom
addEventListener(
  'wheel',
  (e) => {
    if (focused) return
    e.preventDefault()
    zoom = Math.min(3, Math.max(0.4, zoom * (1 - e.deltaY * 0.0012)))
  },
  { passive: false },
)

addEventListener('resize', () => {
  const m = innerWidth < 768
  if (innerWidth !== vp.vw || m !== vp.mobile || Math.abs(innerHeight - vp.vh) > 200) relayout()
})

// ── uploads (drag-drop + button) — replace media everywhere ───
function readFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    const probe = document.createElement(isVideo ? 'video' : 'img')
    const done = (w, h) => {
      const aspect = w && h ? w / h : 1.5
      resolve({
        kind: isVideo ? 'video' : 'image',
        url,
        aspect: Math.max(0.4, Math.min(3.2, aspect)),
        label: file.name,
        category: isVideo ? 'Video' : 'Photo',
        meta: `${(file.type.split('/')[1] || '').toUpperCase()} · ${w}×${h} · ${(file.size / 1048576).toFixed(1)} MB`,
      })
    }
    if (isVideo) {
      probe.preload = 'metadata'
      probe.onloadedmetadata = () => done(probe.videoWidth, probe.videoHeight)
      probe.onerror = () => done(0, 0)
      probe.src = url
    } else {
      probe.onload = () => done(probe.naturalWidth, probe.naturalHeight)
      probe.onerror = () => done(0, 0)
      probe.src = url
    }
  })
}
let uploaded = []
async function addFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
  if (!files.length) return
  const items = await Promise.all(files.map(readFile))
  uploaded.push(...items)
  media = uploaded.slice()
  featured = 0
  previewMi = -1
  relayout()
  setReset(true)
  toast(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} on the wall`)
}
function resetMedia() {
  uploaded.forEach((i) => i.url && URL.revokeObjectURL(i.url))
  uploaded = []
  media = defaultMedia()
  featured = 0
  previewMi = -1
  relayout()
  setReset(false)
  toast('Wall reset')
}

// wire the controls (built in index.html)
const fileInput = document.getElementById('file')
fileInput.addEventListener('change', () => { if (fileInput.files.length) addFiles(fileInput.files); fileInput.value = '' })
document.getElementById('upload').addEventListener('click', () => fileInput.click())
const resetBtn = document.getElementById('reset')
resetBtn.addEventListener('click', resetMedia)
function setReset(on) {
  resetBtn.hidden = !on
  document.querySelector('#upload .label').textContent = on ? 'Add more' : 'Upload media'
}

const dropEl = document.getElementById('drop')
let dragDepth = 0
const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; dropEl.classList.add('show') })
addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); dropEl.classList.add('over') } })
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; dropEl.classList.remove('show', 'over') } })
addEventListener('drop', (e) => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth = 0
  dropEl.classList.remove('show', 'over')
  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
})

// toast
const toastEl = document.getElementById('toast')
let toastTimer = null
function toast(msg) {
  toastEl.textContent = msg
  toastEl.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200)
}

// ── theme (dark / light) ──────────────────────────────────────
const themeBtn = document.getElementById('theme')
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
  if (window.__intersticesLogo) window.__intersticesLogo.setColor(ink || '#fff')
  try { localStorage.setItem('ix-theme', theme) } catch {}
}
let theme = 'dark'
try { theme = localStorage.getItem('ix-theme') || 'dark' } catch {}
applyTheme(theme)
themeBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark'
  applyTheme(theme)
})

// ── go ────────────────────────────────────────────────────────
relayout()
requestAnimationFrame(frame)
