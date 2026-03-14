import { ref, onMounted } from 'vue'
import { getVolume, setVolume, setMuted } from '../services/YoutubeService.js'
import { getFractionFromTrackClick } from '../helpers/trackClick.js'

export function useVolumeControls(volumeTrackRef) {
    const volumePercent = ref(100)
    const isMuted = ref(false)

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

    async function handleVolumeClick(event) {
        const fraction = getFractionFromTrackClick(volumeTrackRef.value, event, volumePercent.value / 100)
        volumePercent.value = Math.round(fraction * 100)
        if (isMuted.value && fraction > 0) {
            isMuted.value = false
            await setMuted(false)
        }
        await setVolume(fraction)
    }

    function handleVolumeDown(event) {
        handleVolumeClick(event)
    }

    return {
        volumePercent,
        isMuted,
        setFromPayload,
        handleMuteClick,
        handleVolumeClick,
        handleVolumeDown,
    }
}
