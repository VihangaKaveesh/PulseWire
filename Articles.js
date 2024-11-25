const mongoose = require('mongoose');

const Article = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  image: String,
  timestamp: { type: Date, default: Date.now },
})

const ArticleModel = mongoose.model("Articles",Article)
module.exports = ArticleModel ;
