const express = require('express');
const router = express.Router();
const Failures = require('../models/Failures');
const Machines = require('../models/Machines');

// Create a new failure report
router.post('/failures', async (req, res) => {
    try {
        // Check if machine ID exists
        const machineId = req.body.machineId;
        if (!machineId) {
            return res.status(400).json({ message: "Machine ID is required" });
        }

        const machine = await Machines.findById(machineId);
        if (!machine) {
            return res.status(404).json({ message: "Machine not found" });
        }

        const failure = new Failures(req.body);
        await failure.save();
        res.status(201).json({ message: "Failure created successfully", failure });
    } catch (error) {
        res.status(400).send(error);
    }
});

module.exports = router;