var mongoose = require('mongoose');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var cfg = require('../config/env/development');

var UserSchema = new mongoose.Schema({
    username: {type: String, lowercase: true, unique:true},
    hash: String,
    salt: String,
    provider: String,
    googleId: String,
    displayName: String
});

UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');

    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};

UserSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');

    return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {
    var today = new Date();
    var exp = new Date(today);

    exp.setDate(today.getDate() + 60);
    console.log('hey..');

    return jwt.sign({
        _id: this.id,
        exp: parseInt(exp.getTime() / 1000), 
        displayName: this.displayName
    }, cfg.localSecret);
};

mongoose.model('User', UserSchema);