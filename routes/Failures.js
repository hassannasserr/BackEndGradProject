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

// Get all failure reports
router.get('/failures', async (req, res) => {
    try {   
        const failures = await Failures.find();
        res.status(200).json(failures);
    } catch (error) {
        res.status(500).send(error);
    }                       
});

// Get failure by reportedBy email
router.get('/failures/reportedBy/:email', async (req, res) => {
    try {   
        const email = req.params.email;
        const failures = await Failures.find({ reportedBy: email });
        res.status(200).json(failures);
    } catch (error) {
        res.status(
500).send(error);
    }   
});

// Get Failure by assignedTo email
router.get('/failures/assignedTo/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const failures = await Failures.find({ assignedTo: email });
        res.status(200).json(failures);
    } catch (error) {
        res.status(500). send(error);
    }
});

// Update failure status
router.patch('/failures/:id/status', async (req, res) => {
    try {
        const failureId = req.params.id;
        const newStatus = req.body.status;
        const failure = await Failures.findByIdAndUpdate(failureId, { status: newStatus }, { new: true });
        if (!failure) {
            return res.status(404).json({ message: "Failure not found" });
        }
        res.status(200).json({ message: "Status updated successfully", failure });
    } catch (error) {
        res.status(400).send(error);
    }
});

// Get Critical failures
router.get('/failures/status/critical', async (req, res) => {
    try {
        const failures = await Failures.find({ status: 'Critical' });
        res.status(200).json(failures);
    } catch (error) {
        res.status(500).send(error);
    }
});
module.exports = router;