const express = require('express');
const router = express.Router();
const Machines= require('../models/Machines');
const axios = require('axios');

// add a new machine
router.post('/machines', async (req, res) => {
    try {
        const { machineId, machineModel, MachineType } = req.body;
        const newMachine = new Machines({ machineId, machineModel, MachineType });
        await newMachine.save();
        res.status(201).json({ message: 'Machine added successfully', machine: newMachine });
    } catch (error) {
        console.error('Error adding machine:', error);
        res.status(500).json({ message: 'Server error while adding machine' });
    }
});
// get all machines
router.get('/machines', async (req, res) => {
    try {
        const machines = await Machines.find();
        res.status(200).json(machines);
    } catch (error) {
        console.error('Error fetching machines:', error);
        res.status(500).json({ message: 'Server error while fetching machines' });
    }
});

// get a machine by ID
router.get('/machines/:id', async (req, res) => {
    try {
        const machine = await Machines.findById(req.params.id);
        if (!machine) {
            return res.status(404).json({ message: 'Machine not found' });
        }
        res.status(200).json(machine);
    } catch (error) {
        console.error('Error fetching machine:', error);
        res.status(500).json({ message: 'Server error while fetching machine' });
    }
});
// add machine data 
router.post('/machines/:id/data', async (req, res) => {
    try {
        // Try to find by MongoDB ObjectId first, then by machineId
        let machine;
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            // It's a valid ObjectId
            machine = await Machines.findById(req.params.id);
        } else {
            // It's likely a machineId
            machine = await Machines.findOne({ machineId: req.params.id });
        }
        
        if (!machine) {
            return res.status(404).json({ message: 'Machine not found' });
        }
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
        machine.temperature = temperature;
        machine.pressure = pressure;
        machine.vibration = vibration;
        machine.humidity = humidity;
        machine.rotational_speed = rotational_speed;
        machine.torque = torque;
        machine.tool_wear = tool_wear;
        machine.air_temperature = air_temperature;
        machine.process_temperature = process_temperature;
        machine.updatedAt = Date.now();
        
        // Call prediction API directly
        try {
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
            
            console.log('Calling prediction API with data:', predictionData);
            
            const response = await axios.post(
                'https://tasneem2.pythonanywhere.com/predict',
                predictionData,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );
            
            console.log('Prediction API response:', JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.failure_status !== undefined) {
                const prediction = response.data.failure_status;
                console.log('Extracted failure_status:', prediction);
                console.log('Current MachineStatus before update:', machine.MachineStatus);
                
                // Set MachineStatus based on prediction value
                if (prediction === 1 || prediction === '1') {
                    machine.MachineStatus = '1'; // Machine failure predicted
                    console.log('Setting MachineStatus to "1" (failure predicted)');
                } else if (prediction === 0 || prediction === '0') {
                    machine.MachineStatus = '0'; // Machine operating normally
                    console.log('Setting MachineStatus to "0" (normal operation)');
                } else {
                    // For any other prediction values, default to normal operation
                    machine.MachineStatus = '0';
                    console.warn('Unexpected prediction value:', prediction, 'Defaulting to status 0');
                }
                console.log(`Machine status updated to: ${machine.MachineStatus}`);
            } else {
                console.error('Unexpected API response structure:', response.data);
                console.log('Available keys in response.data:', Object.keys(response.data || {}));
            }
        } catch (predictionError) {
            console.error('Prediction API error:', predictionError.message);
            console.error('Full error:', predictionError);
            // Continue without prediction if API fails
        }
        await machine.save();
        res.status(200).json({ message: 'Machine data updated successfully', machine });
    } catch (error) {
        console.error('Error updating machine data:', error);
        res.status(500).json({ message: 'Server error while updating machine data' });
    }
});
module.exports = router;