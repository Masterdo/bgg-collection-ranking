var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var parseString = require('xml2js').parseString;
require('../models/Games');
require('../models/Runs');
require('../models/Rankings');
var Game = mongoose.model('Game');
var Run = mongoose.model('Run');
var Ranking = mongoose.model('Ranking');
var http = require('http');
var util = require('util');
var async = require('async');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.put('/rankings/:ranking/win/:score', function(req, res, next) {
    console.log('Trying to win..');
    req.ranking.win(req.score, function(err, ranking) {
        if (err) { return next(err); }

        res.json(ranking);
    });
});

router.put('/rankings/:ranking/lose/:score', function(req, res, next) {
    console.log('Trying to lose..');
    req.ranking.lose(req.score, function(err, ranking) {
        if (err) { return next(err); }

        res.json(ranking);
    });
});

router.get('/runs', function(req, res, next) {
    Run.find(function(err, runs){
        if(err){ return next(err); }

        res.json(runs);
    });
});

router.get('/runs/:run', function(req, res, next) {
    req.run.populate('rankings', function(err, run) {

        var populateTasks = [];
        async.each(run.rankings, function(ranking, forCallback) {
            populateTasks.push(function(saveCallback){
                ranking.populate('game', function(err, ranking) {
                    saveCallback();
                    forCallback();
                });
            });
        });

        async.parallel(populateTasks, function(err) {
            if(err){ return next(err); }

            res.json(run);
        });
    });
});

router.post('/runs', function(req, res, next) {
    var games = [];
    var savedGames = [];
    var run = new Run(req.body);

    /*
        Sequence of events to:
            - Load Games from BGG
            - Persist them in DB if they are new to us
            - Initialize rankings
            - Save the run
    */
    async.waterfall([
        function(callback) {
            // first, load game collection data from BGG
            tryUntilSuccess(run.bggLink, function(err, jsonGames) {
                for (index in jsonGames.items.item){
                    var gameEntry = jsonGames.items.item[index];
                    var isOwned = gameEntry.status[0].$.own;
                    if (isOwned === '1'){
                        var game = new Game({
                            bggId: gameEntry.$.objectid,
                            name: gameEntry.name[0]._,
                            thumbnail: gameEntry.thumbnail[0],
                            image: gameEntry.image[0]
                        });
                        games.push(game);
                    }
                }
                callback(null);
            });
        },
        function(callback) {
            // Save games in DB if they don't exist already
            var gameSaveTasks = [];
            async.each(games, function(game, forCallback) {
                gameSaveTasks.push(function(saveCallback){
                    getOrSaveGame(game, function(err, gameFromDb) {
                        savedGames.push(gameFromDb);
                        saveCallback();
                        forCallback();
                    });
                });
            });

            async.parallel(gameSaveTasks, function() {
                callback(null);
            });
        },
        function(callback) {
            // create rankings and load them in the run
            var rankingSaveTasks = [];
            async.each(savedGames, function(game, forCallback) {
                rankingSaveTasks.push(function(saveCallback){
                    var ranking = new Ranking({game: game});
                    ranking.save(function(err, savedRanking) {
                        run.rankings.push(savedRanking);
                        saveCallback();
                        forCallback();
                    });
                });
            });

            async.parallel(rankingSaveTasks, function() {
                callback(null);
            });
        },
        function(callback) {
            // save the run
            var runSaveTask = [];
            run.status = 'Ready';
            runSaveTask.push(function(runCallback){
                run.save(function(err, savedRun) {
                    runCallback();
                });
            });

            async.parallel(runSaveTask, function() {
                callback(null);
            });

        }
    ], function(err){    
        if (err) { return next(err); }
        res.json(run);
    });
});

router.param('game', function(req, res, next, id) {
    var query = Game.findById(id);

    query.exec(function (err, game) {
        if(err) { return next(err); }
        if(!game) { return next(new Error('can\'t find game')); }

        req.game = game;
        return next();
    });
});

router.param('run', function(req, res, next, id) {
    var query = Run.findById(id);

    query.exec(function (err, run) {
        if(err) { return next(err); }
        if(!run) { return next(new Error('can\'t find run')); }

        req.run = run;
        return next();
    });
});

router.param('ranking', function(req, res, next, id) {
    var query = Ranking.findById(id);

    query.exec(function (err, ranking) {
        if(err) { return next(err); }
        if(!ranking) { return next(new Error('can\'t find ranking')); }

        req.ranking = ranking;
        return next();
    });
});

router.param('score', function(req, res, next, score) {
    req.score = score;
    return next();
});

function tryUntilSuccess(url, callback){
    var req = http.get(url, function(res) {
        var xmlAccumulator = '';
        res.on('data', function(msg) {
            xmlAccumulator += msg.toString('utf-8');
        });
        res.on('end', function() {
            if(res.statusCode === 202) {
                tryUntilSuccess(url, callback);
            } else if(res.statusCode === 200) {
                parseString(xmlAccumulator, function (err, result) {
                    callback(null, result);
                });
            }
        });
    });

    req.on('error', function(e) {
        callback(e);
    })
}

function getOrSaveGame(game, cb){
    Game.find({bggId: game.bggId}, function(err, results){
        if (err) { cb(err); }
        
        if (results.length === 0) {
            game.save(function(err, savedGame) {
            if (err) { cb(err); }
                cb(null, savedGame);
            });
        } else {
            cb(null, results[0]);
        }
    });
}

module.exports = router;