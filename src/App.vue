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

    async function loadConfig() {
        try {
            const loaded = await window.desktopBridge.config.get()
            config.value = loaded
            discordEnabled.value = loaded.discordEnabled
            LoggerService.init(loaded.settings)
            isLoadingConfig.value = false
        } catch (error) {
            LoggerService.errorDump('Failed to load config', error)
            isLoadingConfig.value = false
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
</script>

<template>
    <div v-if="isSettingsView" class="app-root">
        <div class="app-card" :style="{ margin: appPadding }" :class="{ 'is-acrylic': isAcrylic }">
            <SettingsView />
        </div>
    </div>
    <div v-else class="app-root">
        <div :key="'card-main-' + miniPopKey" class="app-card" :style="{ margin: appPadding }" :class="{ 'is-acrylic': isAcrylic }">
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
