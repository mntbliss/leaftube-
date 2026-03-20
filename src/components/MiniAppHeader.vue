<script setup>
    defineProps({
        discordEnabled: { type: Boolean, required: true },
        isPinned: { type: Boolean, required: true },
    })

    defineEmits(['toggle-discord', 'toggle-pinned', 'toggle-expanded', 'open-settings', 'close-app', 'toggle-poster-mode'])
</script>

<template>
    <header class="mini-app-header">
        <button class="app-logo-toggle-button" type="button" @click="$emit('toggle-poster-mode')">
            <img class="leaf-logo-image" src="/icons/icon.png" alt="" />
        </button>
        <div class="app-icon-row">
            <button class="icon-button icon-toggle" :class="{ 'is-on': discordEnabled }" type="button" @click="$emit('toggle-discord')">
                <img class="icon-image" src="/icons/discord.png" alt="" />
            </button>
            <button class="icon-button icon-toggle" :class="{ 'is-on': isPinned }" type="button" @click="$emit('toggle-pinned')">
                <img class="icon-image" src="/icons/lock.png" alt="" />
            </button>
            <button class="icon-button icon-gear" type="button" @click="$emit('open-settings')">
                <img class="icon-image" src="/icons/settings.png" alt="" />
            </button>
            <button class="icon-button icon-expand" type="button" @click="$emit('toggle-expanded')">
                <img class="icon-image" src="/icons/minimize.png" alt="" />
            </button>
            <button class="icon-button icon-close" type="button" @click="$emit('close-app')">
                <img class="icon-image" src="/icons/close.png" alt="" />
            </button>
        </div>
    </header>
</template>
