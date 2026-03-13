import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFileUrl = import.meta.url
const currentFilePath = fileURLToPath(currentFileUrl)
const currentDirPath = dirname(currentFilePath)
const rootDirPath = resolve(currentDirPath, '..', '..')

const ConfigType = {
    SETTINGS: 'settings',
    PROFILE: 'profile',
}

function readJson(relativePathFromRoot) {
    const absolutePath = resolve(rootDirPath, relativePathFromRoot)
    const fileContent = readFileSync(absolutePath, 'utf-8')
    return JSON.parse(fileContent)
}

export class ConfigService {
    static load(configType) {
        if (configType === ConfigType.SETTINGS) return readJson('configs/settings.json')
        if (configType === ConfigType.PROFILE) return readJson('configs/profile.json')
        return null
    }

    static loadSettings() {
        return ConfigService.load(ConfigType.SETTINGS)
    }

    static loadProfile() {
        return ConfigService.load(ConfigType.PROFILE)
    }
}

export { ConfigType }
