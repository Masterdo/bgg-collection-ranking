var config = module.exports = {};
config.db = process.env.MONGO_URL || 'mongodb://localhost/bgg-collection-ranking'
config.localSecret = process.env.LOCAL_SECRET