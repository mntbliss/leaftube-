/**
 * iunjected into YT Music page.
 * upgrades low-res queue thumbnails (60x60 etc) to higher-res covers
 * so they look good in gallery/grid views
 */
;(function () {
    function upgradeQueueThumb(img) {
        if (!img || !img.src) return

        try {
            var url = new URL(img.src)

            // Upgrade standard ytimg thumbnails
            if (url.hostname.indexOf('ytimg.com') !== -1) {
                // Force a higher resolution version. Most videos support at least sddefault/hqdefault.
                url.pathname = url.pathname.replace(/\/[^/]+\.jpg$/, '/maxresdefault.jpg')
                img.src = url.toString()
                return
            }

            // For googleusercontent thumbs with size parameters, strip the resizing
            if (url.hostname.indexOf('googleusercontent.com') !== -1) {
                // Drop any explicit query params if present
                url.search = ''
                // And drop size modifiers embedded in the path after '='
                if (url.pathname.indexOf('=') !== -1) {
                    url.pathname = url.pathname.split('=')[0]
                }
                img.src = url.toString()
                return
            }
        } catch (error) {
            // ignore malformed URLs
        }
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
            upgradeAllQueueThumbs()
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
