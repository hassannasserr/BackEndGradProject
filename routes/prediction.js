const express = require('express');
const axios = require('axios');
const router = express.Router();

// Prediction endpoint
router.post('/predict', async (req, res) => {
    try {
        // Log incoming request for debugging
        console.log('Prediction request received');
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('Request body:', req.body);
        // Extract sensor data from request body
        const {
            temperature,
            pressure,
            vibration,
            humidity,
            rotational_speed,
            torque,
            tool_wear,
            air_temperature,
            process_temperature
        } = req.body;

        // Validate required fields
        const requiredFields = [
            'temperature', 'pressure', 'vibration', 'humidity',
            'rotational_speed', 'torque', 'tool_wear', 
            'air_temperature', 'process_temperature'
        ];

        const missingFields = requiredFields.filter(field => 
            req.body[field] === undefined || req.body[field] === null
        );

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields: missingFields
            });
        }

        // Validate that all values are numbers
        const invalidFields = requiredFields.filter(field => 
            typeof req.body[field] !== 'number'
        );

        if (invalidFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid data types. All sensor values must be numbers',
                invalidFields: invalidFields
            });
        }

        // Prepare data for external API
        const predictionData = {
            temperature,
            pressure,
            vibration,
            humidity,
            rotational_speed,
            torque,
            tool_wear,
            air_temperature,
            process_temperature
        };

        console.log('Sending prediction request with data:', predictionData);

        // Call external prediction API
        const response = await axios.post(
            'https://tasneem2.pythonanywhere.com/predict',
            predictionData,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 seconds timeout
            }
        );

        console.log('Prediction response:', response.data);

        // Return the prediction result
        res.json({
            success: true,
            prediction: response.data,
            inputData: predictionData
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
            // The external API responded with an error
            return res.status(error.response.status).json({
                error: 'Prediction service error',
                message: error.response.data || 'External API error',
                status: error.response.status
            });
        }

        if (error.request) {
            // Network error
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'Cannot connect to prediction service'
            });
        }

        // Other errors
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

module.exports = router;