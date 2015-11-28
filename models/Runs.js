var mongoose = require('mongoose');

var RunSchema = new mongoose.Schema({
    status: String,
    username: String,
    bggLink: String,
    description: String,
    rankings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ranking' }]
});

mongoose.model('Run', RunSchema);