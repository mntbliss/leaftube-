<script setup>
    import { computed, ref, onMounted } from 'vue'
    import AppHeader from './components/AppHeader.vue'
    import AppPlayer from './components/AppPlayer.vue'
    import SettingsView from './components/SettingsView.vue'
    import * as LoggerService from './services/LoggerService.js'

    const config = ref(null)
    const isExpanded = ref(false)
    const discordEnabled = ref(false)
    const isLoadingConfig = ref(true)
    const nowPlaying = ref(null)

    const isSettingsView = typeof window !== 'undefined' && window.location.search.includes('view=settings')

    const useAcrylic = computed(() => {
        if (!config.value?.settings?.window) return false
        return Boolean(config.value.settings.window.useAcrylic)
    })

    const appPadding = computed(() => {
        const raw = config.value?.settings?.window?.electronPaddingForAnimation
        const value = Number(raw)
        if (!Number.isFinite(value) || value < 0) return '10px'
        return `${value}px`
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
        if (isSettingsView) return

        loadConfig()

        const onNowPlaying = window.desktopBridge?.player?.onNowPlaying
        if (onNowPlaying) {
            onNowPlaying(payload => {
                nowPlaying.value = payload
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
        <div class="app-card" :style="{ margin: appPadding }">
            <SettingsView />
        </div>
    </div>
    <div v-else class="app-root">
        <div
            :key="'card-' + (isSettingsView ? 'settings' : isExpanded ? 'expanded' : 'collapsed')"
            class="app-card"
            :style="{ margin: appPadding }"
            :class="{ 'is-expanded': isExpanded, 'is-acrylic': useAcrylic }">
            <AppHeader
                :discord-enabled="discordEnabled"
                :is-expanded="isExpanded"
                @toggle-discord="toggleDiscord"
                @toggle-expanded="toggleExpanded"
                @open-settings="openSettings"
                @close-app="closeApp" />
            <main class="app-main">
                <AppPlayer :now-playing="nowPlaying" />
            </main>
        </div>
    </div>
</template>
