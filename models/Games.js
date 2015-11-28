var mongoose = require('mongoose');

var GameSchema = new mongoose.Schema({
    bggId: String,
    name: String,
    thumbnail: String,
    image: String
});

mongoose.model('Game', GameSchema);