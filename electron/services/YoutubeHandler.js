import { isValidView, runScriptInView, runScriptInViewReturn } from '../helpers/view-helpers.js'

export async function clickPlayerButton(youtubeView, action) {
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
    await runScriptInView(youtubeView, script)
}

export async function seekPlayerToFraction(youtubeView, fraction) {
    if (!isValidView(youtubeView)) return
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
    await runScriptInView(youtubeView, script)
}

export async function clickPreviousSmart(youtubeView) {
    const script = `
    (() => {
      const bar = document.querySelector('ytmusic-player-bar')
      const media = document.querySelector('video') || document.querySelector('audio')
      if (!bar || !media) return

      const current = typeof media.currentTime === 'number' ? media.currentTime : 0
      if (current > 3) {
        media.currentTime = 0
        return
      }

      const selectors = [
        '[title="Previous song"]',
        '[title="Previous"]',
        '[aria-label*="Previous"]'
      ]

      for (const selector of selectors) {
        const button = bar.querySelector(selector)
        if (button) {
          button.click()
          break
        }
      }
    })()
  `
    await runScriptInView(youtubeView, script)
}

export async function readNowPlaying(youtubeView) {
    if (!isValidView(youtubeView)) return null
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

    return runScriptInViewReturn(youtubeView, script, null)
}

export async function setMediaVolume(youtubeView, fraction) {
    if (!isValidView(youtubeView)) return
    const safeFraction = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 1
    const script = `
    (() => {
      const media = document.querySelector('video') || document.querySelector('audio')
      if (media && typeof media.volume !== 'undefined') {
        media.volume = ${safeFraction}
      }
      const bar = document.querySelector('ytmusic-player-bar')
      if (bar && bar.playerApi_ && typeof bar.playerApi_.setVolume === 'function') {
        bar.playerApi_.setVolume(Math.round(${safeFraction} * 100))
      }
    })()
  `
    await runScriptInView(youtubeView, script)
}

export async function setMediaMuted(youtubeView, isMuted) {
    if (!isValidView(youtubeView)) return
    const muted = Boolean(isMuted)
    const script = `
    (() => {
      const media = document.querySelector('video') || document.querySelector('audio')
      if (media && typeof media.muted !== 'undefined') {
        media.muted = ${muted}
      }
      const bar = document.querySelector('ytmusic-player-bar')
      if (bar && bar.playerApi_ && typeof bar.playerApi_.setMuted === 'function') {
        bar.playerApi_.setMuted(${muted})
      }
    })()
  `
    await runScriptInView(youtubeView, script)
}

export async function getMediaVolume(youtubeView) {
    if (!isValidView(youtubeView)) return { volumeLevel: 1, isMuted: false }
    const script = `
    (() => {
      const media = document.querySelector('video') || document.querySelector('audio')
      if (!media) return { volumeLevel: 1, isMuted: false }
      return {
        volumeLevel: typeof media.volume === 'number' ? Math.max(0, Math.min(1, media.volume)) : 1,
        isMuted: Boolean(media.muted)
      }
    })()
  `

    return runScriptInViewReturn(youtubeView, script, { volumeLevel: 1, isMuted: false })
}
