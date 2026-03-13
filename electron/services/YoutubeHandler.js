import { BrowserView } from 'electron'

export async function clickPlayerButton(youtubeView, action) {
    if (!youtubeView || !(youtubeView instanceof BrowserView)) return

    const script = `
    (() => {
      const bar = document.querySelector('ytmusic-player-bar')
      if (!bar) return

      const selectors = {
        playPause: '[title="Pause"], [title="Play"]',
        next: '[title="Next song"], [title="Next"], [aria-label*="Next"]',
        previous: '[title="Previous song"], [title="Previous"], [aria-label*="Previous"]'
      }

      const clickButton = (selector) => {
        const button = bar.querySelector(selector)
        if (button) button.click()
      }

      const action = '${action}'

      if (action === 'playPause') {
        clickButton(selectors.playPause)
      } else if (action === 'next') {
        clickButton(selectors.next)
      } else if (action === 'previous') {
        clickButton(selectors.previous)
      }
    })()
  `

    try {
        await youtubeView.webContents.executeJavaScript(script)
    } catch {}
}

export async function seekPlayerToFraction(youtubeView, fraction) {
    if (!youtubeView || !(youtubeView instanceof BrowserView)) return

    const safeFraction = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0

    const script = `
    (() => {
      const media = document.querySelector('video') || document.querySelector('audio')
      if (!media || typeof media.duration !== 'number' || media.duration <= 0) return

      const fraction = ${safeFraction}
      const nextTime = Math.max(0, Math.min(1, fraction)) * media.duration
      if (Number.isFinite(nextTime)) {
        media.currentTime = nextTime
      }
    })()
  `

    try {
        await youtubeView.webContents.executeJavaScript(script)
    } catch {}
}

export async function readNowPlaying(youtubeView) {
    if (!youtubeView || !(youtubeView instanceof BrowserView)) return null

    const script = `
    (() => {
      const titleElement = document.querySelector('ytmusic-player-bar .title')
      const bylineElement = document.querySelector('ytmusic-player-bar .byline')
      const thumbnailElement = document.querySelector('ytmusic-player-bar img')

      const titleText = titleElement ? titleElement.textContent.trim() : ''
      const bylineText = bylineElement ? bylineElement.textContent.trim() : ''

      let thumbnailUrl = thumbnailElement ? thumbnailElement.src : ''
      if (thumbnailUrl.includes('i.ytimg.com')) {
        thumbnailUrl = thumbnailUrl
          .replace(/=w\d+-h\d+-/, '=w512-h512-')
          .replace(/=w\d+-h\d+/, '=w512-h512')
      }
      const isVideo = document.body.classList.contains('video-mode')

      const media = document.querySelector('video') || document.querySelector('audio')
      let positionSeconds = 0
      let durationSeconds = 0
      let progressPercent = 0
      let isPaused = true

      if (media && typeof media.currentTime === 'number' && typeof media.duration === 'number') {
        positionSeconds = media.currentTime || 0
        durationSeconds = media.duration || 0
        if (durationSeconds > 0) {
          progressPercent = Math.max(0, Math.min(100, (positionSeconds / durationSeconds) * 100))
        }
        isPaused = Boolean(media.paused)
      }

      return {
        title: titleText,
        channel: bylineText,
        thumbnailUrl,
        isVideo,
        positionSeconds,
        durationSeconds,
        progressPercent,
        isPaused
      }
    })()
  `

    try {
        const result = await youtubeView.webContents.executeJavaScript(script)
        return result
    } catch {
        return null
    }
}
