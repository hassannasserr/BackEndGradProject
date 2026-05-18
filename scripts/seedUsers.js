require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/Users');

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

const usersToSeed = [
  {
    fullName: 'Admin User',
    email: 'admin@fmps1.local',
    password: 'Admin@123',
    role: 'admin',
    isVerified: true,
  },
  {
    fullName: 'Technician User',
    email: 'technician@fmps1.local',
    password: 'Technician@123',
    role: 'technician',
    isVerified: true,
  },
  {
    fullName: 'Engineer User',
    email: 'engineer@fmps1.local',
    password: 'Engineer@123',
    role: 'engineer',
    isVerified: true,
  },
  {
    fullName: 'Manager User',
    email: 'manager@fmps1.local',
    password: 'Manager@123',
    role: 'manager',
    isVerified: true,
  },
];

async function upsertUsers() {
  await mongoose.connect(dbUri, mongooseOptions);

  for (const userData of usersToSeed) {
    const existing = await User.findOne({ email: userData.email });

    if (existing) {
      existing.fullName = userData.fullName;
      existing.role = userData.role;
      existing.password = userData.password;
      existing.isVerified = userData.isVerified;
      await existing.save();
      console.log(`Updated user: ${userData.email} (${userData.role})`);
    } else {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${userData.email} (${userData.role})`);
    }
  }

  console.log('Finished seeding users.');
}

upsertUsers()
  .catch((error) => {
    console.error('Failed to seed users:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
