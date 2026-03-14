import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFileUrl = import.meta.url
const currentFilePath = fileURLToPath(currentFileUrl)
const currentDirPath = dirname(currentFilePath)
const defaultRootPath = resolve(currentDirPath, '..', '..')

let configRootPath = null

export const ConfigType = {
    SETTINGS: 'settings',
}

const configPaths = {
    [ConfigType.SETTINGS]: 'configs/settings.json',
}

function readJson(relativePathFromRoot) {
    const absolutePath = resolve(ConfigService.getConfigRoot(), relativePathFromRoot)
    const fileContent = readFileSync(absolutePath, 'utf-8')
    return JSON.parse(fileContent)
}

function readJsonFromApp(relativePathFromRoot) {
    const absolutePath = resolve(defaultRootPath, relativePathFromRoot)
    const fileContent = readFileSync(absolutePath, 'utf-8')
    return JSON.parse(fileContent)
}

export class ConfigService {
    static getConfigRoot() {
        return configRootPath ?? defaultRootPath
    }

    static setConfigDir(absolutePath) {
        configRootPath = absolutePath
    }

    static load(configType) {
        const relativePath = configPaths[configType]
        if (!relativePath) return null
        try {
            return readJson(relativePath)
        } catch (error) {
            if (error.code === 'ENOENT') return null
            throw error
        }
    }

    static loadSettings() {
        const loaded = ConfigService.load(ConfigType.SETTINGS)
        if (loaded != null) return loaded
        try {
            return ConfigService.loadSettingsDefaults()
        } catch {
            return null
        }
    }

    static loadSettingsDefaults() {
        return readJsonFromApp('configs/settings-defaults.json')
    }

    static saveSettings(updatedSettings) {
        const root = ConfigService.getConfigRoot()
        const configsDir = resolve(root, 'configs')
        if (!existsSync(configsDir)) mkdirSync(configsDir, { recursive: true })
        const absolutePath = resolve(configsDir, 'settings.json')
        const json = JSON.stringify(updatedSettings ?? {}, null, 2)
        writeFileSync(absolutePath, json, 'utf-8')
    }

    static resetSettingsToDefaults() {
        const defaults = ConfigService.loadSettingsDefaults()
        ConfigService.saveSettings(defaults)
        return defaults
    }
}
