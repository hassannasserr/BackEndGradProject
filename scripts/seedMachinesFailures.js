require('dotenv').config();
const mongoose = require('mongoose');
const Machine = require('../models/Machines');
const Failure = require('../models/Failures');

const dbUri = process.env.MONGODB_URI;

if (!dbUri) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const mongooseOptions = {
  serverSelectionTimeoutMS: 8000,
  directConnection: false,
  family: 4,
};

const machinesToSeed = [
  {
    machineId: 'MCH-1001',
    machineModel: 'X200 Turbo',
    MachineType: 'Compressor',
    MachineStatus: '0',
  },
  {
    machineId: 'MCH-1002',
    machineModel: 'V9 Precision',
    MachineType: 'CNC',
    MachineStatus: '1',
  },
  {
    machineId: 'MCH-1003',
    machineModel: 'HX-Delta',
    MachineType: 'Hydraulic Press',
    MachineStatus: '0',
  },
  {
    machineId: 'MCH-1004',
    machineModel: 'RoboArm A5',
    MachineType: 'Assembly Robot',
    MachineStatus: '2',
  },
];

const failuresToSeed = [
  {
    failureId: 'FLR-2001',
    machineId: 'MCH-1002',
    machineType: 'CNC',
    machineName: 'V9 Precision',
    Description: 'Unexpected spindle vibration exceeded threshold.',
    AssignedTo: 'technician@fmps1.local',
    SeverityLevel: 'Critical',
    ReportedBy: 'manager@fmps1.local',
    status: 'Open',
  },
  {
    failureId: 'FLR-2002',
    machineId: 'MCH-1003',
    machineType: 'Hydraulic Press',
    machineName: 'HX-Delta',
    Description: 'Pressure fluctuation during peak load cycle.',
    AssignedTo: 'engineer@fmps1.local',
    SeverityLevel: 'Medium',
    ReportedBy: 'admin@fmps1.local',
    status: 'Need Review',
  },
  {
    failureId: 'FLR-2003',
    machineId: 'MCH-1001',
    machineType: 'Compressor',
    machineName: 'X200 Turbo',
    Description: 'Temperature sensor drift detected and calibrated.',
    AssignedTo: 'technician@fmps1.local',
    SeverityLevel: 'Low',
    ReportedBy: 'engineer@fmps1.local',
    status: 'Fixed',
  },
  {
    failureId: 'FLR-2004',
    machineId: 'MCH-1004',
    machineType: 'Assembly Robot',
    machineName: 'RoboArm A5',
    Description: 'Intermittent actuator lag and path deviation.',
    AssignedTo: 'manager@fmps1.local',
    SeverityLevel: 'Critical',
    ReportedBy: 'admin@fmps1.local',
    status: 'Need Help',
  },
];

async function upsertMachines() {
  for (const machineData of machinesToSeed) {
    const existing = await Machine.findOne({ machineId: machineData.machineId });

    if (existing) {
      existing.machineModel = machineData.machineModel;
      existing.MachineType = machineData.MachineType;
      existing.MachineStatus = machineData.MachineStatus;
      existing.updatedAt = Date.now();
      await existing.save();
      console.log(`Updated machine: ${machineData.machineId}`);
    } else {
      const machine = new Machine(machineData);
      await machine.save();
      console.log(`Created machine: ${machineData.machineId}`);
    }
  }
}

async function upsertFailures() {
  for (const failureData of failuresToSeed) {
    const existing = await Failure.findOne({ failureId: failureData.failureId });

    if (existing) {
      existing.machineId = failureData.machineId;
      existing.machineType = failureData.machineType;
      existing.machineName = failureData.machineName;
      existing.Description = failureData.Description;
      existing.AssignedTo = failureData.AssignedTo;
      existing.SeverityLevel = failureData.SeverityLevel;
      existing.ReportedBy = failureData.ReportedBy;
      existing.status = failureData.status;
      await existing.save();
      console.log(`Updated failure: ${failureData.failureId}`);
    } else {
      const failure = new Failure(failureData);
      await failure.save();
      console.log(`Created failure: ${failureData.failureId}`);
    }
  }
}

async function seedMachinesAndFailures() {
  await mongoose.connect(dbUri, mongooseOptions);
  await upsertMachines();
  await upsertFailures();
  console.log('Finished seeding machines and failures.');
}

seedMachinesAndFailures()
  .catch((error) => {
    console.error('Failed to seed machines and failures:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
