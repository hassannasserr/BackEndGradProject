require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const dbUri = process.env.MONGODB_URI ;
const bcrypt = require('bcrypt'); 
const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/auth'); 
const predictionRoutes = require('./routes/prediction');
const MachinesRoutes = require('./routes/Machines');
// Mongoose Connection
mongoose.connect(dbUri)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); 
  });


app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


// Route Mounting
app.use('/api', authRoutes); // All auth routes start with /api
app.use('/api', predictionRoutes); // All prediction routes start with /api
app.use('/api', MachinesRoutes); // All machine routes start with /api





// Start Server
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on http://localhost:${PORT}`));