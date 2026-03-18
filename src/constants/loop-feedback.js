/** repeat mode after toggling loop (YoutubeHandler detection) */
export const LoopFeedbackState = {
    NO_REPEAT: 'noRepeat',
    REPEAT_ALL: 'repeatAll',
    REPEAT_ONE: 'repeatOne',
}

const basenameByState = {
    [LoopFeedbackState.NO_REPEAT]: 'no-repeat',
    [LoopFeedbackState.REPEAT_ALL]: 'repeat-all',
    [LoopFeedbackState.REPEAT_ONE]: 'repeat-one',
}

export function loopFeedbackIconBasename(state) {
    return basenameByState[state] ?? null
}

const statesInCycleOrder = [LoopFeedbackState.NO_REPEAT, LoopFeedbackState.REPEAT_ALL, LoopFeedbackState.REPEAT_ONE]

export function repeatStateFromOrdinal(ordinal) {
    const index = ((Number(ordinal) % 3) + 3) % 3
    return statesInCycleOrder[index]
}

export function ordinalFromRepeatState(state) {
    const index = statesInCycleOrder.indexOf(state)
    return index >= 0 ? index : null
}
