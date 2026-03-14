import { Tray, Menu, nativeImage } from 'electron'

export class TrayService {
    constructor({ app, iconPath, mainWindowService }) {
        this.app = app
        this.mainWindowService = mainWindowService
        this.tray = null
        this.iconPath = iconPath
    }

    create() {
        if (this.tray) return
        const image = nativeImage.createFromPath(this.iconPath)

        if (image.isEmpty()) return
        this.tray = new Tray(image)
        this.tray.setToolTip('leaftube 🌿')
        this.tray.setContextMenu(
            Menu.buildFromTemplate([
                { label: 'open 🌿', click: () => this.mainWindowService.showWindow() },
                { type: 'separator' },
                { label: 'exit 💔', click: () => this.exitApp() },
            ])
        )
        this.tray.on('double-click', () => this.mainWindowService.showWindow())
    }

    exitApp() {
        this.app.leafQuitting = true
        this.destroy()
        this.app.quit()
    }

    destroy() {
        if (this.tray) {
            this.tray.destroy()
            this.tray = null
        }
    }
}
