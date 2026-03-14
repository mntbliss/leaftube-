import * as LoggerService from '../../src/services/LoggerService.js'
import * as LogBufferService from '../services/LogBufferService.js'

function normalizeToError(...args) {
    const last = args[args.length - 1]
    if (last instanceof Error) return last
    if (args.length === 1 && typeof args[0] === 'string') return new Error(args[0])
    return new Error(args.map(arg => (arg instanceof Error ? arg.message : String(arg))).join(' '))
}

export function errorWithBuffer(...args) {
    LoggerService.error(...args)
    LogBufferService.addError(normalizeToError(...args))
}
