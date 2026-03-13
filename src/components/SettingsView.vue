<script setup>
    import { computed, onMounted, ref } from 'vue'
    import * as LoggerService from '../services/LoggerService.js'

    const settings = ref(null)
    const originalSettings = ref(null)
    const isSaving = ref(false)
    const errorText = ref('')

    async function loadSettings() {
        try {
            const loaded = await window.desktopBridge.config.get()
            const safeSettings = loaded?.settings ? JSON.parse(JSON.stringify(loaded.settings)) : {}
            settings.value = safeSettings
            originalSettings.value = JSON.parse(JSON.stringify(safeSettings))
        } catch (loadError) {
            LoggerService.errorDump('Failed to load settings', loadError)
            errorText.value = 'failed to load settings'
        }
    }

    function closeWindow() {
        window.close()
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
            closeWindow()
        } catch (saveError) {
            LoggerService.errorDump('Failed to save settings', saveError)
            errorText.value = saveError && saveError.message ? saveError.message : 'failed to save settings'
        } finally {
            isSaving.value = false
        }
    }

    onMounted(loadSettings)
</script>

<template>
    <div class="settings-root">
        <div class="settings-card">
            <header class="settings-header">
                <h2>settings</h2>
                <button type="button" class="settings-close" @click="closeWindow">×</button>
            </header>

            <main class="settings-main">
                <section v-if="settings" class="settings-section">
                    <h3>Developer</h3>
                    <label class="settings-row">
                        <span>Enable developer console</span>
                        <input v-model="settings.developer.enableDeveloperConsole" type="checkbox" />
                    </label>
                    <label class="settings-row">
                        <span>Enable YouTube devtools</span>
                        <input v-model="settings.developer.enableYoutubeDeveloperConsole" type="checkbox" />
                    </label>
                    <label class="settings-row">
                        <span>Enable settings devtools</span>
                        <input v-model="settings.developer.enableSettingsDeveloperConsole" type="checkbox" />
                    </label>
                </section>

                <section v-if="settings" class="settings-section">
                    <h3>Window</h3>
                    <label class="settings-row">
                        <span>Width</span>
                        <input v-model.number="settings.window.width" type="number" />
                    </label>
                    <label class="settings-row">
                        <span>Height</span>
                        <input v-model.number="settings.window.height" type="number" />
                    </label>
                    <label class="settings-row">
                        <span>Use acrylic</span>
                        <input v-model="settings.window.useAcrylic" type="checkbox" />
                    </label>
                </section>

                <section v-if="settings" class="settings-section">
                    <h3>Discord presence</h3>
                    <label class="settings-row">
                        <span>Enabled by default</span>
                        <input v-model="settings.discordRichPresence.enabledByDefault" type="checkbox" />
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
                </section>

                <section v-if="settings" class="settings-section">
                    <h3>YouTube Music</h3>
                    <label class="settings-row">
                        <span>URL</span>
                        <input v-model="settings.youtubeMusic.url" type="text" />
                    </label>
                    <label class="settings-row">
                        <span>YT update interval (ms)</span>
                        <input v-model.number="settings.youtubeMusic.pollIntervalMs" type="number" />
                    </label>
                </section>

                <p v-if="errorText" class="settings-error">{{ errorText }}</p>
            </main>

            <footer class="settings-footer">
                <button
                    class="settings-button"
                    :class="{ 'is-non-interactable': isSaving || !hasChanges }"
                    type="button"
                    :disabled="isSaving || !hasChanges"
                    @click="saveSettings">
                    ✏️
                </button>
            </footer>
        </div>
    </div>
</template>
