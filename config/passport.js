var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var mongoose = require('mongoose');
require('../models/Users');
var User = mongoose.model('User');
var cfg = require('../config/env/development');

passport.serializeUser(function(user, done) {
        done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findOne({username: 'troll'}, function(err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

passport.use(new GoogleStrategy({
    clientID: cfg.googleClientId,
    clientSecret: cfg.googleClientSecret,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      User.findOne({'provider': 'google', 'googleId': profile.id}, function(err, user) {
        if (err) {
          return done(err);
        }

        if (user) {
          return done(null, user);
        } else {
          var newUser = new User();

          newUser.provider = 'google';
          newUser.googleId = profile.id;
          newUser.displayName = profile.displayName;

          newUser.save(function(err, user) {
            if (err) {
              throw err;
            }
            return done(null, user);
          });
        }
      });
    });
  }
));