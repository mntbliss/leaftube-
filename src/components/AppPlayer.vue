<script setup>
    import { computed, ref, watch } from 'vue'
    import { playPause, next, previous, likeCurrentTrack, addCurrentTrackToPlaylist, toggleLoop } from '../services/YoutubeService.js'
    import { useVolumeControls } from '../composables/useVolumeControls.js'
    import { LikeFeedbackAction } from '../constants/like-feedback.js'
    import { loopFeedbackIconBasename } from '../constants/loop-feedback.js'
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

    function formatTime(seconds) {
        const totalSeconds = typeof seconds === 'number' && seconds > 0 ? Math.floor(seconds) : 0
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        const paddedSecs = secs < 10 ? `0${secs}` : String(secs)
        return `${mins}:${paddedSecs}`
    }

    const positionText = computed(() => formatTime(props.nowPlaying?.positionSeconds))
    const durationText = computed(() => formatTime(props.nowPlaying?.durationSeconds))

    let pendingLikeTimeoutId = null
    const posterPopIcon = ref(null)
    const posterPopLoopBasename = ref(null)
    const POSTER_POP_DURATION_MS = 700

    function showPosterPop(action) {
        if (action !== LikeFeedbackAction.LIKE && action !== LikeFeedbackAction.DISLIKE) return
        posterPopIcon.value = action
        posterPopLoopBasename.value = null
        setTimeout(() => {
            posterPopIcon.value = null
        }, POSTER_POP_DURATION_MS + 50)
    }

    function showPosterPopLoop(loopState) {
        const basename = loopFeedbackIconBasename(loopState)
        if (!basename) return
        posterPopLoopBasename.value = basename
        posterPopIcon.value = null
        setTimeout(() => {
            posterPopLoopBasename.value = null
        }, POSTER_POP_DURATION_MS + 50)
    }

    function handleCoverClick(clickEvent) {
        if (clickEvent) {
            clickEvent.preventDefault()
            clickEvent.stopPropagation()
        }
        if (!props.nowPlaying || !props.nowPlaying.title) return
        if (pendingLikeTimeoutId != null) {
            window.clearTimeout(pendingLikeTimeoutId)
            pendingLikeTimeoutId = null
            const promise = toggleLoop()
            if (promise && typeof promise.then === 'function') {
                promise.then(showPosterPopLoop)
            }
            return
        }
        pendingLikeTimeoutId = window.setTimeout(() => {
            pendingLikeTimeoutId = null
            const promise = likeCurrentTrack()
            if (promise && typeof promise.then === 'function') {
                promise.then(showPosterPop)
            }
        }, 280)
    }
</script>

<template>
    <div class="player-shell">
        <div class="player-main">
            <div class="cover-wrap">
                <button class="cover-icon" type="button" :style="coverStyle" @click="handleCoverClick" aria-label="Like or add to playlist" />
                <div v-if="posterPopIcon || posterPopLoopBasename" class="cover-pop" aria-hidden="true">
                    <img v-if="posterPopIcon" class="cover-pop-icon" :src="`./icons/${posterPopIcon}.png`" :alt="posterPopIcon" />
                    <img
                        v-else-if="posterPopLoopBasename"
                        class="cover-pop-icon cover-pop-loop"
                        :src="`./icons/${posterPopLoopBasename}.png`"
                        :alt="posterPopLoopBasename" />
                </div>
            </div>
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
            <div class="progress-time-row" v-if="nowPlaying">
                <span class="progress-time progress-time--current">{{ positionText }}</span>
                <span class="progress-time progress-time--duration">{{ durationText }}</span>
            </div>
        </div>
    </div>
</template>
