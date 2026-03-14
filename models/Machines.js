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
    Total_Temperature: Number,
    HPC_Pressure: Number,
    Static_Pressure: Number,
    Rotational_Speed: Number,
    Exhaust_Temperature: Number,
    Vibration_Equivalent: Number,
    air_temperature: Number,
    process_temperature: Number,
    remainingCycles: Number,
    daysToFailure: Number,
    failureProbability: Number,
    predictionStatus: String

});


/**
 *"temperature":48.4,
  "pressure":10,
  "vibration":5.5,
  "humidity":46.7,
  "rotational_speed":1613,
  "torque":33.2,
  "tool_wear":16,
  "air_temperature":24.4,
  "process_temperature":34.2
 */


module.exports = mongoose.model('Machine', machineSchema);