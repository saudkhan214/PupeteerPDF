const express = require('express')
const app = express()
const parser = require('body-parser')
const dotenv = require('dotenv')
const Pdf = require('./routes/pdf')

dotenv.config({ path: './config.env' })
require('./db');
app.use(express.json())
app.use(parser.json())
app.use(parser.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/uploads'));

app.use('/pdf', Pdf)

app.listen(process.env.PORT, function () {
  console.log(`
    ####################################
    🛡️  Server listening on port: ${process.env.PORT} 🛡️
    ####################################
  `);
});