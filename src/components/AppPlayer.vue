<script setup>
    import { computed, onBeforeUnmount, ref } from 'vue'
    import { playPause, next, previous, seekToFraction } from '../services/YoutubeService.js'

    const props = defineProps({
        nowPlaying: {
            type: Object,
            default: null,
        },
    })

    const coverStyle = computed(() => {
        if (!props.nowPlaying) return {}
        if (!props.nowPlaying.thumbnailUrl) return {}
        if (typeof props.nowPlaying.durationSeconds === 'number' && props.nowPlaying.durationSeconds <= 0) return {}

        return {
            backgroundImage: `url(${props.nowPlaying.thumbnailUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }
    })

    const progressWidth = computed(() => {
        if (!props.nowPlaying || typeof props.nowPlaying.progressPercent !== 'number') return '0%'
        const clamped = Math.max(0, Math.min(100, props.nowPlaying.progressPercent))
        return `${clamped}%`
    })

    const titleText = computed(() => {
        return props.nowPlaying?.title || ''
    })

    const channelText = computed(() => {
        return props.nowPlaying?.channel || ''
    })

    const isPlaying = computed(() => {
        if (!props.nowPlaying) return false
        if (typeof props.nowPlaying.durationSeconds === 'number' && props.nowPlaying.durationSeconds === 0) return false
        if (typeof props.nowPlaying.isPaused === 'boolean') return props.nowPlaying.isPaused === false
        return props.nowPlaying.progressPercent > 0
    })

    const progressTrackRef = ref(null)
    let isSeeking = false

    async function handlePrevious() {
        await previous()
    }

    async function handlePlayPause() {
        await playPause()
    }

    async function handleNext() {
        await next()
    }

    function getSeekFractionFromEvent(event) {
        const trackElement = progressTrackRef.value
        if (!trackElement) return 0

        const rect = trackElement.getBoundingClientRect()
        const pointX = event.clientX
        if (!rect || typeof pointX !== 'number') return 0

        const relative = pointX - rect.left
        if (rect.width <= 0) return 0

        const rawFraction = relative / rect.width
        return Math.max(0, Math.min(1, rawFraction))
    }

    async function updateSeekFromEvent(event) {
        if (!props.nowPlaying || typeof props.nowPlaying.durationSeconds !== 'number' || props.nowPlaying.durationSeconds <= 0) return
        const fraction = getSeekFractionFromEvent(event)
        await seekToFraction(fraction)
    }

    async function handleProgressClick(event) {
        await updateSeekFromEvent(event)
    }

    function handleWindowMove(event) {
        if (!isSeeking) return
        updateSeekFromEvent(event)
    }

    function handleWindowUp(event) {
        if (!isSeeking) return
        updateSeekFromEvent(event)
        isSeeking = false
        window.removeEventListener('mousemove', handleWindowMove)
        window.removeEventListener('mouseup', handleWindowUp)
    }

    function handleProgressDown(event) {
        isSeeking = true
        updateSeekFromEvent(event)
        window.addEventListener('mousemove', handleWindowMove)
        window.addEventListener('mouseup', handleWindowUp)
    }

    onBeforeUnmount(() => {
        window.removeEventListener('mousemove', handleWindowMove)
        window.removeEventListener('mouseup', handleWindowUp)
    })
</script>

<template>
    <div class="player-shell">
        <div class="player-main">
            <div class="cover-icon" :style="coverStyle" />
            <div class="player-body">
                <div class="track-meta">
                    <div class="track-title" v-text="titleText || 'leaftube 🍃'" />
                    <div class="track-subtitle">
                        <span class="track-channel" v-text="channelText || '◡◠◡◜🌺◝◡◠◡'" />
                    </div>
                </div>
                <div class="controls-row">
                    <button class="circle-control" type="button" @click="handlePrevious">
                        <span class="icon-prev" />
                    </button>
                    <button class="circle-control is-primary" type="button" @click="handlePlayPause">
                        <span v-if="!isPlaying" class="icon-play" />
                        <span v-else class="icon-pause" />
                    </button>
                    <button class="circle-control" type="button" @click="handleNext">
                        <span class="icon-next" />
                    </button>
                </div>
            </div>
        </div>
        <div class="progress-row">
            <div ref="progressTrackRef" class="progress-track" @click="handleProgressClick" @mousedown="handleProgressDown">
                <div class="progress-filled" :style="{ width: progressWidth }" />
            </div>
        </div>
    </div>
</template>

<style scoped>
    .player-shell {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        animation: player-pop-sequence 900ms cubic-bezier(0.2, 0.85, 0.2, 1) both;
        animation-delay: 80ms;
    }

    .player-main {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-left: 20px;
        padding-right: 20px;
    }

    .cover-icon {
        flex: 0 0 115px;
        height: 115px;
        border-radius: 22px;
        margin-bottom: 5px;
        border-radius: 22px;
        background: linear-gradient(135deg, #73f373e6, rgb(250, 193, 119));
        background-size: cover;
        background-position: center;
        background-image: url('/default_cover.jpg');
    }

    .player-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .track-meta {
        align-self: stretch;
        text-align: center;
        max-width: 100%;
        overflow: hidden;
    }

    .track-title {
        font-size: 13px;
        font-weight: 600;
        color: #fdf7ef;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-subtitle {
        margin-top: 2px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.74);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .controls-row {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    @keyframes player-pop-sequence {
        0% {
            opacity: 0;
            transform: translateY(12px) scale(0.9);
        }
        35% {
            opacity: 1;
            transform: translateY(0) scale(1.03);
        }
        70% {
            transform: translateY(0) scale(0.98);
        }
        100% {
            transform: translateY(0) scale(1);
        }
    }

    .circle-control {
        width: 48px;
        height: 26px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(6, 9, 11, 0.8);
        cursor: pointer;
        outline: none;
        transition: background 140ms ease-out, border-color 140ms ease-out, transform 100ms ease-out;
        -webkit-app-region: no-drag;
    }

    .circle-control:hover {
        background: rgba(10, 15, 18, 0.95);
    }

    .circle-control:active {
        transform: translateY(1px);
    }

    .circle-control.is-primary {
        background: linear-gradient(135deg, #4affc9e6, #ffc04ae6);
        border-color: transparent;
        color: #1b120d;
    }

    .icon-prev,
    .icon-next {
        width: 0;
        height: 0;
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
    }

    .icon-prev {
        border-right: 6px solid rgba(255, 255, 255, 0.85);
    }

    .icon-next {
        border-left: 6px solid rgba(255, 255, 255, 0.85);
    }

    .icon-play {
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 9px solid #1b120d;
    }

    .icon-pause {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 10px;
        height: 10px;
        position: relative;
    }

    .icon-pause::before,
    .icon-pause::after {
        content: '';
        position: absolute;
        width: 3px;
        height: 10px;
        border-radius: 1px;
        background: #1b120d;
    }

    .icon-pause::before {
        left: 0;
    }

    .icon-pause::after {
        right: 0;
    }

    .progress-row {
        display: flex;
        align-items: center;
        justify-self: center;
        align-self: center;
        height: 10px;
        width: 90%;
    }

    .progress-track {
        position: relative;
        flex: 1;
        height: 100%;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
        overflow: hidden;
        cursor: pointer;
        transition: background 140ms ease-out;
    }

    .progress-track:hover {
        background: rgba(255, 255, 255, 0.22);
    }

    .progress-filled {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, #ff9b4ae6, #c4ee77e6, #46ce41e6);
        transition: width 420ms linear;
        height: 100%;
    }
</style>
