<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { playPause, next, previous, seekToFraction } from '../services/YoutubeService.js'

const props = defineProps({
  nowPlaying: {
    type: Object,
    default: null
  }
})

const coverStyle = computed(() => {
  if (!props.nowPlaying || !props.nowPlaying.thumbnailUrl) return {}
  return {
    backgroundImage: `url(${props.nowPlaying.thumbnailUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})

const progressWidth = computed(() => {
  if (!props.nowPlaying || typeof props.nowPlaying.progressPercent !== 'number') return '0%'
  const clamped = Math.max(0, Math.min(100, props.nowPlaying.progressPercent))
  return `${clamped}%`
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
      <div
        class="cover-icon"
        :style="coverStyle"
      />
      <div class="player-body">
        <div class="controls-row">
          <button class="circle-control" type="button" @click="handlePrevious">
            <span class="icon-prev" />
          </button>
          <button
            class="circle-control is-primary"
            type="button"
            @click="handlePlayPause"
          >
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
      <div
        ref="progressTrackRef"
        class="progress-track"
        @click="handleProgressClick"
        @mousedown="handleProgressDown"
      >
        <div
          class="progress-filled"
          :style="{ width: progressWidth }"
        />
        <div
          class="progress-leaf"
          :style="{ left: progressWidth }"
        >
          🍃
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-shell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cover-icon {
  flex: 0 0 80px;
  height: 80px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(244, 162, 97, 1), rgba(42, 157, 143, 1));
  background-size: cover;
  background-position: center;
}

.player-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.circle-control {
  width: 26px;
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
  background: linear-gradient(135deg, #f4a261, #e76f51);
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
}

.progress-track {
  position: relative;
  flex: 1;
  height: 6px;
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
  background: linear-gradient(90deg, rgba(244, 162, 97, 0.9), rgba(42, 157, 143, 0.9));
  transition: width 180ms ease-out;
}

.progress-leaf {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  pointer-events: none;
}
</style>
