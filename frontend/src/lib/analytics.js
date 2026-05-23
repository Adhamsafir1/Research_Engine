export const ANALYTICS_EVENTS = {
    START_VOICE_AGENT: 'START_VOICE_AGENT',
    STOP_VOICE_AGENT: 'STOP_VOICE_AGENT',
};

export const trackEvent = (eventName, data) => {
    console.log(`[ANALYTICS] ${eventName}`, data);
};
