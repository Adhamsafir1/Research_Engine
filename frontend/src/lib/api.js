import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000', // Update this based on the actual backend URL
});

export const vapiApi = {
    // Save a single voice message transcript
    addMessage: async (messageData) => {
        const response = await api.post('/vapi/messages', messageData);
        return response.data;
    },
    // Save an entire conversation's messages at once (on call end)
    addBatchMessages: async (batchData) => {
        const response = await api.post('/vapi/batch-messages', batchData);
        return response.data;
    },
    // Fetch stored messages for a conversation
    getMessages: async (conversationId, vapiSessionId = null) => {
        let url = `/vapi/conversations/${conversationId}/messages`;
        if (vapiSessionId) url += `?vapi_session_id=${vapiSessionId}`;
        const response = await api.get(url);
        return response.data;
    },
    // Record session start (for billing)
    startSession: async (sessionData) => {
        const response = await api.post('/vapi/sessions/start', sessionData);
        return response.data;
    },
    // Record session end with duration (for billing)
    endSession: async (sessionData) => {
        const response = await api.put('/vapi/sessions/end', sessionData);
        return response.data;
    },
    // Get user's voice analytics
    getAnalytics: async () => {
        const response = await api.get('/vapi/analytics');
        return response.data;
    }
};

export default api;
