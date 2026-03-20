import { onBeforeUnmount } from 'vue'
import { seekToFraction } from '../services/YoutubeService.js'
import { getFractionFromTrackClick } from '../helpers/trackClick.js'

export function useProgressTrack(progressTrackRef, getNowPlaying) {
    let isDragging = false
    let activeTrackElement = null

    async function updatePositionFromEvent(event) {
        const nowPlaying = getNowPlaying?.()
        if (!nowPlaying || typeof nowPlaying.durationSeconds !== 'number' || nowPlaying.durationSeconds <= 0) return
        const currentTrackElement = activeTrackElement || progressTrackRef.value || event?.currentTarget || event?.target || null
        if (!currentTrackElement) return
        const fraction = getFractionFromTrackClick(currentTrackElement, event, 0)
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
        activeTrackElement = null
        window.removeEventListener('mousemove', onWindowMove)
        window.removeEventListener('mouseup', onWindowUp)
    }

    async function handleProgressTrackClick(event) {
        activeTrackElement = event?.currentTarget || event?.target || progressTrackRef.value || null
        await updatePositionFromEvent(event)
    }

    function handleProgressTrackDown(event) {
        isDragging = true
        activeTrackElement = event?.currentTarget || event?.target || progressTrackRef.value || null
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
