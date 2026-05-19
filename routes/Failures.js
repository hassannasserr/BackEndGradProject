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

        machine.MachineStatus = '1';
        machine.updatedAt = Date.now();
        await machine.save();

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

// Get failure counts per month (optionally by year)
router.get('/failures/stats/monthly', async (req, res) => {
    try {
        const requestedYear = req.query.year ? Number.parseInt(req.query.year, 10) : new Date().getFullYear();

        if (Number.isNaN(requestedYear) || requestedYear < 1970 || requestedYear > 3000) {
            return res.status(400).json({ message: 'Invalid year query parameter' });
        }

        const startDate = new Date(requestedYear, 0, 1);
        const endDate = new Date(requestedYear + 1, 0, 1);

        const monthlyAggregation = await Failures.aggregate([
            {
                $match: {
                    DateReported: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: { $month: '$DateReported' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const monthlyMap = new Map(monthlyAggregation.map(item => [item._id, item.count]));
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const monthly = monthNames.map((monthName, index) => {
            const month = index + 1;
            return {
                month,
                monthName,
                count: monthlyMap.get(month) || 0
            };
        });

        const total = monthly.reduce((sum, item) => sum + item.count, 0);

        return res.status(200).json({
            year: requestedYear,
            total,
            monthly
        });
    } catch (error) {
        return res.status(500).send(error);
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