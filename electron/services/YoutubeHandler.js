import { isValidView, runScriptInView, runScriptInViewReturn } from '../helpers/view-helpers.js'
import { LikeFeedbackAction } from '../../src/constants/like-feedback.js'
import { LoopFeedbackState } from '../../src/constants/loop-feedback.js'

export async function clickPlayerButton(youtubeView, action) {
    const script = `
    (() => {
      const action = '${action}'
      const playerBar = document.querySelector('ytmusic-player-bar')
      if (!playerBar) return
      const selectors = {
        playPause: '#play-pause-button, .play-pause-button',
        next: '.next-button',
        previous: '.previous-button'
      }
      const clickControlButton = (selector) => {
        const buttonElement = playerBar.querySelector(selector)
        if (buttonElement) buttonElement.click()
      }
      if (action === 'playPause') {
        const mediaElement = document.querySelector('video') || document.querySelector('audio')
        const titleElement = playerBar.querySelector('.title')
        const hasTrack = mediaElement && typeof mediaElement.duration === 'number' && mediaElement.duration > 0
        const hasTitle = titleElement && titleElement.textContent && titleElement.textContent.trim().length > 0
        const isNothingLoaded = !hasTrack && !hasTitle
        if (isNothingLoaded) {
          const mainContent = document.querySelector('#content') || document.querySelector('ytmusic-browse-response') || document.body
          if (!mainContent) return
          const firstCarouselShelf = mainContent.querySelector('ytmusic-carousel-shelf-renderer')
          const playAllButton = firstCarouselShelf ? firstCarouselShelf.querySelector('#more-content-button button') : null
          if (playAllButton && !playAllButton.closest('ytmusic-player-bar')) {
            playAllButton.click()
          } else {
            const linkSelectors = [
              // Home-like shelves
              'ytmusic-two-row-item-renderer a.yt-simple-endpoint.image-wrapper[href*="watch?v="]',
              'ytmusic-two-row-item-renderer a.yt-simple-endpoint[href*="watch?v="]',
              // Logged-in library / playlist routes can use different renderers.
              'ytmusic-playlist-shelf-renderer a[href*="watch?v="]',
              'ytmusic-playlist-video-renderer a[href*="watch?v="]',
              'ytmusic-item-section-renderer a[href*="watch?v="]',
              // Last resort: first watch link anywhere in the page content.
              'a[href*="watch?v="]'
            ]

            for (const sel of linkSelectors) {
              const link = mainContent.querySelector(sel)
              if (link && !link.closest('ytmusic-player-bar')) {
                link.click()
                break
              }
            }
          }
        } else {
          clickControlButton(selectors.playPause)
        }
      } else if (action === 'next') {
        clickControlButton(selectors.next)
      } else if (action === 'previous') {
        clickControlButton(selectors.previous)
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
      const mediaElement = document.querySelector('video') || document.querySelector('audio')
      if (!mediaElement || typeof mediaElement.duration !== 'number' || mediaElement.duration <= 0) return

      const fraction = ${safeFraction}
      const nextTime = Math.max(0, Math.min(1, fraction)) * mediaElement.duration
      if (Number.isFinite(nextTime)) {
        mediaElement.currentTime = nextTime
      }
    })()
  `
    await runScriptInView(youtubeView, script)
}

export async function clickPreviousSmart(youtubeView) {
    const script = `
    (() => {
      const playerBar = document.querySelector('ytmusic-player-bar')
      const mediaElement = document.querySelector('video') || document.querySelector('audio')
      if (!playerBar || !mediaElement) return
      const currentTimeSeconds = typeof mediaElement.currentTime === 'number' ? mediaElement.currentTime : 0
      if (currentTimeSeconds > 3) {
        mediaElement.currentTime = 0
        return
      }
      const previousButtonSelectors = ['.previous-button']
      for (const selector of previousButtonSelectors) {
        let previousButtonElement = playerBar.querySelector(selector)
        if (!previousButtonElement && playerBar.shadowRoot) previousButtonElement = playerBar.shadowRoot.querySelector(selector)
        if (previousButtonElement) {
          previousButtonElement.click()
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

      const mediaElement = document.querySelector('video') || document.querySelector('audio')
      let positionSeconds = 0
      let durationSeconds = 0
      let progressPercent = 0
      let isPaused = true

      if (mediaElement && typeof mediaElement.currentTime === 'number' && typeof mediaElement.duration === 'number') {
        positionSeconds = mediaElement.currentTime || 0
        durationSeconds = mediaElement.duration || 0
        if (durationSeconds > 0) {
          progressPercent = Math.max(0, Math.min(100, (positionSeconds / durationSeconds) * 100))
        }
        isPaused = Boolean(mediaElement.paused)
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
    const volumePercent = Math.round(safeFraction * 100)
    const script = `
    (() => {
      const fraction = ${safeFraction}
      const volumePercent = ${volumePercent}
      const mediaElement = document.querySelector('video') || document.querySelector('audio')
      if (mediaElement && typeof mediaElement.volume !== 'undefined') mediaElement.volume = fraction
      const playerBar = document.querySelector('ytmusic-player-bar')
      if (playerBar && playerBar.playerApi_ && typeof playerBar.playerApi_.setVolume === 'function') {
        playerBar.playerApi_.setVolume(volumePercent)
      }
      if (playerBar && playerBar.shadowRoot) {
        function setVolumeSlider(slider) {
          if (!slider) return
          slider.value = volumePercent
          slider.setAttribute('value', volumePercent)
          slider.setAttribute('aria-valuenow', volumePercent)
          slider.dispatchEvent(new Event('input', { bubbles: true }))
          slider.dispatchEvent(new Event('change', { bubbles: true }))
        }
        setVolumeSlider(playerBar.shadowRoot.querySelector('#volume-slider'))
        setVolumeSlider(playerBar.shadowRoot.querySelector('#expand-volume-slider'))
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
      const mediaElement = document.querySelector('video') || document.querySelector('audio')
      if (mediaElement && typeof mediaElement.muted !== 'undefined') {
        mediaElement.muted = ${muted}
      }
      const playerBar = document.querySelector('ytmusic-player-bar')
      if (playerBar && playerBar.playerApi_ && typeof playerBar.playerApi_.setMuted === 'function') {
        playerBar.playerApi_.setMuted(${muted})
      }
    })()
  `
    await runScriptInView(youtubeView, script)
}

export async function getMediaVolume(youtubeView) {
    if (!isValidView(youtubeView)) return { volumeLevel: 0, isMuted: false }
    const script = `
    (() => {
      const mediaElement = document.querySelector('video') || document.querySelector('audio')
      if (mediaElement && typeof mediaElement.volume === 'number') {
        return {
          volumeLevel: Math.max(0, Math.min(1, mediaElement.volume)),
          isMuted: Boolean(mediaElement.muted)
        }
      }
      const playerBar = document.querySelector('ytmusic-player-bar')
      const slider = playerBar && playerBar.shadowRoot ? playerBar.shadowRoot.querySelector('#volume-slider') : null
      const volumePercent = slider && typeof slider.value === 'number' ? slider.value : (slider ? parseInt(slider.getAttribute('value'), 10) : NaN)
      const volumeLevel = Number.isFinite(volumePercent) ? Math.max(0, Math.min(1, volumePercent / 100)) : 0
      return { volumeLevel, isMuted: mediaElement ? Boolean(mediaElement.muted) : false }
    })()
  `
    return runScriptInViewReturn(youtubeView, script, { volumeLevel: 0, isMuted: false })
}

export async function clickLikeButton(youtubeView) {
    if (!isValidView(youtubeView)) return null
    const script = `
    (() => {
      const playerBar = document.querySelector('ytmusic-player-bar')
      if (!playerBar) return null
      const playerBarRoot = playerBar.shadowRoot || playerBar
      const likeShape = playerBarRoot.querySelector('#button-shape-like')
      const dislikeShape = playerBarRoot.querySelector('#button-shape-dislike')
      const targetShape = likeShape || dislikeShape
      if (!targetShape) return null

      // Determine current like state from the like button before clicking
      const likeButtonRoot = likeShape ? (likeShape.shadowRoot || likeShape) : null
      const likeButtonElement = likeButtonRoot
        ? (likeButtonRoot.querySelector('button') || likeShape.querySelector('button'))
        : null
      const isCurrentlyLiked =
        !!(
          likeButtonElement &&
          (likeButtonElement.getAttribute('aria-pressed') === 'true' ||
            likeButtonElement.getAttribute('aria-checked') === 'true')
        )

      const shapeRoot = targetShape.shadowRoot || targetShape
      const likeDislikeButton = shapeRoot.querySelector('button') || targetShape.querySelector('button')
      if (!likeDislikeButton) return null

      likeDislikeButton.click()

      // Report the action that just happened: like -> LIKE, liked -> DISLIKE
      const action = isCurrentlyLiked ? '${LikeFeedbackAction.DISLIKE}' : '${LikeFeedbackAction.LIKE}'
      return action
    })()
  `
    return runScriptInViewReturn(youtubeView, script, null)
}

function repeatModeDetectScriptBody() {
    const noRepeat = LoopFeedbackState.NO_REPEAT
    const repeatAll = LoopFeedbackState.REPEAT_ALL
    const repeatOne = LoopFeedbackState.REPEAT_ONE
    return `
    const NO = '${noRepeat}'
    const ALL = '${repeatAll}'
    const ONE = '${repeatOne}'
    const playerBar = document.querySelector('ytmusic-player-bar')
    if (!playerBar) return null
    const root = playerBar.shadowRoot || playerBar
    const repeatControl =
      root.querySelector('yt-icon-button.repeat') ||
      root.querySelector('yt-icon-button[class*="repeat"]') ||
      root.querySelector('.repeat')
    if (!repeatControl) return null
    const bag = []
    const pushAttrs = (element) => {
      if (!element || !element.attributes) return
      for (let index = 0; index < element.attributes.length; index++) {
        const attribute = element.attributes[index]
        bag.push(attribute.value)
      }
    }
    repeatControl.querySelectorAll('[icon]').forEach((element) => {
      bag.push(element.getAttribute('icon'), element.getAttribute('key'), element.getAttribute('name'))
    })
    const iconHost = repeatControl.querySelector('yt-icon')
    if (iconHost) pushAttrs(iconHost)
    pushAttrs(repeatControl)
    const button = repeatControl.querySelector('button')
    if (button) pushAttrs(button)
    if (typeof repeatControl.value === 'string' && repeatControl.value) bag.push(repeatControl.value)
    if (button && typeof button.value === 'string' && button.value) bag.push(button.value)
    if (repeatControl.hasAttribute('toggled')) bag.push(repeatControl.getAttribute('toggled') || 'toggled')
    const pressed = button && button.getAttribute('aria-pressed')
    if (pressed) bag.push('aria_pressed_' + pressed)
    const joined = bag.filter(Boolean).join(' ').toLowerCase().replace(/-/g, '_')
    const classText = (
      (repeatControl.className || '') +
      ' ' +
      (button && button.className ? button.className : '')
    ).toLowerCase()

    if (
      /repeat_one|repeatone|one_repeat|music_repeat_one|song_repeat|repeat_1/.test(joined) ||
      classText.includes('repeat-one')
    ) {
      return ONE
    }
    if (
      /repeat_off|repeatoff|no_repeat|norepeat|music_repeat_off|repeat_disabled/.test(joined) ||
      classText.includes('repeat-off')
    ) {
      return NO
    }
    if (/repeat_all|repeatall|playlist_repeat|queue_repeat/.test(joined) || classText.includes('repeat-all')) {
      return ALL
    }
    if (joined.includes('repeat') && joined.includes('one')) return ONE
    if (joined.includes('repeat') && (joined.includes('off') || joined.includes('none'))) return NO
    const musicRepeat = /music_repeat(?!_one)(?!_off)\\b/.test(joined) || /^repeat$/i.test(joined.trim())
    if (musicRepeat) return ALL
    return null
  `
}

/** read repeat mode from player bar (no clicks) */
export async function readRepeatModeFromPlayerBar(youtubeView) {
    if (!isValidView(youtubeView)) return null
    const script = `(() => { ${repeatModeDetectScriptBody()} })()`
    return runScriptInViewReturn(youtubeView, script, null)
}

/**
 * yoggle repeat/loop, detects new mode from DOM metadata (not cringe SVG)
 */
export async function clickRepeatButton(youtubeView) {
    if (!isValidView(youtubeView)) return null
    const script = `
    (() => new Promise((resolve) => {
      const detect = () => { ${repeatModeDetectScriptBody()} }
      const playerBar = document.querySelector('ytmusic-player-bar')
      if (!playerBar) {
        resolve(null)
        return
      }
      const root = playerBar.shadowRoot || playerBar
      const repeatControl =
        root.querySelector('yt-icon-button.repeat') ||
        root.querySelector('yt-icon-button[class*="repeat"]') ||
        root.querySelector('.repeat')
      if (!repeatControl) {
        resolve(null)
        return
      }
      const button = repeatControl.querySelector('button')
      if (!button) {
        resolve(null)
        return
      }
      button.click()
      let settled = false
      const finish = (state) => {
        if (settled) return
        settled = true
        resolve(state)
      }
      setTimeout(() => {
        const firstRead = detect()
        if (firstRead) {
          finish(firstRead)
          return
        }
        setTimeout(() => finish(detect()), 200)
      }, 80)
    }))()
  `
    return runScriptInViewReturn(youtubeView, script, null)
}
