const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())
app.use(express.static('public'))

const { Schema } = mongoose;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

let Exercise = mongoose.model('Exercise', exerciseSchema);

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
});

let User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST 'users' entrypoint
// Add a new user.
app.post('/api/users', (req, res) => {
  let user = new User({
    username: req.body.username,
  });
  user.save(function (err, data) {
    if (err) {
      res.json({
        error: err.code === 11000 ? 'This username already exists.' : err,
      });
    } else {
      res.json({
        _id: data._id,
        username: data.username,
      });
    }
  });
});

// GET 'users' entrypoint
// Get an array of all users.
app.get('/api/users', (req, res) => {
  User.find()
    .select('_id username')
    .exec(function (err, data) {
      if (err) return console.error(err);
      res.json(data);
    });
});

// POST 'users' entrypoint
// Add a new user exercise.
app.post('/api/users/:_id/exercises', (req, res) => {
  let exercise = new Exercise({
    userId: req.params._id,
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? new Date(req.body.date) : new Date()
  });

  User.findOne({ _id: req.params._id })
    .select('_id username')
    .exec(function (err, user) {
      if (err) return console.error(err);
      exercise.save((err, data) => {
        if (err) {
          res.json({ error: err });
        } else {
          res.json({
            _id: user._id,
            username: user.username,
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          });
        }
      });
    });
});

// GET 'users' entrypoint
// Get a full exercise log of any user.
app.get('/api/users/:_id/logs', (req, res) => {
  const { limit, from, to } = req.query;

  User.findOne({ _id: req.params._id })
    .select('_id username')
    .exec(function (err, user) {
      if (err) return console.error(err);

      let query = Exercise.find({ userId: req.params._id }).select('description duration date');

      if (limit !== undefined) {
        query.limit(parseInt(limit));
      }

      if (from !== undefined && to !== undefined) {
        query.where('date').gte(from).lte(to);
      } else if (from !== undefined) {
        query.where('date').gte(from);
      } else if (to !== undefined) {
        query.where('date').lte(to);
      }

      query.exec(function (err, data) {
        if (err) console.log(err);
        if (data !== null) {
          res.json({
            _id: user._id,
            username: user.username,
            log: data.map(e => ({
              description: e.description,
              duration: e.duration,
              date: e.date.toDateString()
            })),
            count: data.length
          });
        }
      });

    });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
