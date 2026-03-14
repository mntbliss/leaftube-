/**
 * fraction 0..1 from a click on a horizontal track (e.g. progress/volume and ol that).
 * reusable for any track element + mouse event
 */
export function getFractionFromTrackClick(trackElement, event, fallbackFraction = 0) {
    if (!trackElement) return fallbackFraction
    const rect = trackElement.getBoundingClientRect()
    const pointX = event?.clientX
    if (!rect || typeof pointX !== 'number') return fallbackFraction
    const relative = pointX - rect.left
    if (rect.width <= 0) return fallbackFraction
    const rawFraction = relative / rect.width
    return Math.max(0, Math.min(1, rawFraction))
}
