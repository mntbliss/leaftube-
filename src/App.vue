<script setup>
import { computed, ref, onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AppPlayer from './components/AppPlayer.vue'
import * as LoggerService from './services/LoggerService.js'

const config = ref(null)
const isExpanded = ref(false)
const discordEnabled = ref(false)
const isLoadingConfig = ref(true)
const nowPlaying = ref(null)

const useAcrylic = computed(() => {
  if (!config.value?.settings?.window) return false
  return Boolean(config.value.settings.window.useAcrylic)
})

async function loadConfig() {
  try {
    const loaded = await window.desktopBridge.config.get()
    config.value = loaded
    discordEnabled.value = loaded.discordEnabled
    LoggerService.init(loaded.settings)
    isLoadingConfig.value = false
  } catch (err) {
    LoggerService.errorDump('Failed to load config', err)
    isLoadingConfig.value = false
  }
}

async function toggleExpanded() {
  const next = !isExpanded.value
  const result = await window.desktopBridge.ui.setExpanded(next)
  isExpanded.value = result.isExpanded
  if (result.isExpanded) window.desktopBridge.ui.resizeYoutubeView()
}

async function toggleDiscord() {
  const next = !discordEnabled.value
  LoggerService.log('[Discord] toggle clicked, requested enabled:', next)
  try {
    const result = await window.desktopBridge.discord.setEnabled(next)
    discordEnabled.value = result.discordEnabled
    LoggerService.log('[Discord] result:', result)
  } catch (err) {
    LoggerService.errorDump('Failed to toggle Discord Rich Presence', err)
  }
}

onMounted(() => {
  loadConfig()
  if (window.desktopBridge?.player?.onNowPlaying) window.desktopBridge.player.onNowPlaying((payload) => { nowPlaying.value = payload })
})
</script>

<template>
  <div class="app-root">
    <div
      class="app-card"
      :class="{ 'is-expanded': isExpanded, 'is-acrylic': useAcrylic }"
    >
      <AppHeader
        :discord-enabled="discordEnabled"
        :is-expanded="isExpanded"
        @toggle-discord="toggleDiscord"
        @toggle-expanded="toggleExpanded"
      />
      <main class="app-main">
        <AppPlayer :now-playing="nowPlaying" />
      </main>
    </div>
  </div>
</template>
