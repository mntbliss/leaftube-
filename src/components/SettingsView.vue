<script setup>
    import { computed, onMounted, ref } from 'vue'
    import * as LoggerService from '../services/LoggerService.js'

    const settings = ref(null)
    const originalSettings = ref(null)
    const appVersion = ref('')
    const isSaving = ref(false)
    const errorText = ref('')

    async function loadSettings() {
        try {
            const loaded = await window.desktopBridge.config.get()
            const safeSettings = loaded?.settings ? JSON.parse(JSON.stringify(loaded.settings)) : {}
            settings.value = safeSettings
            originalSettings.value = JSON.parse(JSON.stringify(safeSettings))
            appVersion.value = loaded?.version ?? ''
        } catch (loadError) {
            LoggerService.errorDump('Failed to load settings', loadError)
            setErrorFrom(loadError, 'failed to load settings')
        }
    }

    function closeWindow() {
        window.close()
    }

    function setErrorFrom(error, fallbackMessage) {
        errorText.value = error?.message ? error.message : fallbackMessage
    }

    const hasChanges = computed(() => {
        if (!settings.value || !originalSettings.value) return false
        try {
            return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
        } catch {
            return false
        }
    })

    async function saveSettings() {
        if (!settings.value) return
        isSaving.value = true
        try {
            // pure object copy to avoid reference issues
            const plainSettings = JSON.parse(JSON.stringify(settings.value))
            await window.desktopBridge.config.set(plainSettings)
            if (window.desktopBridge?.ui?.restartApp) {
                await window.desktopBridge.ui.restartApp()
            } else {
                closeWindow()
            }
        } catch (saveError) {
            LoggerService.errorDump('Failed to save settings', saveError)
            setErrorFrom(saveError, 'failed to save settings')
        } finally {
            isSaving.value = false
        }
    }

    async function resetToDefaults() {
        isSaving.value = true
        errorText.value = ''
        try {
            if (window.desktopBridge?.config?.reset) {
                await window.desktopBridge.config.reset()
            }

            if (window.desktopBridge?.ui?.restartApp) {
                await window.desktopBridge.ui.restartApp()
            } else {
                await loadSettings()
            }
        } catch (resetError) {
            LoggerService.errorDump('Failed to reset settings', resetError)
            setErrorFrom(resetError, 'failed to reset settings')
        } finally {
            isSaving.value = false
        }
    }

    const logSaveMessage = ref('')
    const logCopyMessage = ref('')
    async function saveLogs() {
        logSaveMessage.value = ''
        logCopyMessage.value = ''
        errorText.value = ''
        try {
            const result = await window.desktopBridge?.logs?.save?.()
            if (result?.ok && result?.path) {
                logSaveMessage.value = `Saved to ${result.path}`
            } else if (result?.ok === false && result?.error) {
                setErrorFrom(new Error(result.error), 'Failed to save logs')
            }
        } catch (saveLogsError) {
            LoggerService.errorDump('Save logs failed', saveLogsError)
            setErrorFrom(saveLogsError, 'Failed to save logs')
        }
    }

    async function forceQuit() {
        try {
            await window.desktopBridge?.ui?.forceQuit?.()
        } catch (_) {}
    }

    async function copyLogs() {
        logCopyMessage.value = ''
        logSaveMessage.value = ''
        errorText.value = ''
        try {
            const result = await window.desktopBridge?.logs?.copy?.()
            if (result?.ok) {
                logCopyMessage.value = 'Copied to clipboard'
            } else if (result?.ok === false && result?.error) {
                setErrorFrom(new Error(result.error), 'Failed to copy logs')
            }
        } catch (copyLogsError) {
            LoggerService.errorDump('Copy logs failed', copyLogsError)
            setErrorFrom(copyLogsError, 'Failed to copy logs')
        }
    }

    onMounted(loadSettings)
</script>

<template>
    <div class="settings-root">
        <div class="settings-card">
            <header class="settings-header">
                <h2>
                    settings <span v-if="appVersion" class="settings-version">v{{ appVersion }}</span>
                </h2>
                <button type="button" class="settings-close" @click="closeWindow">×</button>
            </header>

            <main class="settings-main">
                <section v-if="settings" class="settings-section">
                    <h3>₊˚✧ ◡◠ 🌺 Developer</h3>
                    <label class="settings-row">
                        <span>Enable developer console</span>
                        <input v-model="settings.developer.isDeveloperConsoleEnabled" type="checkbox" />
                    </label>
                    <label class="settings-row">
                        <span>Enable YouTube devtools</span>
                        <input v-model="settings.developer.isYoutubeDeveloperConsoleEnabled" type="checkbox" />
                    </label>
                    <label class="settings-row">
                        <span>Enable settings devtools</span>
                        <input v-model="settings.developer.isSettingsDeveloperConsoleEnabled" type="checkbox" />
                    </label>
                    <div class="settings-row">
                        <button class="settings-button" type="button" @click="forceQuit">force quit 🍂</button>
                    </div>
                </section>

                <section v-if="settings" class="settings-section">
                    <h3>₊˚✧ ◡◠ 🌺 Window</h3>
                    <label class="settings-row">
                        <span>Width</span>
                        <input v-model.number="settings.window.width" type="number" />
                    </label>
                    <label class="settings-row">
                        <span>Height</span>
                        <input v-model.number="settings.window.height" type="number" />
                    </label>
                    <label class="settings-row">
                        <span>Acrylic background</span>
                        <input v-model="settings.window.isAcrylic" type="checkbox" />
                    </label>
                    <label class="settings-row">
                        <span>Pin mini-player on top</span>
                        <input v-model="settings.window.isPinned" type="checkbox" />
                    </label>
                </section>

                <section v-if="settings" class="settings-section">
                    <h3>₊˚✧ ◡◠ 🌺 Discord</h3>
                    <label class="settings-row">
                        <span>Enabled by default</span>
                        <input v-model="settings.discordRichPresence.isEnabledByDefault" type="checkbox" />
                    </label>
                    <label class="settings-row">
                        <span>Application ID</span>
                        <input v-model="settings.discordRichPresence.applicationId" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>Watch button text</span>
                        <input v-model="settings.discordRichPresence.watchButtonText" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>Listen button text</span>
                        <input v-model="settings.discordRichPresence.listenButtonText" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>Custom button text</span>
                        <input v-model="settings.discordRichPresence.customButtonText" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>Custom button URL</span>
                        <input v-model="settings.discordRichPresence.customButtonUrl" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>Custom idle text</span>
                        <input v-model="settings.discordRichPresence.idleStateText" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>Custom idle large image text</span>
                        <input v-model="settings.discordRichPresence.idleLargeImageText" type="text" />
                    </label>
                </section>

                <section v-if="settings" class="settings-section">
                    <h3>₊˚✧ ◡◠ 🌺 YouTube</h3>
                    <label class="settings-row">
                        <span>URL</span>
                        <input v-model="settings.youtubeMusic.url" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>YT update interval (ms)</span>
                        <input v-model.number="settings.youtubeMusic.pollIntervalMs" type="number" />
                    </label>
                    <label class="settings-row">
                        <span>Max song title length</span>
                        <input v-model.number="settings.youtubeMusic.maxSongTitleLength" type="number" min="8" max="128" />
                    </label>
                </section>

                <p v-if="errorText" class="settings-error">{{ errorText }}</p>
                <p v-if="logSaveMessage" class="settings-log-saved">{{ logSaveMessage }}</p>
                <p v-if="logCopyMessage" class="settings-log-saved">{{ logCopyMessage }}</p>
            </main>

            <footer class="settings-footer">
                <div class="settings-footer-left">
                    <button class="settings-button" type="button" :disabled="isSaving" @click="resetToDefaults">reset 🔄️</button>
                    <button class="settings-button" type="button" :disabled="isSaving" @click="copyLogs">logs copy 📋</button>
                    <button class="settings-button" type="button" :disabled="isSaving" @click="saveLogs">logs save 📃</button>
                </div>
                <button
                    class="settings-button save-button"
                    :class="{ 'is-non-interactable': isSaving || !hasChanges }"
                    type="button"
                    :disabled="isSaving || !hasChanges"
                    @click="saveSettings">
                    💾
                </button>
            </footer>
        </div>
    </div>
</template>
