<script setup>
    defineProps({
        discordEnabled: { type: Boolean, required: true },
    })

    defineEmits(['toggle-discord', 'toggle-expanded', 'open-settings', 'close-app'])
</script>

<template>
    <header class="app-header">
        <div class="app-logo-cluster">
            <div class="leaf-icon">🌿</div>
        </div>
        <div class="app-icon-row">
            <button class="icon-button icon-toggle" :class="{ 'is-on': discordEnabled }" type="button" @click="$emit('toggle-discord')">
                <img class="icon-image" src="/icons/discord.png" alt="" />
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
