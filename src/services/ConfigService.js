import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFileUrl = import.meta.url
const currentFilePath = fileURLToPath(currentFileUrl)
const currentDirPath = dirname(currentFilePath)
const rootDirPath = resolve(currentDirPath, '..', '..')

export const ConfigType = {
    SETTINGS: 'settings',
}

const configPaths = {
    [ConfigType.SETTINGS]: 'configs/settings.json',
}

function readJson(relativePathFromRoot) {
    const absolutePath = resolve(rootDirPath, relativePathFromRoot)
    const fileContent = readFileSync(absolutePath, 'utf-8')
    return JSON.parse(fileContent)
}

export class ConfigService {
    static load(configType) {
        const path = configPaths[configType]
        return path ? readJson(path) : null
    }

    static loadSettings() {
        return ConfigService.load(ConfigType.SETTINGS)
    }

    static loadSettingsDefaults() {
        return readJson('configs/settings-defaults.json')
    }

    static saveSettings(updatedSettings) {
        const absolutePath = resolve(rootDirPath, 'configs', 'settings.json')
        const json = JSON.stringify(updatedSettings ?? {}, null, 2)
        writeFileSync(absolutePath, json, 'utf-8')
    }

    static resetSettingsToDefaults() {
        const defaults = ConfigService.loadSettingsDefaults()
        const absolutePath = resolve(rootDirPath, 'configs', 'settings.json')
        const json = JSON.stringify(defaults ?? {}, null, 2)
        writeFileSync(absolutePath, json, 'utf-8')
        return defaults
    }
}

