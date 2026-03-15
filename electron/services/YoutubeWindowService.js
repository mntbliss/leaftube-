import { resolve } from 'node:path'
import { Path } from '../constants/path.js'
import { PlayerAction } from '../constants/player-actions.js'
import { runScriptInView } from '../helpers/view-helpers.js'
import { getIconPath, getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'
import { readNowPlaying, clickPlayerButton, clickPreviousSmart, seekPlayerToFraction, setMediaVolume, setMediaMuted, getMediaVolume } from './YoutubeHandler.js'

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
        this.barView = undefined
        this.barHeight = 45
        this.isFirstYoutubeLoad = true

        const volumeLevel = this.appSettings?.youtubeMusic?.volumeLevel
        const isMuted = this.appSettings?.youtubeMusic?.isMuted
        this.lastVolume = Number.isFinite(volumeLevel) ? Math.max(0, Math.min(1, volumeLevel)) : 0
        this.wasLastMuted = Boolean(isMuted)
    }

    ensureWindow(shouldShow = true) {
        if (this.youtubeWindow) {
            if (!shouldShow) return
            if (!this.youtubeWindow.isDestroyed()) {
                if (this.youtubeWindow.isMinimized()) this.youtubeWindow.restore()
                this.youtubeWindow.setOpacity(0)
                this.youtubeWindow.show()
                this.youtubeWindow.focus()
                this.resizeView()
                this.animateWindowOpacity(0, 1, 260, () => this.setContentVisible(true))
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
        this.barView = new this.BrowserView({
            webPreferences: getWebPreferences({ preloadPath: barPreloadPath }),
        })
        this.barView.webContents.setMaxListeners(50)

        this.youtubeView = new this.BrowserView({
            webPreferences: getWebPreferences({ partition: Path.YOUTUBE_PARTITION }),
        })

        // no EventEmitter MaxListenersExceededWarning from 3rd party listeners
        // memory leak bad uh-uh
        this.youtubeView.webContents.setMaxListeners(50)

        this.youtubeWindow.setBrowserView(this.barView)
        this.youtubeWindow.addBrowserView(this.youtubeView)
        this.resizeView()

        this.barView.webContents.loadFile(resolve(this.rootDirPath, Path.ELECTRON_DIR, Path.YOUTUBE_BAR_HTML_FILENAME))
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
            this.injectFadeCssEarly()
            this.injectDebloatCss()
            this.injectYoutubeDomScripts()
            if (this.isYoutubeDeveloperConsoleEnabled) this.youtubeView.webContents.openDevTools({ mode: 'detach' })
            this.applyStoredVolume()
            if (this.isFirstYoutubeLoad && shouldShow) {
                this.isFirstYoutubeLoad = false
                const waitTwoFrames = "new Promise(function(resolve){ requestAnimationFrame(function(){ requestAnimationFrame(resolve) }) })"
                runScriptInView(this.youtubeView, waitTwoFrames).then(() => {
                    this.youtubeWindow.setOpacity(0)
                    this.youtubeWindow.show()
                    this.youtubeWindow.focus()
                    this.resizeView()
                    this.animateWindowOpacity(0, 1, 260, () => this.setContentVisible(true))
                }).catch(() => {
                    this.youtubeWindow.setOpacity(0)
                    this.youtubeWindow.show()
                    this.youtubeWindow.focus()
                    this.resizeView()
                    this.animateWindowOpacity(0, 1, 260, () => this.setContentVisible(true))
                })
            } else {
                this.setContentVisible(true)
            }
        })

        this.youtubeWindow.on('close', event => {
            if (this.app.leafQuitting) return
            event.preventDefault()
            this.hideWindow()
        })

        this.youtubeWindow.on('closed', () => {
            this.youtubeWindow = undefined
            this.youtubeView = undefined
            this.barView = undefined
            this.isFirstYoutubeLoad = true
        })

        if (shouldShow) {
            if (this.youtubeWindow.isMinimized()) this.youtubeWindow.restore()
        } else {
            this.youtubeWindow.show()
        }
    }

    resizeView() {
        if (!this.youtubeWindow || !this.youtubeView || !this.barView) return

        const windowBounds = this.youtubeWindow.getBounds()

        this.barView.setBounds({
            x: 0,
            y: 0,
            width: windowBounds.width,
            height: this.barHeight,
        })

        this.youtubeView.setBounds({
            x: 0,
            y: this.barHeight,
            width: windowBounds.width,
            height: windowBounds.height - this.barHeight,
        })
    }

    hideWindow() {
        if (!this.youtubeWindow) return

        this.setContentVisible(false)
        this.animateWindowOpacity(1, 0, 120, () => {
            try {
                if (this.youtubeWindow) this.youtubeWindow.hide()
                if (this.youtubeWindow && !this.youtubeWindow.isDestroyed()) this.youtubeWindow.setOpacity(1)
            } catch {}
        })
    }

    setContentVisible(visible) {
        if (!this.youtubeView) return Promise.resolve()
        const script = visible
            ? "document && document.body && document.body.classList.add('leaf-content-visible');"
            : "document && document.body && document.body.classList.remove('leaf-content-visible');"
        return runScriptInView(this.youtubeView, `(function(){ try { ${script} } catch(ignore) {} })();`)
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

    injectFadeCssEarly() {
        if (!this.youtubeView) return
        const fadeCss = 'body ytmusic-app{opacity:0!important;transition:opacity 260ms ease-out!important}body.leaf-content-visible ytmusic-app{opacity:1!important}'
        this.youtubeView.webContents.insertCSS(fadeCss).catch(() => {})
    }

    injectDebloatCss() {
        if (!this.youtubeView) return
        if (!this.youtubeDebloatCss) return
        this.youtubeView.webContents.insertCSS(this.youtubeDebloatCss)
    }

    injectYoutubeDomScripts() {
        if (!this.youtubeView) return

        if (!this.isVideosInsteadOfPicture) return
        const videoModeScript = `(function() {
          setTimeout(function() {
            try {
              function switchToVideoTabIfNotActive() {
                if (document.body.classList.contains('video-mode')) return;
                var videoTabSelectors = ['ytmusic-player-page tp-yt-paper-tab[tab-id="VIDEO"]', 'ytmusic-player-page [role="tab"][tab-id="VIDEO"]'];
                for (var selectorIndex = 0; selectorIndex < videoTabSelectors.length; selectorIndex++) {
                  var videoTabElement = document.querySelector(videoTabSelectors[selectorIndex]);
                  if (videoTabElement) { videoTabElement.click(); break; }
                }
              }
              switchToVideoTabIfNotActive();
              setInterval(switchToVideoTabIfNotActive, 3000);
            } catch(error) {}
          }, 0);
        })()`
        runScriptInView(this.youtubeView, videoModeScript).catch(() => {})
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
                const volumeState = await getMediaVolume(this.youtubeView)
                const prevVolume = this.lastVolume
                const prevMuted = this.wasLastMuted
                nowPlaying.volumeLevel = volumeState.volumeLevel
                nowPlaying.isMuted = volumeState.isMuted
                this.lastVolume = typeof volumeState.volumeLevel === 'number' ? volumeState.volumeLevel : this.lastVolume
                this.wasLastMuted = typeof volumeState.isMuted === 'boolean' ? volumeState.isMuted : this.wasLastMuted
                const changed = prevVolume !== this.lastVolume || prevMuted !== this.wasLastMuted
                if (changed && typeof onVolumeChangedFromView === 'function') onVolumeChangedFromView()
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

    navigateTo(path) {
        if (!this.youtubeView) return
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        const segment = path && String(path).startsWith('/') ? path : `/${path || ''}`
        const url = segment === '/' ? base : `${base}${segment}`
        this.youtubeView.webContents.loadURL(url).catch(() => {})
    }

    runSearch(query) {
        if (!this.youtubeView) return
        const searchQuery = String(query || '').trim()
        if (!searchQuery) return
        const base = (this.appSettings?.youtubeMusic?.url || 'https://music.youtube.com').replace(/\/$/, '')
        const url = `${base}/search?q=${encodeURIComponent(searchQuery)}`
        this.youtubeView.webContents.loadURL(url).catch(() => {})
    }

    openSignInInView() {
        if (!this.youtubeView) return
        const script = `(function(){ try { setTimeout(function(){
          var signInButton = document.querySelector('#sign-in-button') || document.querySelector('ytmusic-nav-bar a[href*="accounts.google.com"]');
          if (signInButton) {
            signInButton.style.setProperty('display','block','important');
            signInButton.style.setProperty('visibility','visible','important');
            signInButton.click();
          }
        }, 0); } catch(error) {} })()`
        runScriptInView(this.youtubeView, script).catch(() => {})
    }

    openAppMenuInView() {
        if (!this.youtubeView) return
        const script = `(function(){ try {
          setTimeout(function(){
            var dialog = document.querySelector('ytmusic-dialog');
            if (dialog) {
              if (typeof dialog.open !== 'undefined') { dialog.open = true; return; }
              if (typeof dialog.show === 'function') { dialog.show(); return; }
              if (dialog.setAttribute) { dialog.setAttribute('opened', ''); return; }
            }
            var nav = document.querySelector('ytmusic-nav-bar');
            if (!nav) return;
            var accountButton = nav.querySelector('#account-button') || nav.querySelector('.right-content button') || nav.querySelector('.right-content tp-yt-paper-icon-button');
            if (accountButton) {
              accountButton.click();
              setTimeout(function(){
                var menuItem = document.querySelector('ytmusic-menu-popup-renderer tp-yt-paper-item:nth-child(2)') || document.querySelector('tp-yt-paper-listbox tp-yt-paper-item:nth-child(2)');
                if (menuItem) menuItem.click();
              }, 250);
            }
          }, 0);
        } catch(error) {} })()`
        runScriptInView(this.youtubeView, script).catch(() => {})
    }
}
