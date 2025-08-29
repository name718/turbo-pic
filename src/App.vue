<script setup>
import { ref, onMounted } from 'vue'
import { fetchCuratedPhotos, searchPhotos, fetchPopularVideos, searchVideos, mapPhotoItems, mapVideoItems } from './services/pexels'

const query = ref('')
const activeChip = ref('热门')

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
      <div class="filters">
        <div class="chip" :class="{ active: activeChip==='热门' }" @click="onChip('热门')">热门</div>
        <div class="chip" :class="{ active: activeChip==='风景' }" @click="onChip('风景')">风景</div>
        <div class="chip" :class="{ active: activeChip==='城市' }" @click="onChip('城市')">城市</div>
        <div class="chip" :class="{ active: activeChip==='极简' }" @click="onChip('极简')">极简</div>
        <div class="chip" :class="{ active: activeChip==='科技' }" @click="onChip('科技')">科技</div>
      </div>
    </div>
  </header>

  <main class="main">
    <div class="container">
      <div v-if="errorMsg" style="margin-top:12px; padding:10px 12px; border-radius:10px; background: #2a1f1f; color:#ffb4b4; border:1px solid rgba(255,0,0,0.25);">
        {{ errorMsg }}
      </div>
      <div class="grid">
        <div v-for="p in photos" :key="'p-'+p.id" class="card photo">
          <a :href="p.full" target="_blank" rel="noreferrer">
            <img :src="p.thumbnail" class="media" :alt="p.alt || 'photo'" loading="lazy" />
          </a>
        </div>
        <div v-for="v in videos" :key="'v-'+v.id" class="card video">
          <div class="media-holder">
            <video :src="v.mp4" playsinline muted controls preload="metadata"></video>
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
