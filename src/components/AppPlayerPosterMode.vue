<script setup>
    defineProps({
        coverStyle: { type: Object, default: () => ({}) },
        isPlaying: { type: Boolean, default: false },
        progressWidth: { type: String, default: '0%' },
    })

    defineEmits(['previous', 'play-pause', 'next', 'progress-click', 'progress-down'])
</script>

<template>
    <div class="poster-mode-shell">
        <div class="poster-mode-poster-wrap">
            <div class="poster-mode-cover" :style="coverStyle"></div>

            <div class="poster-mode-controls-overlay">
                <button class="poster-mode-control" type="button" @click="$emit('previous')">
                    <span class="icon-prev" />
                </button>
                <button class="poster-mode-control poster-mode-control-primary" type="button" @click="$emit('play-pause')">
                    <span v-if="!isPlaying" class="icon-play" />
                    <span v-else class="icon-pause" />
                </button>
                <button class="poster-mode-control" type="button" @click="$emit('next')">
                    <span class="icon-next" />
                </button>
            </div>

            <div class="poster-mode-progress-overlay">
                <div class="poster-mode-progress-track" @click="$emit('progress-click', $event)" @mousedown="$emit('progress-down', $event)">
                    <div class="poster-mode-progress-filled" :style="{ width: progressWidth }" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .poster-mode-shell {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 0;
        padding-top: 0;
    }

    .poster-mode-poster-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 24px;
        overflow: hidden;
    }

    .poster-mode-cover {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
        padding: 0;
        border-radius: inherit;
        background: linear-gradient(135deg, #73f373e6, rgb(250, 193, 119));
        background-size: cover;
        background-position: center;
        background-image: url('/default_cover.jpg');
        cursor: default;
        outline: none;
        box-shadow: none;
    }

    .poster-mode-controls-overlay {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        z-index: 2;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        transition: opacity 160ms ease-out, transform 160ms ease-out;
    }

    .poster-mode-control {
        width: 40px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(6, 9, 11, 0.75);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        outline: none;
        box-shadow: none;
        transition: filter var(--transition-outline-filter) ease, transform 100ms ease-out;
    }

    .poster-mode-control:hover {
        filter: drop-shadow(0 0 var(--outline-shadow-range) var(--leaf-accent));
    }

    .poster-mode-control:active {
        transform: translateY(1px);
    }

    .poster-mode-cover:focus,
    .poster-mode-cover:focus-visible,
    .poster-mode-control:focus,
    .poster-mode-control:focus-visible,
    .poster-mode-progress-track:focus,
    .poster-mode-progress-track:focus-visible {
        outline: none;
        box-shadow: none;
    }

    .poster-mode-control-primary {
        background: linear-gradient(135deg, #4affc9e6, #ffc04ae6);
        border-color: transparent;
        color: #1b120d;
    }

    .poster-mode-progress-overlay {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        z-index: 2;
    }

    .poster-mode-progress-track {
        width: 100%;
        height: 5px;
        border-radius: 0;
        background: rgba(255, 255, 255, 0.25);
        overflow: hidden;
        cursor: pointer;
    }

    .poster-mode-progress-filled {
        height: 100%;
        background: linear-gradient(90deg, #4affe1e6, #77eea5e6, #46ce41e6);
        transition: width 420ms linear;
    }
</style>
