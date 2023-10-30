var express = require("express");
var router = express.Router();

/* schema required */
var users = require("../Models/userModels");
var songModel = require("../Models/songModel");
var playlistModel = require("../Models/playlistModels");

/* passport authentication setup requirement */
var passport = require("passport");
var localStrategy = require("passport-local");
passport.use(new localStrategy(users.authenticate()));

/* require multer  
use var if error occure*/
var multer = require("multer");

/* nodeid3 require for extracting poster from song buffer */
var id3 = require("node-id3");

/* require crypto for giving random names to files or uploaded song */
var crypto = require("crypto");

const { Readable } = require("stream");

/* database connectivity */
const mongoose = require("mongoose");
const { promises } = require("dns");
mongoose
  .connect("mongodb://0.0.0.0/sptf-n15")
  .then(() => {
    console.log("connect to database");
  })
  .catch((err) => {
    console.log(err);
  });

const conn = mongoose.connection;
var gfsBucket, gfsBucketPoster;
conn.once("open", () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "audio",
  });
  gfsBucketPoster = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "poster",
  });
});

/* GET home page. */
router.get("/", issLoggedIn, function (req, res, next) {
  res.render("index", { title: "Express" });
});

/* login route */

router.get("/auth", (req, res, next) => {
  res.render("register");
});
// router.get('/login',(req, res,next)=>{
//   res.render('index')
// })

/*user authenticatin route */
router.post("/register", (req, res, next) => {
  var newUser = {
    username: req.body.username,
    email: req.body.email,
  };
  users
    .register(newUser, req.body.password)
    .then((result) => {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/");
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  }),
  (req, res, next) => {}
);

router.get("/logout", (req, res, next) => {
  if (req.isAuthenticated())
    req.logOut((err) => {
      if (err) res.send(err);
      else res.redirect("/");
    });
  else {
    res.redirect("/");
  }
});

/* ISLOGGEDIN */
function issLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect("/auth");
}

/* ISADMIN */
function isAdmine(req, res, next) {
  if (req.user.isAdmin) return next();
  else res.redirect("/");
}

/* multer  */
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* upload music logic route */
router.post(
  "/uploadMusic",
  issLoggedIn,
  isAdmine,
  upload.array("song"),
  async (req, res, next) => {
    await Promise.all(
      req.files.map(async (file) => {
        const randomName = crypto.randomBytes(20).toString("hex");

        const songData = id3.read(file.buffer);
        // console.log(id3.read(req.file.buffer))

        /* extract data from uploaded song  */
        Readable.from(file.buffer).pipe(gfsBucket.openUploadStream(randomName));
        Readable.from(songData.image.imageBuffer).pipe(
          gfsBucketPoster.openUploadStream(randomName + "Poster")
        );

        await songModel.create({
          title: songData.title,
          artist: songData.artist,
          album: songData.album,
          size: file.size,
          poster: randomName + "Poster",
          fileName: randomName,
        });
      })
    );
    res.send("songs uploaded");
  }
);

/* upload music page route  */
router.get("/uploadMusic", issLoggedIn, (req, res, next) => {
  res.render("uploadMusic");
});
module.exports = router;
