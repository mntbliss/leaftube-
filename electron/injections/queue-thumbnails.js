/**
 * iunjected into YT Music page.
 * upgrades low-res queue thumbnails (60x60 etc) to higher-res covers
 * so they look good in gallery/grid views
 */
;(function () {
    var fallbackForMissingMaxres = ['maxresdefault.jpg', 'hqdefault.jpg', 'sddefault.jpg', 'mqdefault.jpg']
    // Heuristic: if YT serves a placeholder, naturalWidth can be tiny.
    // Use a conservative threshold so we still accept real hqdefault (~480px wide).
    var MIN_REASONABLE_NATURAL_WIDTH = 320

    // Debounced re-check: YT can overwrite thumbnail src after initial render.
    var recheckTimer = null
    function scheduleRecheck(delayMs) {
        try {
            var d = Number.isFinite(delayMs) ? delayMs : 1500
            if (recheckTimer) clearTimeout(recheckTimer)
            recheckTimer = setTimeout(function () {
                recheckTimer = null
                upgradeAllQueueThumbs()
            }, d)
        } catch {}
    }

    function computeUpgradedSrc(src, fallbackIndex) {
        if (!src) return null
        try {
            var url = new URL(src)

            // Upgrade standard ytimg thumbnails
            if (url.hostname.indexOf('ytimg.com') !== -1) {
                var idx = Number.isFinite(fallbackIndex) ? fallbackIndex : 0
                idx = Math.max(0, Math.min(fallbackForMissingMaxres.length - 1, idx))
                url.pathname = url.pathname.replace(/\/[^/]+\.jpg$/, '/' + fallbackForMissingMaxres[idx])
                return url.toString()
            }

            // For googleusercontent thumbs with size parameters, strip the resizing
            if (url.hostname.indexOf('googleusercontent.com') !== -1) {
                // Drop any explicit query params if present
                url.search = ''
                // And drop size modifiers embedded in the path after '='
                if (url.pathname.indexOf('=') !== -1) {
                    url.pathname = url.pathname.split('=')[0]
                }
                return url.toString()
            }
        } catch (error) {
            // ignore malformed URLs
        }
        return null
    }

    function installYtimgErrorFallback(img) {
        if (!img) return
        if (!img.src) return
        if (!img.dataset) return

        try {
            var idx = parseInt(img.dataset.leafThumbFallbackIndex || '0', 10)
            if (!Number.isFinite(idx)) idx = 0
            idx = Math.max(0, Math.min(fallbackForMissingMaxres.length - 1, idx))

            // Avoid reinstalling same handler for the same stage.
            if (img.dataset.leafThumbErrorListenerIndex === String(idx)) return
            img.dataset.leafThumbErrorListenerIndex = String(idx)

            img.addEventListener(
                'error',
                function () {
                    try {
                        var currentIdx = parseInt(img.dataset.leafThumbFallbackIndex || String(idx), 10)
                        if (!Number.isFinite(currentIdx)) currentIdx = idx
                        var nextIdx = currentIdx + 1

                        if (nextIdx >= fallbackForMissingMaxres.length) return
                        img.dataset.leafThumbFallbackIndex = String(nextIdx)

                        // Replace current <something>.jpg with the next fallback.
                        var url = new URL(img.src)
                        url.pathname = url.pathname.replace(/\/[^/]+\.jpg$/, '/' + fallbackForMissingMaxres[nextIdx])
                        img.src = url.toString()

                        // Install handler for the next stage too.
                        installYtimgErrorFallback(img)
                    } catch {}
                },
                { once: true }
            )
        } catch {}
    }

    function schedulePlaceholderCheck(img, stageFallbackIndex) {
        if (!img || !img.dataset) return
        try {
            var token = String(stageFallbackIndex) + ':' + (Date.now() + Math.random())
            img.dataset.leafThumbPlaceholderCheckToken = token
            setTimeout(function () {
                try {
                    // If src changed for another reason, skip this check.
                    if (img.dataset.leafThumbPlaceholderCheckToken !== token) return
                    if (!img || !img.dataset) return

                    var currentIdx = parseInt(img.dataset.leafThumbFallbackIndex || String(stageFallbackIndex), 10)
                    if (!Number.isFinite(currentIdx)) currentIdx = stageFallbackIndex || 0
                    currentIdx = Math.max(0, Math.min(fallbackForMissingMaxres.length - 1, currentIdx))

                    // If the image is still loading, wait a bit longer (best effort).
                    if (!img.complete) return

                    var w = typeof img.naturalWidth === 'number' ? img.naturalWidth : 0
                    var h = typeof img.naturalHeight === 'number' ? img.naturalHeight : 0

                    // Placeholder tends to have very small natural dimensions.
                    if (w >= MIN_REASONABLE_NATURAL_WIDTH && h > 0) return

                    var nextIdx = currentIdx + 1
                    if (nextIdx >= fallbackForMissingMaxres.length) return

                    img.dataset.leafThumbFallbackIndex = String(nextIdx)
                    var url = new URL(img.src)
                    url.pathname = url.pathname.replace(/\/[^/]+\.jpg$/, '/' + fallbackForMissingMaxres[nextIdx])
                    img.src = url.toString()

                    // Attach error fallback for the new src.
                    installYtimgErrorFallback(img)
                    // Re-check for placeholders again shortly after.
                    schedulePlaceholderCheck(img, nextIdx)
                } catch {}
            }, 1000)
        } catch {}
    }

    function upgradeQueueThumb(img) {
        if (!img || !img.src) return

        try {
            // YT may not have maxres for some videos; fall back to other defaults.
            var currentFallbackIndex = parseInt(img.dataset?.leafThumbFallbackIndex || '0', 10)
            if (!Number.isFinite(currentFallbackIndex)) currentFallbackIndex = 0

            var upgraded = computeUpgradedSrc(img.src, currentFallbackIndex)
            if (!upgraded || upgraded === img.src) return

            img.src = upgraded

            // Ensure fallback sequence is enabled for ytimg URLs.
            try {
                var u = new URL(upgraded)
                if (u.hostname.indexOf('ytimg.com') !== -1) {
                    // Track current fallback stage so both error + placeholder heuristics advance consistently.
                    img.dataset.leafThumbFallbackIndex = String(currentFallbackIndex || 0)
                    installYtimgErrorFallback(img)
                    schedulePlaceholderCheck(img, currentFallbackIndex || 0)
                }
            } catch {}

            // One-shot delayed retry: if YT overwrites src after we changed it,
            // we'll upgrade again shortly after render settles.
            if (!img.dataset) return
            if (img.dataset.leafThumbRetryScheduled === '1') return
            img.dataset.leafThumbRetryScheduled = '1'
            setTimeout(function () {
                try {
                    img.dataset.leafThumbRetryScheduled = '0'
                    upgradeQueueThumb(img)
                } catch {}
            }, 1500)
        } catch {}
    }

    function upgradeAllQueueThumbs() {
        var imgs = document.querySelectorAll('ytmusic-player-queue-item yt-img-shadow img#img, ytmusic-player-queue-item yt-img-shadow img')
        for (var i = 0; i < imgs.length; i++) {
            upgradeQueueThumb(imgs[i])
        }
    }

    function initObserver() {
        if (!window.MutationObserver) {
            upgradeAllQueueThumbs()
            return
        }

        var observer = new MutationObserver(function () {
            // Don't spam: debounce and also apply immediately.
            upgradeAllQueueThumbs()
            scheduleRecheck(1500)
        })

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
        })

        upgradeAllQueueThumbs()
    }

    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initObserver, { once: true })
        } else {
            initObserver()
        }
    } catch (error) {}
})()
