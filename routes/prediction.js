const express = require('express');
const axios = require('axios');
const router = express.Router();

const PREDICTION_API_BASE_URL = 'https://tasss11-lstm-model.hf.space/gradio_api/call/predict_engine';

const parseSsePrediction = (sseText) => {
    if (typeof sseText !== 'string') return null;

    const dataMatches = [...sseText.matchAll(/^data:\s*(.+)$/gm)];
    for (let index = dataMatches.length - 1; index >= 0; index -= 1) {
        const candidate = dataMatches[index][1]?.trim();
        if (!candidate) continue;
        try {
            return JSON.parse(candidate);
        } catch (parseError) {
            continue;
        }
    }

    return null;
};

// Prediction endpoint (2-step Gradio flow)
router.post('/predict', async (req, res) => {
    try {
        console.log('Prediction request received');
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('Request body:', req.body);

        const { data } = req.body;

        if (!Array.isArray(data)) {
            return res.status(400).json({
                error: 'Invalid payload',
                message: 'Request body must include a data array'
            });
        }

        if (data.length !== 10) {
            return res.status(400).json({
                error: 'Invalid payload length',
                message: 'data must contain exactly 10 numeric values'
            });
        }

        const nonNumericIndexes = data
            .map((value, index) => ({ value, index }))
            .filter(item => typeof item.value !== 'number' || Number.isNaN(item.value))
            .map(item => item.index);

        if (nonNumericIndexes.length > 0) {
            return res.status(400).json({
                error: 'Invalid data types',
                message: 'All data values must be numbers',
                invalidIndexes: nonNumericIndexes
            });
        }

        console.log('Step 1: requesting event_id from prediction service');

        const startResponse = await axios.post(
            PREDICTION_API_BASE_URL,
            { data },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        const eventId = startResponse?.data?.event_id;

        if (!eventId) {
            return res.status(502).json({
                error: 'Prediction service error',
                message: 'No event_id returned from prediction service',
                serviceResponse: startResponse.data
            });
        }

        console.log(`Step 2: fetching prediction result for event_id=${eventId}`);

        const resultResponse = await axios.get(
            `${PREDICTION_API_BASE_URL}/${eventId}`,
            {
                headers: {
                    Accept: 'text/event-stream'
                },
                responseType: 'text',
                timeout: 30000
            }
        );

        const rawResult = resultResponse.data;
        const parsedPrediction = parseSsePrediction(rawResult);

        return res.json({
            success: true,
            event_id: eventId,
            inputData: data,
            prediction: parsedPrediction,
            rawResponse: rawResult
        });

    } catch (error) {
        console.error('Prediction error:', error.message);

        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({
                error: 'Request timeout',
                message: 'The prediction service took too long to respond'
            });
        }

        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Prediction service error',
                message: error.response.data || 'External API error',
                status: error.response.status
            });
        }

        if (error.request) {
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'Cannot connect to prediction service'
            });
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

module.exports = router;