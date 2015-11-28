var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var parseString = require('xml2js').parseString;
require('../models/Posts');
require('../models/Comments');
require('../models/Games');
require('../models/Runs');
require('../models/Rankings');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
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

router.get('/runs', function(req,res,next) {
    Run.find(function(err, runs){
        if(err){ return next(err); }

        res.json(runs);
    });
});

router.get('/runs/:run', function(req, res) {
    req.run.populate('comments', function(err, run) {
        if (err) { return next(err); }

        res.json(req.run);
    });
});

router.post('/runs', function(req, res, next) {
    var run = new Run(req.body);
    var games = [];
    var rankings = [];

    tryUntilSuccess(run.bggLink, function(err, jsonGames) {
        if(err){ return next(err); }

        var gameTasks = [];

        for (index in jsonGames.items.item){
            var gameEntry = jsonGames.items.item[index];
            var isOwned = gameEntry.status[0].$.own;
            if (isOwned === '1'){
                var game = new Game({
                    bggId: gameEntry.$.objectid,
                    gameName: gameEntry.name,
                    thumbnail: gameEntry.thumbnail[0],
                    image: gameEntry.image[0]
                });
                gameTasks.push(function(callback){
                    getOrSaveGame(game, function(err, gameFromDb) {
                        games.push(gameFromDb);
                        callback();
                    });
                });
            }
        }

        async.parallel(gameTasks, function() {
            console.dir('Games saved!');
            console.log(games.length);
            var rankingTasks = [];

            for (game in games) {
                var ranking = new Ranking({game: game});
                rankingTasks.push(function(callback){
                    ranking.save(function(err, savedRanking) {
                        rankings.push(savedRanking);
                        callback();
                    });
                });
            }

            async.parallel(rankingTasks, function() {
                console.dir('Rankings saved!');
                console.log(rankings.length)

                run.status = 'Ready';
                run.rankings = rankings;

                run.save(function(err, savedRun) {
                    if(err){ return next(err); }

                    res.json(run);
                })
            });            
        });
    }); 
});

router.get('/posts', function(req, res, next) {
    Post.find(function(err, posts){
        if(err){ return next(err); }

        res.json(posts);
    });
});

router.post('/posts', function(req, res, next) {
    var post = new Post(req.body);

    post.save(function(err, post){
        if(err){ return next(err); }

        res.json(post);
    });
});

router.param('post', function(req, res, next, id) {
    var query = Post.findById(id);

    query.exec(function (err, post) {
        if(err) { return next(err); }
        if(!post) { return next(new Error('can\'t find post')); }

        req.post = post;
        return next();
    });
});

router.param('comment', function(req, res, next, id) {
    var query = Comment.findById(id);

    query.exec(function (err, comment) {
        if(err) { return next(err); }
        if(!comment) { return next(new Error('can\'t find comment')); }

        req.comment = comment;
        return next();
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

router.get('/posts/:post', function(req, res) {
    req.post.populate('comments', function(err, post) {
        if (err) { return next(err); }

        res.json(req.post);
    });
});

router.put('/posts/:post/upvote', function(req, res, next) {
    req.post.upvote(function(err, post) {
        if (err) { return next(err); }

        res.json(post);
    });
});

router.post('/posts/:post/comments', function(req, res, next) {
    var comment = new Comment(req.body);
    comment.post = req.post;

    comment.save(function(err, comment) {
        if (err) { return next(err); }

        req.post.comments.push(comment);
        req.post.save(function(err, post) {
            if (err) { return next(err); }

            res.json(comment);
        });
    });
});

router.put('/posts/:post/comments/:comment/upvote', function(req, res, next) {
    req.comment.upvote(function(err, comment) {
        if (err) { return next(err); }

        res.json(comment);
    });
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
    var resGame = null;
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