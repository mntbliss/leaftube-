import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Path } from '../constants/path.js'
import { PlayerAction } from '../constants/player-actions.js'
import { runScriptInView } from '../helpers/view-helpers.js'
import { getIconPath, getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'
import { showSmooth, hideSmooth } from '../helpers/youtube-smooth-helpers.js'
import {
    readNowPlaying,
    clickPlayerButton,
    clickPreviousSmart,
    seekPlayerToFraction,
    setMediaVolume,
    setMediaMuted,
    getMediaVolume,
    clickLikeButton,
    clickAddToPlaylist,
} from './YoutubeHandler.js'

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
        this.headerHeight = 50
        this.isFirstYoutubeLoad = true

        const volumeLevel = this.appSettings?.youtubeMusic?.volumeLevel
        const isMuted = this.appSettings?.youtubeMusic?.isMuted
        this.lastVolume = Number.isFinite(volumeLevel) ? Math.max(0, Math.min(1, volumeLevel)) : 0
        this.wasLastMuted = Boolean(isMuted)
        this.lastTrackKey = null
        this.lastTrackChangeTime = 0
        this.VOLUME_SYNC_GRACE_MS = 2500
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

        this.youtubeWindow.setBrowserView(this.youtubeView)
        this.resizeView()
        this.youtubeView.webContents.loadURL(this.appSettings.youtubeMusic.url)

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
        runScriptInView(this.youtubeView, `(function(){ try { ${script} } catch(error) {} })();`).catch(() => {})
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
        runScriptInView(this.youtubeView, script).catch(() => {})
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
        this.youtubeView.webContents.insertCSS(this.youtubeDebloatCss)
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
            return
        }
        this.youtubeView.webContents.insertCSS(headerCssContent).catch(() => {})
        runScriptInView(this.youtubeView, headerJsContent).catch(() => {})
    }

    injectYoutubeDomScripts() {
        if (!this.youtubeView) return
        if (!this.isVideosInsteadOfPicture) return
        const getInjectionFilePath = fileName => resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.INJECTIONS_DIR, fileName)
        let videoModeScriptContent = ''
        try {
            videoModeScriptContent = readFileSync(getInjectionFilePath('video-mode.js'), 'utf8')
        } catch (readError) {
            return
        }
        runScriptInView(this.youtubeView, videoModeScriptContent).catch(() => {})
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
        setMediaVolume(this.youtubeView, this.lastVolume).catch(() => {})
        setMediaMuted(this.youtubeView, this.wasLastMuted).catch(() => {})
    }

    async getVolume() {
        if (!this.youtubeView) return { volumeLevel: 1, isMuted: false }
        return getMediaVolume(this.youtubeView)
    }

    async likeCurrentTrack() {
        if (!this.youtubeView) return null
        return clickLikeButton(this.youtubeView)
    }

    async addCurrentTrackToPlaylist() {
        if (!this.youtubeView) return
        await clickAddToPlaylist(this.youtubeView)
    }

    navigateTo(path) {
        if (!this.youtubeView) return
        this.setContentVisible(false)
        this.setContentAreaOpacity(0)
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        const segment = path && String(path).startsWith('/') ? path : `/${path || ''}`
        const url = segment === '/' ? base : `${base}${segment}`
        this.youtubeView.webContents.loadURL(url).catch(() => {})
    }

    runSearch(query) {
        if (!this.youtubeView) return
        const searchQuery = String(query || '').trim()
        if (!searchQuery) return
        this.setContentVisible(false)
        this.setContentAreaOpacity(0)
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        const url = `${base}/search?q=${encodeURIComponent(searchQuery)}`
        this.youtubeView.webContents.loadURL(url).catch(() => {})
    }

    openSettingsInView() {
        if (!this.youtubeView) return
        this.setContentVisible(false)
        this.setContentAreaOpacity(0)
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        this.youtubeView.webContents.loadURL(`${base}/settings`).catch(() => {})
    }
}
