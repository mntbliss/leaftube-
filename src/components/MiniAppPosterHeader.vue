<script setup>
    defineProps({
        posterAuthorText: { type: String, default: '' },
        posterTitleText: { type: String, default: '' },
    })

    defineEmits(['toggle-poster-mode'])
</script>

<template>
    <header class="poster-mode-header">
        <div class="poster-header-drag-layer" aria-hidden="true"></div>
        <button class="app-logo-toggle-button" type="button" @click="$emit('toggle-poster-mode')">
            <img class="leaf-logo-image" src="/icons/icon.png" alt="" />
        </button>
        <div class="poster-header-title" :title="`${posterAuthorText || 'author'}\n${posterTitleText || 'leaftube'}`">
            <div class="poster-header-author">{{ posterAuthorText || 'author' }}</div>
            <div class="poster-header-track">{{ posterTitleText || 'leaftube' }}</div>
        </div>
    </header>
</template>
