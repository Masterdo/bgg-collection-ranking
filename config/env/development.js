var config = module.exports = {};
config.db = process.env.MONGO_URL || 'mongodb://localhost/news'