var mongoose = require('mongoose');

var RankingSchema = new mongoose.Schema({
    score: {type: Number, default: 1000},
    game: {type: mongoose.Schema.Types.ObjectId, ref: 'Game' }
});

RankingSchema.methods.win = function(scoreChange, cb) {
    console.log('Score changed by:' + scoreChange);
    this.score += parseInt(scoreChange);
    this.save(cb);
}

RankingSchema.methods.lose = function(scoreChange, cb) {
    console.log('Score changed by:' + scoreChange);
    this.score -= scoreChange;
    this.save(cb);
}

mongoose.model('Ranking', RankingSchema);