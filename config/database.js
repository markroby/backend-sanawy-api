const mongoose = require('mongoose');

async function connectDB(){
  const uri = process.env.MONGODB_URI;
  if(!uri) throw new Error('MONGODB_URI not defined in env');
  try {
    await mongoose.connect(uri, {
      // useNewUrlParser: true, useUnifiedTopology: true - options are defaults in newer mongoose
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

module.exports = connectDB;
