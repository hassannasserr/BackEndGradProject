const express = require('express');
const axios = require('axios');
const Machines = require('../models/Machines');
const router = express.Router();

const PREDICTION_API_BASE_URL = 'https://huggingface.co/spaces/tasss11/lstmmodelno';

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

// Prediction endpoint — call HuggingFace Space and save metrics
router.post('/predict', async (req, res) => {
    try {
        console.log('Prediction request received');

        const { machineId, temp_dht, temp_ds, vib_rms, light } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'Invalid payload', message: 'Request body must include machineId' });
        }

        const inputs = { temp_dht, temp_ds, vib_rms, light };
        const nonNumeric = Object.entries(inputs)
            .filter(([_, v]) => typeof v !== 'number' || Number.isNaN(v))
            .map(([k]) => k);

        if (nonNumeric.length > 0) {
            return res.status(400).json({ error: 'Invalid input types', message: 'All sensor inputs must be numbers', invalidFields: nonNumeric });
        }

        // Prepare payload for the Space. Many Gradio-based Spaces accept {data: [...]}
        const payload = { data: [temp_dht, temp_ds, vib_rms, light] };

        const apiUrl = `${PREDICTION_API_BASE_URL}/api/predict`;

        const response = await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        // The Space may return {data: [...]} or a plain value — handle both.
        const servicePayload = response?.data?.data ?? response?.data ?? null;

        const metrics = extractPredictionMetrics(servicePayload);

        let machine;
        if (String(machineId).match(/^[0-9a-fA-F]{24}$/)) {
            machine = await Machines.findById(machineId);
        }
        if (!machine) {
            machine = await Machines.findOne({ machineId: String(machineId) });
        }

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found', message: 'No machine exists for the provided machineId', prediction: servicePayload });
        }

        machine.remainingCycles = metrics.remainingCycles;
        machine.daysToFailure = metrics.daysToFailure;
        machine.failureProbability = metrics.failureProbability;
        machine.predictionStatus = metrics.predictionStatus;
        machine.updatedAt = Date.now();
        await machine.save();

        return res.json({ success: true, machine: { _id: machine._id, machineId: machine.machineId }, input: inputs, prediction: servicePayload, savedMetrics: metrics });

    } catch (error) {
        console.error('Prediction error:', error && error.message ? error.message : error);

        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({ error: 'Request timeout', message: 'The prediction service took too long to respond' });
        }

        if (error.response) {
            return res.status(error.response.status || 502).json({ error: 'Prediction service error', message: error.response.data || 'External API error', status: error.response.status });
        }

        if (error.request) {
            return res.status(503).json({ error: 'Service unavailable', message: 'Cannot connect to prediction service' });
        }

        return res.status(500).json({ error: 'Internal server error', message: error.message || String(error) });
    }
});

module.exports = router;