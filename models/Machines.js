const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
    machineId: {
        type: String,
        required: true,
        unique: true,
    },
    machineModel:{
        type: String,
        required: true,
        trim: true,
    },
    MachineType:{
        type: String,
        required: true,
        trim: true,
    },
    MachineStatus:{
        type: String,
        enum :['0','1','2'],
        default: '0',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    temp_dht: Number,
    temp_ds: Number,
    vib_rms: Number,
    light: Number,
    remainingCycles: Number,
    daysToFailure: Number,
    failureProbability: Number,
    predictionStatus: String

});




module.exports = mongoose.model('Machine', machineSchema);