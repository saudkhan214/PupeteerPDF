var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var FileStructure = new Schema({
    fileName: String,
    uniqueFileName: String,
    uniqueId: String
})

module.exports = mongoose.model('FileStructure', FileStructure);