<script setup>
import { ref, onMounted, computed } from 'vue'
import { fetchCuratedPhotos, searchPhotos, fetchPopularVideos, searchVideos, mapPhotoItems, mapVideoItems } from './services/pexels'

const query = ref('')
const activeChip = ref('热门')
const activeTab = ref('全部') // 全部 | 图片 | 视频
const mixMode = ref('均衡') // 均衡 | 视频优先 | 图片优先
const videoRatio = ref(0.3) // 目标视频比例（仅在“全部”时生效）

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

onMounted(() => {
  loadInitial()
  window.addEventListener('scroll', onScroll, { passive: true })
})
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
              <a :href="item.full" target="_blank" rel="noreferrer">
                <img :src="item.display" :srcset="item.srcset" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" class="media" :alt="item.alt || 'photo'" loading="lazy" />
              </a>
            </template>
            <template v-else>
              <div class="video-aspect">
                <video :src="item.mp4" :poster="item.thumbnail" playsinline muted preload="metadata"></video>
                <div class="video-overlay">
                  <span class="play">▶</span>
                  <span class="dur">{{ item.duration ? item.duration + 's' : '' }}</span>
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
</template>

<style scoped>
</style>
