<script setup>
import { ref, onMounted } from 'vue'
import { fetchCuratedPhotos, searchPhotos, fetchPopularVideos, searchVideos, mapPhotoItems, mapVideoItems } from './services/pexels'

const query = ref('')
const activeChip = ref('热门')
const activeTab = ref('全部') // 全部 | 图片 | 视频

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
    </div>
  </header>

  <main class="main">
    <div class="container">
      <div v-if="errorMsg" style="margin-top:12px; padding:10px 12px; border-radius:10px; background: #2a1f1f; color:#ffb4b4; border:1px solid rgba(255,0,0,0.25);">
        {{ errorMsg }}
      </div>
      <div class="grid">
        <template v-if="activeTab !== '视频'">
          <div class="masonry">
            <div v-for="p in photos" :key="'p-'+p.id" class="masonry-item card">
              <a :href="p.full" target="_blank" rel="noreferrer">
                <img :src="p.display" :srcset="p.srcset" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" class="media" :alt="p.alt || 'photo'" loading="lazy" />
              </a>
            </div>
          </div>
        </template>
        <template v-if="activeTab !== '图片'">
          <div class="videos-grid">
            <div v-for="v in videos" :key="'v-'+v.id" class="card video-card" @mouseenter="onVideoEnter" @mouseleave="onVideoLeave">
              <div class="video-aspect">
                <video :src="v.mp4" :poster="v.thumbnail" playsinline muted preload="metadata"></video>
                <div class="video-overlay">
                  <span class="play">▶</span>
                  <span class="dur">{{ v.duration ? v.duration + 's' : '' }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
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
