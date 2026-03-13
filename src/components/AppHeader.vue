<script setup>
    defineProps({
        discordEnabled: { type: Boolean, required: true },
        isExpanded: { type: Boolean, required: true },
    })

    defineEmits(['toggle-discord', 'toggle-expanded'])
</script>

<template>
    <header class="app-header drag-bar">
        <div class="app-logo-cluster">
            <div class="leaf-icon">🌿</div>
        </div>
        <div class="app-icon-row">
            <button class="icon-button icon-toggle" :class="{ 'is-on': discordEnabled }" type="button" @click="$emit('toggle-discord')">
                <span class="icon-dot" />
            </button>
            <button class="icon-button icon-expand" :class="{ 'is-on': isExpanded }" type="button" @click="$emit('toggle-expanded')">
                <span class="icon-bars" />
            </button>
        </div>
    </header>
</template>
