var mongoose = require('mongoose');

var RunSchema = new mongoose.Schema({
    status: String,
    username: String,
    bggLink: String,
    description: String,
    owner: String,// {type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rankings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ranking' }]
});

mongoose.model('Run', RunSchema);