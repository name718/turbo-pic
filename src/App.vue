<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { fetchCuratedPhotos, searchPhotos, fetchPopularVideos, searchVideos, mapPhotoItems, mapVideoItems } from './services/pexels'

const query = ref('')
const activeChip = ref('热门')
const activeTab = ref('全部') // 全部 | 图片 | 视频
const mixMode = ref('均衡') // 均衡 | 视频优先 | 图片优先
const videoRatio = ref(0.3) // 目标视频比例（仅在“全部”时生效）
const theme = ref('dark') // dark | light

const categories = [
  { label: '热门', term: '' , icon: '🔥' },
  { label: '风景', term: '风景', icon: '🏞️' },
  { label: '城市', term: '城市', icon: '🏙️' },
  { label: '极简', term: '极简', icon: '⚪' },
  { label: '科技', term: '科技', icon: '🧪' },
  { label: '动物', term: '动物', icon: '🐾' },
  { label: '人物', term: '人物', icon: '👤' },
  { label: '旅行', term: '旅行', icon: '✈️' },
]

const photoPage = ref(1)
const videoPage = ref(1)
const isLoading = ref(false)
const errorMsg = ref('')

const photos = ref([])
const videos = ref([])

const displayList = computed(() => {
  if (activeTab.value === '图片') return photos.value
  if (activeTab.value === '视频') return videos.value
  const startWith = mixMode.value === '视频优先' ? 'video' : mixMode.value === '图片优先' ? 'photo' : 'auto'
  const density = Math.min(0.8, Math.max(0.1, videoRatio.value || 0.3))
  return mergeByRatio(photos.value, videos.value, density, startWith)
})

function mergeByRatio(photoArr, videoArr, density, startWith) {
  const out = []
  let pi = 0, vi = 0
  let vCount = 0, total = 0
  let nextIsVideo = startWith === 'video'
  while (pi < photoArr.length || vi < videoArr.length) {
    const vShare = total > 0 ? vCount / total : 0
    const shouldPickVideo = (nextIsVideo || vShare < density) && vi < videoArr.length
    if (shouldPickVideo) {
      out.push(videoArr[vi++])
      vCount++; total++
    } else if (pi < photoArr.length) {
      out.push(photoArr[pi++])
      total++
    } else if (vi < videoArr.length) {
      out.push(videoArr[vi++])
      vCount++; total++
    } else {
      break
    }
    nextIsVideo = (total > 0 ? (vCount / total) < density : startWith === 'video')
  }
  return out
}

async function loadInitial() {
  isLoading.value = true
  errorMsg.value = ''
  try {
    const [p, v] = await Promise.all([
      fetchCuratedPhotos(1, 24),
      fetchPopularVideos(1, 12)
    ])
    photos.value = mapPhotoItems(p)
    videos.value = mapVideoItems(v)
    photoPage.value = 1
    videoPage.value = 1
  } catch (e) {
    console.error(e)
    errorMsg.value = '加载失败：请检查网络，或是否已配置 VITE_PEXELS_API_KEY。'
  } finally {
    isLoading.value = false
  }
}

async function onSearch() {
  const q = query.value.trim()
  if (!q) return loadInitial()
  errorMsg.value = ''
  isLoading.value = true
  try {
    const [p, v] = await Promise.all([
      searchPhotos(q, 1, 24),
      searchVideos(q, 1, 12)
    ])
    photos.value = mapPhotoItems(p)
    videos.value = mapVideoItems(v)
    photoPage.value = 1
    videoPage.value = 1
  } catch (e) {
    console.error(e)
    errorMsg.value = '搜索失败：请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value) return
  errorMsg.value = ''
  isLoading.value = true
  try {
    const hasQuery = !!query.value.trim()
    const nextPhotoPage = photoPage.value + 1
    const nextVideoPage = videoPage.value + 1
    const [p, v] = await Promise.all([
      hasQuery ? searchPhotos(query.value.trim(), nextPhotoPage, 24) : fetchCuratedPhotos(nextPhotoPage, 24),
      hasQuery ? searchVideos(query.value.trim(), nextVideoPage, 12) : fetchPopularVideos(nextVideoPage, 12)
    ])
    photos.value = photos.value.concat(mapPhotoItems(p))
    videos.value = videos.value.concat(mapVideoItems(v))
    photoPage.value = nextPhotoPage
    videoPage.value = nextVideoPage
  } catch (e) {
    console.error(e)
    errorMsg.value = '加载更多失败：请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

function onChip(name) {
  activeChip.value = name
  query.value = name === '热门' ? '' : name
  onSearch()
}

function onScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  if (scrollTop + clientHeight >= scrollHeight - 120) {
    loadMore()
  }
}

function onVideoEnter(e) {
  const el = e.currentTarget?.querySelector('video')
  if (el) {
    el.play?.().catch(() => {})
  }
}
function onVideoLeave(e) {
  const el = e.currentTarget?.querySelector('video')
  if (el) {
    el.pause?.()
  }
}

async function downloadResource(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    const a = document.createElement('a')
    const objectUrl = URL.createObjectURL(blob)
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    console.error('download failed', err)
    window.open(url, '_blank')
  }
}

function inferExtFromUrl(url, fallback) {
  const m = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(url || '')
  return m ? m[1] : fallback
}

function makeSafeFilename(name) {
  return (name || 'download').replace(/[^\w\-\.]+/g, '_')
}

async function onDownloadPhoto(item) {
  const ext = inferExtFromUrl(item.full, 'jpg')
  const base = item.alt || `pexels-photo-${item.id}`
  const filename = makeSafeFilename(base) + '.' + ext
  await downloadResource(item.full, filename)
}

async function onDownloadVideo(item) {
  const ext = inferExtFromUrl(item.mp4, 'mp4')
  const base = item.author || `pexels-video-${item.id}`
  const filename = makeSafeFilename(base) + '.' + ext
  await downloadResource(item.mp4, filename)
}

// Detail modal state & controls
const detailOpen = ref(false)
const detailItem = ref(null)
const detailIndex = ref(-1)

function openDetail(item) {
  detailItem.value = item
  detailIndex.value = displayList.value.findIndex(x => x.type === item.type && x.id === item.id)
  detailOpen.value = true
  document.documentElement.style.overflow = 'hidden'
}

function closeDetail() {
  detailOpen.value = false
  detailItem.value = null
  document.documentElement.style.overflow = ''
}

function onEsc(e) {
  if (e.key === 'Escape' && detailOpen.value) closeDetail()
  if (!detailOpen.value) return
  if (e.key === 'ArrowRight') onNext()
  if (e.key === 'ArrowLeft') onPrev()
}

function onNext() {
  const list = displayList.value
  if (!list.length) return
  detailIndex.value = (detailIndex.value + 1 + list.length) % list.length
  detailItem.value = list[detailIndex.value]
}

function onPrev() {
  const list = displayList.value
  if (!list.length) return
  detailIndex.value = (detailIndex.value - 1 + list.length) % list.length
  detailItem.value = list[detailIndex.value]
}

function getInitials(name) {
  const n = (name || '').trim()
  if (!n) return 'P'
  const parts = n.split(/\s+/)
  const a = parts[0]?.[0] || ''
  const b = parts[1]?.[0] || ''
  return (a + b).toUpperCase()
}

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 1600)
}

async function copyLink(url) {
  const text = url || ''
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      showToast('已复制链接')
      return
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    showToast(ok ? '已复制链接' : '复制失败')
  } catch (e) {
    console.error('copy failed', e)
    showToast('复制失败')
  }
}

onMounted(() => {
  loadInitial()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onEsc)
  const savedTheme = localStorage.getItem('tp_theme')
  if (savedTheme === 'light' || savedTheme === 'dark') theme.value = savedTheme
  else {
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    theme.value = prefers
  }
  document.documentElement.setAttribute('data-theme', theme.value)
  if (window.matchMedia) {
    mediaListener = (e) => {
      if (!localStorage.getItem('tp_theme')) {
        theme.value = e.matches ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', theme.value)
      }
    }
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.addEventListener?.('change', mediaListener)
    mq.addListener?.(mediaListener)
  }
})

let mediaListener = null
onUnmounted(() => {
  if (window.matchMedia && mediaListener) {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    mq.removeEventListener?.('change', mediaListener)
    mq.removeListener?.(mediaListener)
  }
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('tp_theme', theme.value)
}
</script>

<template>
  <header class="header">
    <div class="container nav">
      <div class="brand">
        <span class="cn">极速图界</span>
        <span class="en">TurboPic</span>
      </div>
      <div class="search">
        <input v-model="query" type="text" placeholder="搜索免费壁纸与短视频，例如：风景、城市、极简" @keyup.enter="onSearch" />
        <button @click="onSearch">搜索</button>
        <button class="chip" @click="toggleTheme()" :title="theme==='dark' ? '切换为亮色' : '切换为暗色'" aria-label="主题切换">
          <span v-if="theme==='dark'">☀️</span>
          <span v-else>🌙</span>
        </button>
      </div>
    </div>
    <div class="container">
      <div class="tabs">
        <div class="tab" :class="{ active: activeTab==='全部' }" @click="activeTab='全部'">全部</div>
        <div class="tab" :class="{ active: activeTab==='图片' }" @click="activeTab='图片'">图片</div>
        <div class="tab" :class="{ active: activeTab==='视频' }" @click="activeTab='视频'">视频</div>
      </div>
      <div class="categories-scroll" aria-label="categories">
        <div class="chip" v-for="c in categories" :key="c.label" :class="{ active: activeChip===c.label }" @click="onChip(c.label)">
          <span class="i">{{ c.icon }}</span>
          <span>{{ c.label }}</span>
        </div>
      </div>
      <div class="controls" v-if="activeTab==='全部'">
        <div class="seg">
          <button class="opt" :class="{active: mixMode==='均衡'}" @click="mixMode='均衡'">均衡</button>
          <button class="opt" :class="{active: mixMode==='视频优先'}" @click="mixMode='视频优先'">视频优先</button>
          <button class="opt" :class="{active: mixMode==='图片优先'}" @click="mixMode='图片优先'">图片优先</button>
        </div>
        <div class="seg">
          <button class="opt" :class="{active: videoRatio===0.2}" @click="videoRatio=0.2">20%</button>
          <button class="opt" :class="{active: videoRatio===0.3}" @click="videoRatio=0.3">30%</button>
          <button class="opt" :class="{active: videoRatio===0.4}" @click="videoRatio=0.4">40%</button>
        </div>
      </div>
    </div>
  </header>

  <main class="main">
    <div class="container">
      <div v-if="errorMsg" style="margin-top:12px; padding:10px 12px; border-radius:10px; background: #2a1f1f; color:#ffb4b4; border:1px solid rgba(255,0,0,0.25);">
        {{ errorMsg }}
      </div>
      <div class="grid">
        <div class="masonry">
          <div v-for="item in displayList" :key="item.type + '-' + item.id" class="masonry-item card" @mouseenter="item.type==='video' && onVideoEnter($event)" @mouseleave="item.type==='video' && onVideoLeave($event)">
            <template v-if="item.type==='photo'">
              <div class="hover-overlay" :style="{ backgroundColor: item.avgColor }" @click="openDetail(item)">
                <img :src="item.display" :srcset="item.srcset" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" class="media" :alt="item.alt || 'photo'" loading="lazy" />
                <div class="meta">
                  <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <a :href="item.photographerUrl || item.url" target="_blank" rel="noreferrer" style="color:#fff; text-decoration:none;">{{ item.photographer || 'Pexels Photo' }}</a>
                  </div>
                  <div class="actions">
                    <button class="btn icon" type="button" @click.stop="onDownloadPhoto(item)" title="下载" aria-label="下载">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="hover-overlay" @click="openDetail(item)">
                <div class="video-aspect">
                  <video :src="item.mp4" :poster="item.thumbnail" playsinline muted preload="metadata"></video>
                  <div class="video-overlay">
                    <span class="play">▶</span>
                    <span class="dur">{{ item.duration ? item.duration + 's' : '' }}</span>
                  </div>
                </div>
                <div class="meta">
                  <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <a :href="item.url || '#'" target="_blank" rel="noreferrer" style="color:#fff; text-decoration:none;">{{ item.author || 'Pexels Video' }}</a>
                  </div>
                  <div class="actions">
                    <button class="btn icon" type="button" @click.stop="onDownloadVideo(item)" title="下载" aria-label="下载">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div style="text-align:center; padding: 10px 0; color: var(--muted);">
        <span v-if="isLoading">加载中…</span>
        <button v-else class="chip" @click="loadMore">加载更多</button>
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="container">
      © {{ new Date().getFullYear() }} 极速图界 / TurboPic · 数据源 Pexels · 免费壁纸与短视频
    </div>
  </footer>

  <teleport to="body">
    <div v-if="detailOpen" class="modal" @click.self="closeDetail()">
      <div class="modal-body">
        <button class="modal-close" @click="closeDetail()" aria-label="关闭">✕</button>
        <div class="modal-content">
          <div class="modal-left">
            <div class="modal-media">
              <img v-if="detailItem?.type==='photo'" :src="detailItem.full" :alt="detailItem.alt || 'photo'" />
              <video v-else :src="detailItem.mp4" :poster="detailItem.thumbnail" controls autoplay playsinline></video>
            </div>
          </div>
          <aside class="modal-right">
            <div class="author">
              <div class="avatar" aria-hidden="true">{{ getInitials(detailItem?.type==='photo' ? detailItem.photographer : detailItem.author) }}</div>
              <div class="who">
                <div class="name">{{ detailItem?.type==='photo' ? (detailItem.photographer || '摄影作品') : (detailItem.author || '视频') }}</div>
                <div class="meta-line">尺寸 {{ detailItem.width }} × {{ detailItem.height }}</div>
              </div>
            </div>
            <div class="actions-row">
              <button class="btn primary" @click="detailItem.type==='photo' ? onDownloadPhoto(detailItem) : onDownloadVideo(detailItem)">
                下载
              </button>
              <button class="btn ghost" @click="copyLink(detailItem.url)">复制链接</button>
            </div>
            <div class="meta-more">
              <div class="pill">免费使用</div>
              <div class="pill">非商业/示例</div>
            </div>
            <div class="nav-row">
              <button class="btn ghost" @click="onPrev()">上一项</button>
              <button class="btn ghost" @click="onNext()">下一项</button>
            </div>
          </aside>
        </div>
      </div>
  </div>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </teleport>
</template>

<style scoped>
</style>
