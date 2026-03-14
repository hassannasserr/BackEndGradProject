const express = require('express');
const axios = require('axios');
const Machines = require('../models/Machines');
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

const extractPredictionMetrics = (predictionPayload) => {
    const text = Array.isArray(predictionPayload)
        ? String(predictionPayload[0] || '')
        : String(predictionPayload || '');

    const readNumber = (regex) => {
        const match = text.match(regex);
        return match ? Number.parseFloat(match[1]) : null;
    };

    const statusMatch = text.match(/Status:\s*([^\n\r]+)/i);

    return {
        remainingCycles: readNumber(/Remaining\s+Cycles:\s*([-+]?\d*\.?\d+)/i),
        daysToFailure: readNumber(/Days\s+to\s+Failure:\s*([-+]?\d*\.?\d+)/i),
        failureProbability: readNumber(/Failure\s+Probability:\s*([-+]?\d*\.?\d+)/i),
        predictionStatus: statusMatch ? statusMatch[1].trim() : null
    };
};

// Prediction endpoint (2-step Gradio flow)
router.post('/predict', async (req, res) => {
    try {
        console.log('Prediction request received');
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('Request body:', req.body);

        const { machineId, data } = req.body;

        if (!machineId) {
            return res.status(400).json({
                error: 'Invalid payload',
                message: 'Request body must include machineId'
            });
        }

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
        const metrics = extractPredictionMetrics(parsedPrediction);

        let machine;
        if (String(machineId).match(/^[0-9a-fA-F]{24}$/)) {
            machine = await Machines.findById(machineId);
        }
        if (!machine) {
            machine = await Machines.findOne({ machineId: String(machineId) });
        }

        if (!machine) {
            return res.status(404).json({
                error: 'Machine not found',
                message: 'No machine exists for the provided machineId',
                event_id: eventId,
                prediction: parsedPrediction,
                rawResponse: rawResult
            });
        }

        machine.remainingCycles = metrics.remainingCycles;
        machine.daysToFailure = metrics.daysToFailure;
        machine.failureProbability = metrics.failureProbability;
        machine.predictionStatus = metrics.predictionStatus;
        machine.updatedAt = Date.now();
        await machine.save();

        return res.json({
            success: true,
            event_id: eventId,
            machine: {
                _id: machine._id,
                machineId: machine.machineId
            },
            inputData: data,
            prediction: parsedPrediction,
            savedMetrics: metrics,
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