require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const dbUri = process.env.MONGODB_URI;
const bcrypt = require('bcrypt'); 
const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/auth'); 
const predictionRoutes = require('./routes/prediction');
const MachinesRoutes = require('./routes/Machines');
const FailureRoutes = require('./routes/Failures');
// Mongoose Connection
if (!dbUri) {
  console.error('Missing `MONGODB_URI` in environment. Please set it in `.env`.');
  process.exit(1);
}

// Helpful connection options to avoid common Windows/DNS issues
const mongooseOptions = {
  serverSelectionTimeoutMS: 8000,
  directConnection: false,
  // Force IPv4 to avoid IPv6 DNS edge cases on some networks
  family: 4,
};

mongoose
  .connect(dbUri, mongooseOptions)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => {
    console.error('MongoDB connection error:', err?.message || err);
    // Provide a hint if SRV query fails
    if (String(err?.message).includes('querySrv') || String(err?.message).includes('_mongodb._tcp')) {
      console.error(
        'SRV lookup failed. Ensure your URI uses `mongodb+srv://` and that DNS/UDP is allowed. '
        + 'Try forcing IPv4 (done), or use a non-SRV seed list URI from Atlas as a workaround.'
      );
    }
    process.exit(1);
  });


app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


// Route Mounting
app.use('/api', authRoutes); // All auth routes start with /api
app.use('/api', predictionRoutes); // All prediction routes start with /api
app.use('/api', MachinesRoutes); // All machine routes start with /api
app.use('/api', FailureRoutes); // All failure routes start with /api


// Start Server
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on http://localhost:${PORT}`));