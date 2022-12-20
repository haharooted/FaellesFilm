// ************ Imports **************
const fs = require('fs');
var express = require('express');
var app = express();
var backend = require('http').createServer(app);
var io = require('socket.io').listen(backend);

socket_forb = [];
brugere = [];
rum = [];
bruger_rum = {};
var givet_rum = '';

app.use(express.static(__dirname + '/')); // serve vores app

// fetch alle videoer
app.get('/getvideos', function(req, res) {
    dir = 'movies/'
    files_seen = []
    fs.readdir(dir, (err, files) => {
      files.forEach(file    => {
        files_seen.push(file)
      });
      res.json(files_seen)
    });
});

app.get('/:room', function(req, res) {
    givet_rum = req.params.room
    res.sendFile(__dirname + '/index.html');
});

currentTime });
  });

  io.sockets.on('connection', function(socket) {
    connections.push(socket); //forbind socket