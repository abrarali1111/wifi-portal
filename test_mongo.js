const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://abrar2211c_db_user:Wellcom3@cluster0.jjztyoi.mongodb.net/?retryWrites=true&w=majority";

console.log('Testing connection to MongoDB...');
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('SUCCESS: Connected to MongoDB Atlas');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILED: Connection Error Details below:');
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        if (err.reason) console.error('Reason:', err.reason);
        process.exit(1);
    });
