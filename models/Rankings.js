var mongoose = require('mongoose');

var RankingSchema = new mongoose.Schema({
    score: {type: Number, default: 1000},
    game: {type: mongoose.Schema.Types.ObjectId, ref: 'Game' }
});

mongoose.model('Ranking', RankingSchema);