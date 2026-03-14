import { onBeforeUnmount } from 'vue'
import { seekToFraction } from '../services/YoutubeService.js'
import { getFractionFromTrackClick } from '../helpers/trackClick.js'

export function useProgressTrack(progressTrackRef, getNowPlaying) {
    let isDragging = false

    async function updatePositionFromEvent(event) {
        const nowPlaying = getNowPlaying?.()
        if (!nowPlaying || typeof nowPlaying.durationSeconds !== 'number' || nowPlaying.durationSeconds <= 0) return
        const fraction = getFractionFromTrackClick(progressTrackRef.value, event, 0)
        await seekToFraction(fraction)
    }

    function onWindowMove(event) {
        if (!isDragging) return
        updatePositionFromEvent(event)
    }

    function onWindowUp(event) {
        if (!isDragging) return
        updatePositionFromEvent(event)
        isDragging = false
        window.removeEventListener('mousemove', onWindowMove)
        window.removeEventListener('mouseup', onWindowUp)
    }

    async function handleProgressTrackClick(event) {
        await updatePositionFromEvent(event)
    }

    function handleProgressTrackDown(event) {
        isDragging = true
        updatePositionFromEvent(event)
        window.addEventListener('mousemove', onWindowMove)
        window.addEventListener('mouseup', onWindowUp)
    }

    onBeforeUnmount(() => {
        window.removeEventListener('mousemove', onWindowMove)
        window.removeEventListener('mouseup', onWindowUp)
    })

    return {
        handleProgressTrackClick,
        handleProgressTrackDown,
    }
}
