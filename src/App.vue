<script setup>
    import { computed, ref, onMounted } from 'vue'
    import MiniAppHeader from './components/MiniAppHeader.vue'
    import MiniAppPosterHeader from './components/MiniAppPosterHeader.vue'
    import AppPlayer from './components/AppPlayer.vue'
    import SettingsView from './components/SettingsView.vue'
    import * as LoggerService from './services/LoggerService.js'

    const config = ref(null)
    const discordEnabled = ref(false)
    const isPinned = ref(true)
    const nowPlaying = ref(null)
    const miniPopKey = ref(0)
    const isPosterOnlyMode = ref(false)

    const isSettingsView = typeof window !== 'undefined' && window.location.search.includes('view=settings')

    const isAcrylic = computed(() => {
        if (!config.value?.settings?.window) return false
        return Boolean(config.value.settings.window.isAcrylic)
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

    const posterHeaderTitle = computed(() => {
        const titleText = String(nowPlaying.value?.title || '').trim()
        return titleText || 'leaftube'
    })

    const posterHeaderAuthor = computed(() => {
        const authorText = String(nowPlaying.value?.channel || '').trim()
        return authorText || 'author'
    })

    async function loadConfig() {
        try {
            const loaded = await window.desktopBridge.config.get()
            config.value = loaded
            discordEnabled.value = loaded.discordEnabled
            isPinned.value = loaded?.settings?.window?.isPinned !== false
            LoggerService.init(loaded.settings)
        } catch (error) {
            LoggerService.errorDump('Failed to load config', error)
        }
    }

    async function expandYoutube() {
        const result = await window.desktopBridge.ui.setExpanded(true)
        if (result?.isExpanded) window.desktopBridge.ui.resizeYoutubeView()
    }

    async function toggleDiscord() {
        const requestedDiscordEnabled = !discordEnabled.value
        LoggerService.log('[Discord] toggle clicked, requested enabled:', requestedDiscordEnabled)
        try {
            const result = await window.desktopBridge.discord.setEnabled(requestedDiscordEnabled)
            discordEnabled.value = result.discordEnabled
            LoggerService.log('[Discord] result:', result)
        } catch (error) {
            LoggerService.errorDump('Failed to toggle Discord Rich Presence', error)
        }
    }

    async function togglePinned() {
        const requestedPinned = !isPinned.value
        try {
            const result = await window.desktopBridge?.ui?.setPinned?.(requestedPinned)
            if (result && typeof result.isPinned === 'boolean') {
                isPinned.value = result.isPinned
            } else {
                isPinned.value = requestedPinned
            }
        } catch (error) {
            LoggerService.errorDump('Failed to toggle pinned state', error)
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
        if (!window.desktopBridge?.ui?.openSettings) return
        await window.desktopBridge.ui.openSettings()
    }

    async function closeApp() {
        if (!window.desktopBridge?.ui?.closeApp) return
        await window.desktopBridge.ui.closeApp()
    }

    async function togglePosterOnlyMode() {
        const nextPosterOnlyMode = !isPosterOnlyMode.value
        isPosterOnlyMode.value = nextPosterOnlyMode
        try {
            if (window.desktopBridge?.ui?.setPosterOnlyMode) {
                await window.desktopBridge.ui.setPosterOnlyMode(nextPosterOnlyMode)
            }
        } catch (error) {
            LoggerService.errorDump('Failed to sync poster-only window bounds', error)
        }
    }
</script>

<template>
    <div v-if="isSettingsView" class="app-root">
        <div class="app-card" :style="{ margin: appPadding }" :class="{ 'is-acrylic': isAcrylic }">
            <SettingsView />
        </div>
    </div>

    <div v-else class="app-root">
        <div
            :key="'card-main-' + miniPopKey"
            class="app-card"
            :style="{ margin: appPadding }"
            :class="{ 'is-acrylic': isAcrylic, 'is-poster-only-mode': isPosterOnlyMode }">
            <MiniAppPosterHeader
                v-if="isPosterOnlyMode"
                :poster-title-text="posterHeaderTitle"
                :poster-author-text="posterHeaderAuthor"
                @toggle-poster-mode="togglePosterOnlyMode" />
            <MiniAppHeader
                v-else
                :discord-enabled="discordEnabled"
                :is-pinned="isPinned"
                @toggle-discord="toggleDiscord"
                @toggle-pinned="togglePinned"
                @toggle-expanded="expandYoutube"
                @open-settings="openSettings"
                @close-app="closeApp"
                @toggle-poster-mode="togglePosterOnlyMode" />
            <main class="app-main">
                <AppPlayer :now-playing="nowPlaying" :max-song-title-length="maxSongTitleLength" :is-poster-only-mode="isPosterOnlyMode" />
            </main>
        </div>
    </div>
</template>
