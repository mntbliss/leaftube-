<script setup>
    import { computed, ref, onMounted } from 'vue'
    import AppHeader from './components/AppHeader.vue'
    import AppPlayer from './components/AppPlayer.vue'
    import SettingsView from './components/SettingsView.vue'
    import * as LoggerService from './services/LoggerService.js'

    const config = ref(null)
    const discordEnabled = ref(false)
    const isLoadingConfig = ref(true)
    const nowPlaying = ref(null)
    const miniPopKey = ref(0)

    const isSettingsView = typeof window !== 'undefined' && window.location.search.includes('view=settings')

    const useAcrylic = computed(() => {
        if (!config.value?.settings?.window) return false
        return Boolean(config.value.settings.window.useAcrylic)
    })

    const appPadding = computed(() => {
        const raw = config.value?.settings?.window?.electronPaddingForAnimation
        const value = Number(raw)
        return `${value}px`
    })

    const maxSongTitleLength = computed(() => {
        const raw = config.value?.settings?.youtubeMusic?.maxSongTitleLength
        const value = Number(raw)
        return value
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

    async function expandYoutube() {
        const result = await window.desktopBridge.ui.setExpanded(true)
        if (result?.isExpanded) window.desktopBridge.ui.resizeYoutubeView()
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
        loadConfig() // needed for settings view

        if (isSettingsView) return

        const onNowPlaying = window.desktopBridge?.player?.onNowPlaying
        if (onNowPlaying) {
            onNowPlaying(payload => {
                nowPlaying.value = payload
            })
        }

        const onMiniPop = window.desktopBridge?.ui?.onMiniPop
        if (onMiniPop) {
            onMiniPop(() => {
                miniPopKey.value += 1
            })
        }
    })

    async function openSettings() {
        if (window.desktopBridge?.ui?.openSettings) {
            await window.desktopBridge.ui.openSettings()
        }
    }

    async function closeApp() {
        if (window.desktopBridge?.ui?.closeApp) {
            await window.desktopBridge.ui.closeApp()
        }
    }
</script>

<template>
    <div v-if="isSettingsView" class="app-root">
        <div class="app-card" :style="{ margin: appPadding }" :class="{ 'is-acrylic': useAcrylic }">
            <SettingsView />
        </div>
    </div>
    <div v-else class="app-root">
        <div :key="'card-main-' + miniPopKey" class="app-card" :style="{ margin: appPadding }" :class="{ 'is-acrylic': useAcrylic }">
            <AppHeader
                :discord-enabled="discordEnabled"
                @toggle-discord="toggleDiscord"
                @toggle-expanded="expandYoutube"
                @open-settings="openSettings"
                @close-app="closeApp" />
            <main class="app-main">
                <AppPlayer :now-playing="nowPlaying" :max-song-title-length="maxSongTitleLength" />
            </main>
        </div>
    </div>
</template>
