const mongoose = require("mongoose");

const playlistSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  poster : {
    type : String,
    default : '/image/defaultmusic.png'
  },

  songs:[{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'song'
  }]
});

module.exports = mongoose.model('playlist', playlistSchema)