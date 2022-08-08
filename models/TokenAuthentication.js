var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tokenAuthentication = new Schema({
    token: String,
    requestLimit: Number,
    remainingRequests:Number,
    whenCreated:Date,
    appName:String
  })

module.exports = mongoose.model('TokenAuthentication', tokenAuthentication );