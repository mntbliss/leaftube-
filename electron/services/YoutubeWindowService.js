import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Path } from '../constants/path.js'
import { PlayerAction } from '../constants/player-actions.js'
import { runScriptInView } from '../helpers/view-helpers.js'
import { getIconPath, getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'
import { showSmooth, hideSmooth } from '../helpers/youtube-smooth-helpers.js'
import * as LogBufferService from './LogBufferService.js'
import {
    readNowPlaying,
    clickPlayerButton,
    clickPreviousSmart,
    seekPlayerToFraction,
    setMediaVolume,
    setMediaMuted,
    getMediaVolume,
    clickLikeButton,
    clickRepeatButton,
    readRepeatModeFromPlayerBar,
} from './YoutubeHandler.js'
import { ordinalFromRepeatState, repeatStateFromOrdinal } from '../../src/constants/loop-feedback.js'

export class YoutubeWindowService {
    constructor({ app, BrowserWindow, BrowserView, appSettings, rootDirPath, youtubeDebloatCss }) {
        this.app = app
        this.BrowserWindow = BrowserWindow
        this.BrowserView = BrowserView
        this.appSettings = appSettings
        this.rootDirPath = rootDirPath
        this.youtubeDebloatCss = youtubeDebloatCss
        this.isYoutubeDeveloperConsoleEnabled = Boolean(appSettings.developer?.isYoutubeDeveloperConsoleEnabled)
        this.isVideosInsteadOfPicture = Boolean(appSettings.youtubeMusic?.isVideosInsteadOfPicture)
        this.pollIntervalMs = Number(appSettings.youtubeMusic?.pollIntervalMs) || 800
        this.presenceUpdateIntervalMs = Number(appSettings.discordRichPresence?.presenceUpdateIntervalMs) || 5000

        this.youtubeWindow = undefined
        this.youtubeView = undefined
        this.isFirstYoutubeLoad = true

        const volumeLevel = this.appSettings?.youtubeMusic?.volumeLevel
        const isMuted = this.appSettings?.youtubeMusic?.isMuted
        this.lastVolume = Number.isFinite(volumeLevel) ? Math.max(0, Math.min(1, volumeLevel)) : 0
        this.wasLastMuted = Boolean(isMuted)
        this.lastTrackKey = null
        this.lastTrackChangeTime = 0
        this.VOLUME_SYNC_GRACE_MS = 2500
        /** 0 = off, 1 = all, 2 = one — synced from DOM when possible */
        this.repeatModeOrdinal = null
    }

    ensureWindow(shouldShow = true) {
        if (this.youtubeWindow) {
            if (!shouldShow) return
            if (!this.youtubeWindow.isDestroyed()) {
                if (this.youtubeWindow.isMinimized()) this.youtubeWindow.restore()
                showSmooth(this, true, { waitFrames: false })
            }
            return
        }

        const isAcrylic = Boolean(this.appSettings?.window?.isAcrylic)
        const iconPath = getIconPath(this.app, this.rootDirPath)
        this.youtubeWindow = new this.BrowserWindow({
            show: false,
            resizable: true,
            icon: iconPath,
            ...getTransparentFrameOptions(isAcrylic),
            webPreferences: getWebPreferences(),
        })

        // Prevent the YouTube window itself from entering fullscreen
        try {
            this.youtubeWindow.setFullScreenable(false)
        } catch {}
        this.youtubeWindow.on('enter-full-screen', () => {
            try {
                this.youtubeWindow.setFullScreen(false)
            } catch {}
        })

        this.youtubeWindow.maximize()

        let restoredBounds = null
        const isPreloading = !shouldShow
        if (isPreloading) {
            restoredBounds = this.youtubeWindow.getBounds()
            this.youtubeWindow.setBounds({
                ...restoredBounds,
                x: -restoredBounds.width - 1000,
                y: -restoredBounds.height - 1000,
            })
            this.youtubeWindow.show()
        }

        const barPreloadPath = resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.PRELOADERS_DIR, Path.YOUTUBE_BAR_PRELOAD_FILENAME)
        this.youtubeView = new this.BrowserView({
            webPreferences: getWebPreferences({ partition: Path.YOUTUBE_PARTITION, preloadPath: barPreloadPath }),
        })
        this.youtubeView.webContents.setMaxListeners(50)

        // Helps debug YouTube view “blank/transparent” states on specific PCs
        this.youtubeView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
            try {
                // Also prints to devtools/console for faster triage
                console.log('[YoutubeView] did-fail-load', errorCode, errorDescription)
                LogBufferService.addError(new Error(
                    `[YoutubeView] did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL} mainFrame=${isMainFrame}`
                ))
            } catch {
                // ignore logger failures
            }
        })

        this.youtubeView.webContents.on('render-process-gone', (_event, details) => {
            try {
                const reason = details?.reason ?? 'unknown'
                LogBufferService.addError(new Error(`[YoutubeView] render-process-gone: reason=${reason}`))
            } catch {
                // ignore logger failures
            }
        })

        this.youtubeView.webContents.on('crashed', () => {
            try {
                LogBufferService.addError(new Error('[YoutubeView] webContents crashed'))
            } catch {
                // ignore logger failures
            }
        })

        this.youtubeView.webContents.on('unresponsive', () => {
            try {
                LogBufferService.addError(new Error('[YoutubeView] webContents became unresponsive'))
            } catch {
                // ignore logger failures
            }
        })

        this.youtubeView.webContents.on('console-message', (_event, params) => {
            try {
                const lvlStr = String(params?.level || '').toLowerCase()
                const msg = params?.message
                const ln = params?.line
                const src = params?.sourceId
                if (lvlStr.includes('error')) {
                    LogBufferService.addError(new Error(
                        `[YoutubeView] console.error: ${String(msg)} (${src}:${ln})`
                    ))
                }
            } catch {
                // ignore logger failures
            }
        })

        // Block HTML5 fullscreen inside the YT Music view
        this.youtubeView.webContents.on('enter-html-full-screen', event => {
            try {
                if (event && typeof event.preventDefault === 'function') event.preventDefault()
            } catch {}
            try {
                this.youtubeWindow.setFullScreen(false)
            } catch {}
        })
        this.youtubeView.webContents.on('leave-html-full-screen', () => {
            try {
                this.youtubeWindow.setFullScreen(false)
            } catch {}
        })

        this.youtubeWindow.setBrowserView(this.youtubeView)
        this.resizeView()
        this.youtubeView.webContents.loadURL(this.appSettings.youtubeMusic.url).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })

        if (isPreloading && restoredBounds) {
            this.youtubeView.webContents.once('did-finish-load', () => {
                try {
                    if (this.youtubeWindow && !this.youtubeWindow.isDestroyed()) {
                        this.youtubeWindow.hide()
                        this.youtubeWindow.setBounds(restoredBounds)
                        this.resizeView()
                    }
                } catch {}
            })
        }

        this.youtubeView.webContents.on('dom-ready', () => {
            this.injectDebloatCss()
            this.injectHeaderIntoYoutubePage()
            this.injectYoutubeDomScripts()
            if (this.isYoutubeDeveloperConsoleEnabled) this.youtubeView.webContents.openDevTools({ mode: 'detach' })
            this.applyStoredVolume()
            const isFirstLoad = this.isFirstYoutubeLoad && shouldShow
            if (isFirstLoad) this.isFirstYoutubeLoad = false
            showSmooth(this, isFirstLoad, { waitFrames: isFirstLoad })
        })

        this.youtubeWindow.on('close', event => {
            if (this.app.leafQuitting) return
            event.preventDefault()
            this.hideWindow()
        })

        this.youtubeWindow.on('closed', () => {
            this.youtubeWindow = undefined
            this.youtubeView = undefined
            this.isFirstYoutubeLoad = true
        })

        if (shouldShow) {
            if (this.youtubeWindow.isMinimized()) this.youtubeWindow.restore()
        } else {
            this.youtubeWindow.show()
        }
    }

    resizeView() {
        if (!this.youtubeWindow || !this.youtubeView) return
        const windowBounds = this.youtubeWindow.getBounds()
        this.youtubeView.setBounds({
            x: 0,
            y: 0,
            width: windowBounds.width,
            height: windowBounds.height,
        })
    }

    hideWindow() {
        if (!this.youtubeWindow) return
        hideSmooth(this)
    }

    setContentVisible(isVisible) {
        if (!this.youtubeView) return
        const script = isVisible
            ? "document && document.body && document.body.classList.add('is-content-visible');"
            : "document && document.body && document.body.classList.remove('is-content-visible');"
        runScriptInView(this.youtubeView, `(function(){ try { ${script} } catch(error) {} })();`).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {}
        })
    }

    setContentAreaOpacity(opacityValue) {
        if (!this.youtubeView) return
        const numericOpacity = Number(opacityValue)
        if (!Number.isFinite(numericOpacity)) return
        const clamped = Math.max(0, Math.min(1, numericOpacity))
        const script = `(function(){ try {
          var contentRoot = document.body && document.body.firstElementChild;
          if (contentRoot) { contentRoot.style.transition = 'opacity 200ms ease-out'; contentRoot.style.opacity = ${clamped}; }
        } catch (error) {} })();`
        runScriptInView(this.youtubeView, script).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {}
        })
    }

    animateWindowOpacity(fromValue, toValue, durationMs, onComplete) {
        if (!this.youtubeWindow || this.youtubeWindow.isDestroyed()) return
        const startTime = Date.now()
        const tick = () => {
            if (!this.youtubeWindow || this.youtubeWindow.isDestroyed()) return
            const elapsed = Date.now() - startTime
            const progress = Math.min(1, elapsed / durationMs)
            const eased = progress * (2 - progress)
            const current = fromValue + (toValue - fromValue) * eased
            this.youtubeWindow.setOpacity(current)
            if (progress < 1) {
                setTimeout(tick, 16)
            } else if (typeof onComplete === 'function') {
                onComplete()
            }
        }
        tick()
    }

    injectDebloatCss() {
        if (!this.youtubeView) return
        if (!this.youtubeDebloatCss) return
        this.youtubeView.webContents.insertCSS(this.youtubeDebloatCss).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })
    }

    injectHeaderIntoYoutubePage() {
        if (!this.youtubeView) return
        const getInjectionFilePath = fileName => resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.INJECTIONS_DIR, fileName)
        let headerCssContent = ''
        let headerJsContent = ''
        try {
            headerCssContent = readFileSync(getInjectionFilePath('header-inject.css'), 'utf8')
            headerJsContent = readFileSync(getInjectionFilePath('header-inject.js'), 'utf8')
        } catch (readError) {
            try {
                LogBufferService.addError(readError instanceof Error ? readError : new Error(String(readError)))
            } catch {
                // ignore logger failures
            }
            return
        }
        this.youtubeView.webContents.insertCSS(headerCssContent).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })
        runScriptInView(this.youtubeView, headerJsContent).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })
    }

    injectYoutubeDomScripts() {
        if (!this.youtubeView) return
        const getInjectionFilePath = fileName => resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.INJECTIONS_DIR, fileName)
        let queueThumbsScriptContent = ''
        let videoModeScriptContent = ''
        let fullscreenBlockerScriptContent = ''
        try {
            queueThumbsScriptContent = readFileSync(getInjectionFilePath('queue-thumbnails.js'), 'utf8')
            if (this.isVideosInsteadOfPicture) {
                videoModeScriptContent = readFileSync(getInjectionFilePath('video-mode.js'), 'utf8')
            }
        } catch (readError) {
            try {
                LogBufferService.addError(readError instanceof Error ? readError : new Error(String(readError)))
            } catch {
                // ignore logger failures
            }
            return
        }
        try {
            // Always attempt to load fullscreen blocker (prevents YT full-screen overlay from breaking UI)
            fullscreenBlockerScriptContent = readFileSync(getInjectionFilePath('fullscreen-blocker.js'), 'utf8')
        } catch (readError) {
            try {
                LogBufferService.addError(readError instanceof Error ? readError : new Error(String(readError)))
            } catch {
                // ignore logger failures
            }
            fullscreenBlockerScriptContent = ''
        }
        if (queueThumbsScriptContent) {
            runScriptInView(this.youtubeView, queueThumbsScriptContent).catch(error => {
                try {
                    LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
                } catch {
                    // ignore logger failures
                }
            })
        }
        if (fullscreenBlockerScriptContent) {
            runScriptInView(this.youtubeView, fullscreenBlockerScriptContent).catch(error => {
                try {
                    LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
                } catch {
                    // ignore logger failures
                }
            })
        }
        if (videoModeScriptContent) {
            runScriptInView(this.youtubeView, videoModeScriptContent).catch(error => {
                try {
                    LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
                } catch {
                    // ignore logger failures
                }
            })
        }
    }

    startNowPlayingPolling({ onNowPlaying, onPresence, onVolumeChangedFromView }) {
        let lastPresenceSentAt = 0

        const poll = async () => {
            if (!this.youtubeView) return
            let nowPlaying
            let watchUrl
            try {
                nowPlaying = await readNowPlaying(this.youtubeView)
                watchUrl = this.youtubeView.webContents.getURL()
            } catch {
                return
            }
            if (!nowPlaying || typeof watchUrl !== 'string') {
                if (typeof onNowPlaying === 'function') onNowPlaying(nowPlaying)
                return
            }
            const videoIdMatch = watchUrl.match(/[?&]v=([^&]+)/)
            const videoId = videoIdMatch ? videoIdMatch[1] : null
            if (videoId) nowPlaying.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

            try {
                const currentTrackKey = nowPlaying && nowPlaying.title ? `${nowPlaying.title}::${nowPlaying.channel || ''}` : null
                if (currentTrackKey && currentTrackKey !== this.lastTrackKey) {
                    this.lastTrackKey = currentTrackKey
                    this.lastTrackChangeTime = Date.now()
                    this.applyStoredVolume()
                }
            } catch {}

            try {
                const volumeState = await getMediaVolume(this.youtubeView)
                const inGraceWindow = Date.now() - this.lastTrackChangeTime < this.VOLUME_SYNC_GRACE_MS
                if (!inGraceWindow) {
                    const ytLevel = typeof volumeState.volumeLevel === 'number' ? volumeState.volumeLevel : this.lastVolume
                    const ytMuted = typeof volumeState.isMuted === 'boolean' ? volumeState.isMuted : this.wasLastMuted
                    if (this.lastVolume !== ytLevel || this.wasLastMuted !== ytMuted) {
                        this.lastVolume = Math.max(0, Math.min(1, ytLevel))
                        this.wasLastMuted = ytMuted
                        if (typeof onVolumeChangedFromView === 'function') onVolumeChangedFromView()
                    }
                } else {
                    this.applyStoredVolume()
                }
                nowPlaying.volumeLevel = this.lastVolume
                nowPlaying.isMuted = this.wasLastMuted
            } catch {}

            try {
                const repeatMode = await readRepeatModeFromPlayerBar(this.youtubeView)
                const repeatOrdinal = ordinalFromRepeatState(repeatMode)
                if (repeatOrdinal != null) this.repeatModeOrdinal = repeatOrdinal
            } catch {}

            if (typeof onPresence === 'function') {
                const now = Date.now()
                const isTrackValid = nowPlaying && nowPlaying.title
                if (isTrackValid && now - lastPresenceSentAt >= this.presenceUpdateIntervalMs) {
                    onPresence(nowPlaying, watchUrl)
                    lastPresenceSentAt = now
                }
            }
            if (typeof onNowPlaying === 'function') onNowPlaying(nowPlaying)
        }

        setInterval(poll, this.pollIntervalMs)
    }

    async clickPlayer(action) {
        if (!this.youtubeView) return
        const isNextOrPrev = action === PlayerAction.NEXT || action === PlayerAction.PREVIOUS
        if (action === PlayerAction.PREVIOUS) await clickPreviousSmart(this.youtubeView)
        else await clickPlayerButton(this.youtubeView, action)
        if (isNextOrPrev) this.applyStoredVolume()
    }

    async seekToFraction(fraction) {
        if (!this.youtubeView) return
        await seekPlayerToFraction(this.youtubeView, fraction)
    }

    async setVolume(fraction) {
        this.lastVolume = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 1
        this.wasLastMuted = false
        if (!this.youtubeView) return
        await setMediaVolume(this.youtubeView, fraction)
    }

    async setMuted(isMuted) {
        this.wasLastMuted = Boolean(isMuted)
        if (!this.youtubeView) return
        await setMediaMuted(this.youtubeView, isMuted)
    }

    applyStoredVolume() {
        if (!this.youtubeView) return
        setMediaVolume(this.youtubeView, this.lastVolume).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {}
        })
        setMediaMuted(this.youtubeView, this.wasLastMuted).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {}
        })
    }

    async getVolume() {
        if (!this.youtubeView) return { volumeLevel: 1, isMuted: false }
        return getMediaVolume(this.youtubeView)
    }

    async likeCurrentTrack() {
        if (!this.youtubeView) return null
        return clickLikeButton(this.youtubeView)
    }

    async toggleLoop() {
        if (!this.youtubeView) return null
        const detected = await clickRepeatButton(this.youtubeView)
        const detectedOrdinal = ordinalFromRepeatState(detected)
        if (detected != null && detectedOrdinal != null) {
            this.repeatModeOrdinal = detectedOrdinal
            return detected
        }
        const previousOrdinal = this.repeatModeOrdinal != null ? this.repeatModeOrdinal : 0
        this.repeatModeOrdinal = (previousOrdinal + 1) % 3
        return repeatStateFromOrdinal(this.repeatModeOrdinal)
    }

    navigateTo(path) {
        if (!this.youtubeView) return
        this.setContentVisible(false)
        this.setContentAreaOpacity(0)
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        const segment = path && String(path).startsWith('/') ? path : `/${path || ''}`
        const url = segment === '/' ? base : `${base}${segment}`
        this.youtubeView.webContents.loadURL(url).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })
    }

    runSearch(query) {
        if (!this.youtubeView) return
        const searchQuery = String(query || '').trim()
        if (!searchQuery) return
        this.setContentVisible(false)
        this.setContentAreaOpacity(0)
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        const url = `${base}/search?q=${encodeURIComponent(searchQuery)}`
        this.youtubeView.webContents.loadURL(url).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })
    }

    openSettingsInView() {
        if (!this.youtubeView) return
        this.setContentVisible(false)
        this.setContentAreaOpacity(0)
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        this.youtubeView.webContents.loadURL(`${base}/settings`).catch(error => {
            try {
                LogBufferService.addError(error instanceof Error ? error : new Error(String(error)))
            } catch {
                // ignore logger failures
            }
        })
    }
}
