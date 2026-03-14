<script setup>
    import { computed, ref, watch } from 'vue'
    import { playPause, next, previous } from '../services/YoutubeService.js'
    import { useVolumeControls } from '../composables/useVolumeControls.js'
    import { useProgressTrack } from '../composables/useProgressTrack.js'
    import { trimText } from '../helpers/text-helpers.js'

    const props = defineProps({
        nowPlaying: { type: Object, default: null },
        maxSongTitleLength: { type: Number, default: 36 },
    })

    const progressTrackRef = ref(null)
    const volumeTrackRef = ref(null)

    const { volumePercent, isMuted, setFromPayload, handleMuteClick, handleVolumeClick, handleVolumeDown } = useVolumeControls(volumeTrackRef)

    watch(
        () => [props.nowPlaying?.volumeLevel, props.nowPlaying?.isMuted],
        ([level, muted]) => {
            if (level != null || muted != null) setFromPayload(level, muted)
        }
    )
    const { handleProgressTrackClick, handleProgressTrackDown } = useProgressTrack(progressTrackRef, () => props.nowPlaying)

    const coverStyle = computed(() => {
        if (!props.nowPlaying?.thumbnailUrl) return {}
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

    const titleText = computed(() => trimText(props.nowPlaying?.title, props.maxSongTitleLength))

    const channelText = computed(() => props.nowPlaying?.channel || '')

    const isPlaying = computed(() => {
        if (!props.nowPlaying) return false
        if (typeof props.nowPlaying.durationSeconds === 'number' && props.nowPlaying.durationSeconds === 0) return false
        if (typeof props.nowPlaying.isPaused === 'boolean') return props.nowPlaying.isPaused === false
        return props.nowPlaying.progressPercent > 0
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
                    <button class="circle-control" type="button" @click="previous">
                        <span class="icon-prev" />
                    </button>
                    <button class="circle-control is-primary" type="button" @click="playPause">
                        <span v-if="!isPlaying" class="icon-play" />
                        <span v-else class="icon-pause" />
                    </button>
                    <button class="circle-control" type="button" @click="next">
                        <span class="icon-next" />
                    </button>
                </div>
                <div class="volume-row">
                    <button
                        class="volume-mute"
                        type="button"
                        :class="{ 'is-muted': isMuted }"
                        :aria-label="isMuted ? 'Unmute' : 'Mute'"
                        @click="handleMuteClick"></button>
                    <div
                        ref="volumeTrackRef"
                        class="volume-track"
                        role="slider"
                        :aria-valuenow="volumePercent"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        tabindex="0"
                        @click="handleVolumeClick"
                        @mousedown="handleVolumeDown">
                        <div class="volume-filled" :style="{ width: (isMuted ? 0 : volumePercent) + '%' }" />
                    </div>
                </div>
            </div>
        </div>
        <div class="progress-row">
            <div ref="progressTrackRef" class="progress-track" @click="handleProgressTrackClick" @mousedown="handleProgressTrackDown">
                <div class="progress-filled" :style="{ width: progressWidth }" />
            </div>
        </div>
    </div>
</template>
