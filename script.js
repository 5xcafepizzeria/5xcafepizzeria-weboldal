// ===== HEADER PARTICLES =====
;(function () {
  const canvas = document.getElementById('header-particles')
  const ctx    = canvas.getContext('2d')
  const MOBILE = window.innerWidth < 600
  const COUNT  = MOBILE ? 22 : 55
  const COLORS = ['#E8C97A', '#C9A84C', '#A07828', '#F0D898']

  let W, H, particles

  function resize() {
    W = canvas.width  = canvas.offsetWidth
    H = canvas.height = canvas.offsetHeight
  }

  function rand(min, max) { return Math.random() * (max - min) + min }

  function makeParticle() {
    return {
      x:     rand(0, W),
      y:     rand(0, H),
      r:     MOBILE
               ? (Math.random() < 0.65 ? rand(1, 3) : rand(3, 6))
               : (Math.random() < 0.65 ? rand(3, 7) : rand(7, 10)),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: rand(0.08, 0.55),
      vx:    rand(-0.18, 0.18),
      vy:    rand(-0.32, -0.06),   // mostly float upward
      va:    rand(-0.003, 0.003),  // alpha drift
      life:  rand(0, Math.PI * 2) // phase offset for breathing
    }
  }

  function init() {
    resize()
    particles = Array.from({ length: COUNT }, makeParticle)
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)

    particles.forEach(p => {
      // breathing alpha
      p.life += 0.012
      const breath = (Math.sin(p.life) + 1) / 2   // 0..1
      const a = Math.max(0, Math.min(0.65, p.alpha + breath * 0.18))

      ctx.globalAlpha = a
      ctx.fillStyle   = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()

      // move
      p.x += p.vx
      p.y += p.vy

      // wrap around
      if (p.y < -4)  p.y = H + 4
      if (p.x < -4)  p.x = W + 4
      if (p.x > W + 4) p.x = -4
    })

    ctx.globalAlpha = 1
    requestAnimationFrame(draw)
  }

  init()
  draw()
  window.addEventListener('resize', () => { resize() })
})()

// ===== WEEK LABEL =====
function getCurrentWeekLabel() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, …, 6=Sat
  // On Mon/Tue show the *upcoming* Wed; on Wed–Sun show the current/past Wed
  const daysToWed = (day === 1 || day === 2)
    ? (3 - day)                // Mon→+2, Tue→+1 (forward to next Wed)
    : -((day + 4) % 7)        // Wed→0, Thu→−1, Fri→−2, Sat→−3, Sun→−4
  const wednesday = new Date(now)
  wednesday.setDate(now.getDate() + daysToWed)
  const sunday = new Date(wednesday)
  sunday.setDate(wednesday.getDate() + 4)

  const months = ['január','február','március','április','május','június',
                  'július','augusztus','szeptember','október','november','december']
  const y  = wednesday.getFullYear()
  const m1 = wednesday.getMonth()
  const m2 = sunday.getMonth()
  const d1 = wednesday.getDate()
  const d2 = sunday.getDate()

  return m1 === m2
    ? `${y}. ${months[m1]} ${d1}–${d2}.`
    : `${y}. ${months[m1]} ${d1} – ${months[m2]} ${d2}.`
}

// ===== STATE =====
let allItems = []
let activeCategory = 'all'
let activePopup = null

const overlay   = document.getElementById('overlay')
const navEl     = document.getElementById('category-nav')
const container = document.getElementById('menu-container')

// ===== WEEKLY MENU =====
fetch('weekly_menu.json')
  .then(r => r.json())
  .then(data => {
    const section = document.getElementById('weekly-section')

    const categoriesHtml = (data.categories || []).map(cat => `
      <div class="weekly-cat">
        <h3 class="weekly-cat-name">${cat.name}</h3>
        <ul class="weekly-dish-list">
          ${cat.items.map(item => `
            <li class="weekly-dish-item">
              <span class="weekly-dish-name">${item.dish}</span>
              <span class="weekly-dish-price">${item.price}&nbsp;Ft</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')

    const promoHtml = data.promotion ? `
      <div class="weekly-promo">
        <p class="weekly-promo-title">${data.promotion.title}</p>
        <p class="weekly-promo-desc">${data.promotion.description}</p>
        <p class="weekly-promo-note">${data.promotion.note}</p>
      </div>
    ` : ''

    section.innerHTML = `
      <div class="weekly-header">
        <h2 class="weekly-title">Heti Ajánlat</h2>
        <p class="weekly-subtitle">${getCurrentWeekLabel()}</p>
      </div>
      <div class="weekly-card">
        <div class="weekly-card-body">
          ${categoriesHtml}
        </div>
        ${promoHtml}
      </div>
    `
  })
  .catch(() => {
    document.getElementById('weekly-section').hidden = true
  })

// ===== DRINKS =====
const drinksContainer = document.getElementById('drinks-container')

fetch('drinks.json')
  .then(r => r.json())
  .then(data => {
    const grouped = {}
    data.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    })

    Object.entries(grouped).forEach(([cat, items]) => {
      const block = document.createElement('div')
      block.className = 'drinks-block'

      const heading = document.createElement('h3')
      heading.className = 'drinks-block-heading'
      heading.textContent = cat
      block.appendChild(heading)

      const list = document.createElement('ul')
      list.className = 'drinks-list'

      items.forEach(item => {
        const li = document.createElement('li')
        li.className = 'drinks-item'
        li.innerHTML = `
          <span class="drinks-name">${item.name}</span>
          <span class="drinks-price">${item.price}&nbsp;Ft</span>
          ${item.description ? `<span class="drinks-sub">${item.description}</span>` : ''}
        `
        list.appendChild(li)
      })

      block.appendChild(list)
      drinksContainer.appendChild(block)
    })
  })
  .catch(err => console.error('Nem sikerült betölteni az itallapot:', err))

// ===== GALLERY =====
let galleryItems = []
let lightboxIndex = 0
let pauseGallerySlideshow = null
let resumeGallerySlideshow = null

const lightbox        = document.getElementById('lightbox')
const lightboxContent = document.getElementById('lightbox-content')
const lightboxCaption = document.getElementById('lightbox-caption')

fetch('gallery.json')
  .then(r => r.json())
  .then(items => {
    galleryItems = items
    const section = document.getElementById('gallery-section')
    if (!items.length) { section.hidden = true; return }

    section.innerHTML = `
      <div class="gallery-header">
        <h2 class="gallery-title">Galéria</h2>
      </div>
      <div class="gallery-strip-wrap" id="gallery-strip-wrap">
        <div class="gallery-row-outer"><div class="gallery-row-track" id="gallery-row-0"></div></div>
        <div class="gallery-row-outer"><div class="gallery-row-track" id="gallery-row-1"></div></div>
      </div>
      <div class="gallery-footer">
        <button class="gallery-more-btn" id="gallery-all-btn">Összes kép</button>
      </div>
      <div class="gallery-all-overlay" id="gallery-all-overlay" hidden>
        <div class="gallery-all-header">
          <h3 class="gallery-all-title">Galéria</h3>
          <button class="gallery-all-close" id="gallery-all-close" aria-label="Bezárás">&#x2715;</button>
        </div>
        <div class="gallery-all-grid" id="gallery-all-grid"></div>
      </div>
    `

    const allOverlay = document.getElementById('gallery-all-overlay')
    const allGrid    = document.getElementById('gallery-all-grid')
    const tracks     = [
      document.getElementById('gallery-row-0'),
      document.getElementById('gallery-row-1')
    ]

    // Shuffle items randomly
    const shuffled = [...items].sort(() => Math.random() - 0.5)

    // Split into 2 rows
    const rows = [
      shuffled.filter((_, i) => i % 2 === 0),
      shuffled.filter((_, i) => i % 2 === 1)
    ]

    const SPEED = 70 // px/s — same for both rows

    // Build tiles (no animation yet)
    rows.forEach((rowItems, rowIdx) => {
      if (!rowItems.length) return
      const track = tracks[rowIdx]
      for (let pass = 0; pass < 2; pass++) {
        rowItems.forEach(item => {
          const globalIdx = items.indexOf(item)
          const src = item.src || item.thumb || ''
          const tile = document.createElement('div')
          tile.className = 'gallery-tile'
          if (pass === 1) tile.setAttribute('aria-hidden', 'true')
          tile.innerHTML = `
            <div class="gallery-tile-img">
              <img src="${src}" alt="${item.caption || ''}" loading="lazy">
              ${item.type === 'video' ? `<div class="gallery-play-icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>` : ''}
            </div>
            ${item.caption ? `<p class="gallery-tile-caption">${item.caption}</p>` : ''}
          `
          tile.addEventListener('click', () => openLightbox(globalIdx))
          track.appendChild(tile)
        })
      }
    })

    // Collect first-set images from both rows
    const allFirstImgs = tracks.flatMap((track, rowIdx) =>
      Array.from(track.querySelectorAll('.gallery-tile'))
        .slice(0, (rows[rowIdx] || []).length)
        .map(t => t.querySelector('img'))
        .filter(Boolean)
    )

    // Start BOTH rows together once all images are measured
    let remaining = allFirstImgs.length || 1
    const startAll = () => {
      remaining--
      if (remaining > 0) return
      requestAnimationFrame(() => {
        tracks.forEach((track, rowIdx) => {
          if (!(rows[rowIdx] || []).length) return
          const singleSetW = track.scrollWidth / 2
          if (singleSetW > 0) {
            track.style.animation = `gallery-scroll ${Math.round(singleSetW / SPEED)}s linear infinite`
          }
        })
      })
    }

    allFirstImgs.forEach(img => {
      if (img.complete && img.naturalWidth > 0) startAll()
      else {
        img.addEventListener('load',  startAll, { once: true })
        img.addEventListener('error', startAll, { once: true })
      }
    })
    if (!allFirstImgs.length) startAll()

    // "Összes kép" thumbnails
    items.forEach((item, i) => {
      const src = item.src || item.thumb || ''
      const thumb = document.createElement('div')
      thumb.className = 'gallery-all-thumb'
      thumb.innerHTML = `<img src="${src}" alt="${item.caption || ''}" loading="lazy">`
      thumb.addEventListener('click', () => { closeAllOverlay(); openLightbox(i) })
      allGrid.appendChild(thumb)
    })

    function pause()  { tracks.forEach(t => { t.style.animationPlayState = 'paused' }) }
    function resume() { tracks.forEach(t => { t.style.animationPlayState = 'running' }) }

    pauseGallerySlideshow  = pause
    resumeGallerySlideshow = resume

    function closeAllOverlay() {
      allOverlay.hidden = true
      document.body.style.overflow = ''
      resume()
    }

    document.getElementById('gallery-all-btn').addEventListener('click', () => {
      allOverlay.hidden = false
      document.body.style.overflow = 'hidden'
      pause()
    })
    document.getElementById('gallery-all-close').addEventListener('click', closeAllOverlay)
    allOverlay.addEventListener('click', e => { if (e.target === allOverlay) closeAllOverlay() })
  })
  .catch(() => {
    document.getElementById('gallery-section').hidden = true
  })

function openLightbox(index) {
  lightboxIndex = index
  renderLightbox()
  lightbox.classList.add('active')
  document.body.style.overflow = 'hidden'
  if (pauseGallerySlideshow) pauseGallerySlideshow()
}

function closeLightbox() {
  lightbox.classList.remove('active')
  document.body.style.overflow = ''
  const vid = lightboxContent.querySelector('video')
  if (vid) vid.pause()
  if (resumeGallerySlideshow) resumeGallerySlideshow()
}

function renderLightbox() {
  const item = galleryItems[lightboxIndex]
  lightboxCaption.textContent = item.caption || ''

  if (item.type === 'video') {
    lightboxContent.innerHTML = `
      <video src="${item.src}" controls autoplay playsinline></video>
    `
  } else {
    lightboxContent.innerHTML = `
      <img src="${item.src}" alt="${item.caption || ''}">
    `
  }

  // Hide nav arrows if only one item
  document.getElementById('lightbox-prev').style.display = galleryItems.length < 2 ? 'none' : ''
  document.getElementById('lightbox-next').style.display = galleryItems.length < 2 ? 'none' : ''
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox)
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox() })

document.getElementById('lightbox-prev').addEventListener('click', e => {
  e.stopPropagation()
  const vid = lightboxContent.querySelector('video')
  if (vid) vid.pause()
  lightboxIndex = (lightboxIndex - 1 + galleryItems.length) % galleryItems.length
  renderLightbox()
})

document.getElementById('lightbox-next').addEventListener('click', e => {
  e.stopPropagation()
  const vid = lightboxContent.querySelector('video')
  if (vid) vid.pause()
  lightboxIndex = (lightboxIndex + 1) % galleryItems.length
  renderLightbox()
})

// ===== BOOTSTRAP =====
fetch('menu.json')
  .then(r => r.json())
  .then(data => {
    allItems = data
    buildNav(data)
    renderMenu(data)
    drinksSection.hidden = false
    handleInitialHash()
  })
  .catch(err => console.error('Nem sikerült betölteni az étlapot:', err))

const foodSection   = document.getElementById('food-section')
const drinksSection = document.getElementById('drinks-section')

function showFood() {
  foodSection.hidden   = false
  drinksSection.hidden = true
}

function showDrinks() {
  foodSection.hidden   = true
  drinksSection.hidden = false
}

// ===== SCROLL TO NAV =====
function scrollToNav() {
  const anchor = document.getElementById('nav-anchor')
  window.scrollTo({ top: anchor.offsetTop, behavior: 'smooth' })
}

// ===== CATEGORY NAV =====
function buildNav(items) {
  const categories = [...new Set(items.map(i => i.category))]

  const allBtn = makeNavBtn('Összes', 'all', true)
  allBtn.classList.add('active')
  navEl.appendChild(allBtn)

  categories.forEach(cat => navEl.appendChild(makeNavBtn(cat, cat, false)))

  // Drinks toggle at the end of the food nav
  const drinksBtn = document.createElement('button')
  drinksBtn.className = 'category-btn'
  drinksBtn.textContent = 'Italok'
  drinksBtn.dataset.category = 'drinks'
  drinksBtn.addEventListener('click', () => {
    navEl.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
    drinksBtn.classList.add('active')
    showDrinks()
    scrollToNav()
  })
  navEl.appendChild(drinksBtn)
}

function makeNavBtn(label, value, showDrinksAlso = false) {
  const btn = document.createElement('button')
  btn.className = 'category-btn'
  btn.textContent = label
  btn.dataset.category = value
  btn.addEventListener('click', () => {
    activeCategory = value
    navEl.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    foodSection.hidden = false
    drinksSection.hidden = !showDrinksAlso
    renderMenu(allItems)
    scrollToNav()
  })
  return btn
}

// ===== RENDER MENU =====
function renderMenu(items) {
  container.innerHTML = ''

  const filtered = activeCategory === 'all'
    ? items
    : items.filter(i => i.category === activeCategory)

  if (!filtered.length) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:3rem">Nincs találat.</p>'
    return
  }

  // Group by category preserving order
  const grouped = {}
  filtered.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  Object.entries(grouped).forEach(([cat, catItems]) => {
    const section = document.createElement('div')
    section.className = 'category-section'

    const heading = document.createElement('h2')
    heading.className = 'category-heading'
    heading.textContent = cat
    section.appendChild(heading)

    if (cat === 'Pizza') {
      const list = document.createElement('ul')
      list.className = 'drinks-list drinks-list--two-col'
      catItems.forEach(item => {
        const li = document.createElement('li')
        li.className = 'drinks-item'
        li.innerHTML = `
          <span class="drinks-name">${item.name}</span>
          <span class="drinks-price">${item.price}&nbsp;Ft</span>
          ${item.description ? `<span class="drinks-sub">${item.description}</span>` : ''}
        `
        list.appendChild(li)
      })
      section.appendChild(list)
    } else {
      const grid = document.createElement('div')
      grid.className = 'menu-grid'
      catItems.forEach(item => grid.appendChild(makeCard(item)))
      section.appendChild(grid)
    }

    container.appendChild(section)
  })
}

// ===== CARD =====
function makeCard(item) {
  const card = document.createElement('div')
  card.className  = 'menu-card'
  card.id         = item.id
  card.tabIndex   = 0
  card.setAttribute('role', 'button')
  card.setAttribute('aria-label', item.name)

  const imgSrc = item.image
    ? item.image
    : placeholderFor(item.name)

  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${imgSrc}" alt="${item.name}"
           onerror="this.src='${placeholderFor(item.name)}'" />
      <span class="card-badge">${item.category}</span>
    </div>
    <div class="card-body">
      <h3 class="card-name">${item.name}</h3>
      ${item.description
        ? `<p class="card-desc">${item.description}</p>`
        : item.allergens ? `<p class="card-desc">⚠ ${item.allergens}</p>` : ''}
      ${item.price ? `<p class="card-price">${item.price}&nbsp;Ft</p>` : ''}
    </div>
  `

  card.addEventListener('click', () => openPopup(item))
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPopup(item) }
  })

  return card
}

// ===== POPUP =====
function openPopup(item) {
  closePopup()   // close any existing one first

  const imgSrc = item.image
    ? item.image
    : placeholderFor(item.name)

  const popup = document.createElement('div')
  popup.className = 'popup'
  popup.id = 'active-popup'
  popup.setAttribute('role', 'dialog')
  popup.setAttribute('aria-modal', 'true')
  popup.setAttribute('aria-label', item.name)

  popup.innerHTML = `
    <button class="popup-close" aria-label="Bezárás">&#x2715;</button>
    <div class="popup-img-wrap">
      <img src="${imgSrc}" alt="${item.name}"
           onerror="this.src='${placeholderFor(item.name)}'" />
    </div>
    <div class="popup-body">
      <span class="popup-badge">${item.category}</span>
      <h2 class="popup-name">${item.name}</h2>
      ${item.description ? `<p class="popup-desc">${item.description}</p>` : ''}
      ${item.allergens ? `<p class="popup-desc"><span class="popup-allergen-label">Allergének:</span> ${item.allergens}</p>` : ''}
      ${item.price ? `<p class="popup-price">${item.price}&nbsp;Ft</p>` : ''}
    </div>
  `

  document.body.appendChild(popup)
  document.body.style.overflow = 'hidden'
  activePopup = popup

  // Animate in on next frame
  requestAnimationFrame(() => {
    popup.classList.add('active')
    overlay.classList.add('active')
  })

  popup.querySelector('.popup-close').addEventListener('click', closePopup)
  overlay.addEventListener('click', closePopup, { once: true })

  // Update hash so QR code can deep-link to this item
  history.replaceState(null, '', '#' + item.id)
}

function closePopup() {
  if (!activePopup) return
  const p = activePopup
  p.classList.remove('active')
  overlay.classList.remove('active')
  document.body.style.overflow = ''
  activePopup = null
  setTimeout(() => p.remove(), 280)
  history.replaceState(null, '', location.pathname + location.search)
}

// ===== HASH / QR ROUTING =====
function handleInitialHash() {
  const id = window.location.hash.slice(1)
  if (!id) return

  const item = allItems.find(i => i.id === id)
  if (!item) return

  setTimeout(() => {
    const card = document.getElementById(id)
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => openPopup(item), 300)
  }, 400)
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePopup(); closeLightbox() }
  if (e.key === 'ArrowLeft'  && lightbox.classList.contains('active')) document.getElementById('lightbox-prev').click()
  if (e.key === 'ArrowRight' && lightbox.classList.contains('active')) document.getElementById('lightbox-next').click()
})

// ===== HELPERS =====
function placeholderFor(name) {
  return `https://placehold.co/600x400/111111/C9A84C?text=${encodeURIComponent(name)}`
}
