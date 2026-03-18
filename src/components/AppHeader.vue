<script setup>
    defineProps({
        discordEnabled: { type: Boolean, required: true },
        isPinned: { type: Boolean, required: true },
    })

    defineEmits(['toggle-discord', 'toggle-pinned', 'toggle-expanded', 'open-settings', 'close-app'])
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
            <button class="icon-button icon-toggle" :class="{ 'is-on': isPinned }" type="button" @click="$emit('toggle-pinned')">
                <img class="icon-image" src="/icons/lock.png" alt="">
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

<style scoped>
    @keyframes header-item-fade {
        0% {
            opacity: 0;
            transform: translateY(4px);
        }

        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .app-logo-cluster,
    .app-icon-row .icon-button {
        opacity: 0;
    }

    .app-logo-cluster {
        animation: header-item-fade 260ms ease-out forwards;
        animation-delay: 300ms;
    }

    .app-icon-row .icon-button:nth-child(1) {
        animation: header-item-fade 260ms ease-out forwards;
        animation-delay: 450ms;
    }

    .app-icon-row .icon-button:nth-child(2) {
        animation: header-item-fade 260ms ease-out forwards;
        animation-delay: 600ms;
    }

    .app-icon-row .icon-button:nth-child(3) {
        animation: header-item-fade 260ms ease-out forwards;
        animation-delay: 750ms;
    }

    .app-icon-row .icon-button:nth-child(4) {
        animation: header-item-fade 260ms ease-out forwards;
        animation-delay: 900ms;
    }

    .app-icon-row .icon-button:nth-child(5) {
        animation: header-item-fade 260ms ease-out forwards;
        animation-delay: 1050ms;
    }
</style>
