import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getVolume, setVolume, setMuted } from '../services/YoutubeService.js'
import { getFractionFromTrackClick } from '../helpers/trackClick.js'

export function useVolumeControls(volumeTrackRef) {
    const volumePercent = ref(100)
    const isMuted = ref(false)
    let isDragging = false

    function setFromPayload(volumeLevel, muted) {
        if (typeof volumeLevel === 'number') {
            volumePercent.value = Math.round(Math.max(0, Math.min(100, volumeLevel * 100)))
        }
        if (typeof muted === 'boolean') {
            isMuted.value = muted
        }
    }

    onMounted(async () => {
        try {
            const state = await getVolume()
            if (state && typeof state.volumeLevel === 'number') {
                volumePercent.value = Math.round(Math.max(0, Math.min(100, state.volumeLevel * 100)))
            }
            if (state && typeof state.isMuted === 'boolean') {
                isMuted.value = state.isMuted
            }
        } catch {}
    })

    async function handleMuteClick() {
        isMuted.value = !isMuted.value
        await setMuted(isMuted.value)
    }

    function updateVolumeFromEvent(event) {
        const fraction = getFractionFromTrackClick(volumeTrackRef.value, event, volumePercent.value / 100)
        volumePercent.value = Math.round(fraction * 100)
        if (isMuted.value && fraction > 0) {
            isMuted.value = false
            setMuted(false)
        }
        setVolume(fraction)
    }

    async function handleVolumeClick(event) {
        updateVolumeFromEvent(event)
    }

    function onWindowMove(event) {
        if (!isDragging) return
        updateVolumeFromEvent(event)
    }

    function onWindowUp(event) {
        if (!isDragging) return
        updateVolumeFromEvent(event)
        isDragging = false
        window.removeEventListener('mousemove', onWindowMove)
        window.removeEventListener('mouseup', onWindowUp)
    }

    function handleVolumeDown(event) {
        isDragging = true
        updateVolumeFromEvent(event)
        window.addEventListener('mousemove', onWindowMove)
        window.addEventListener('mouseup', onWindowUp)
    }

    onBeforeUnmount(() => {
        window.removeEventListener('mousemove', onWindowMove)
        window.removeEventListener('mouseup', onWindowUp)
    })

    return {
        volumePercent,
        isMuted,
        setFromPayload,
        handleMuteClick,
        handleVolumeClick,
        handleVolumeDown,
    }
}
