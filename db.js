const mongoose = require('mongoose');
var dbURI = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD);
mongoose.connect(dbURI, { useNewUrlParser: true ,useUnifiedTopology: true});

// CONNECTION EVENTS
mongoose.connection.on('connected', function () {
    console.log('Mongoose connected to MongoDB');
});
mongoose.connection.on('error', function (err) {
    console.log('Mongoose connection error: ' + err);
});
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose disconnected');
});

require('./models/TokenAuthentication');