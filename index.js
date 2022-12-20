var express = require('express');
const fs = require('fs');
var app = express();
var minapp = require('http').createServer(app);
var mainsockets = require('socket.io').listen(minapp);
const figlet = require("figlet")
// serve static filer
app.use(express.static(__dirname + '/'));

app.get('/getvideos', function(req, res) {
    dir = 'movies/'
    filesz = []
    fs.readdir(dir, (err, files) => {
      files.forEach(file    => {
        console.log(file)
        filesz.push(file)
      });
      res.json(filesz)
    });
});

app.get('/api/rtt', (req, res) => {
    const tidNuPlayer = new Date().toISOString();
    res.send({ time: tidNuPlayer });
  });

figlet.text("Faelles-Film!", function (err, input){
    console.log(input)
    console.log("Kører på localhost:3333 -> TLS ikke sat op ")
})

brugere = [];
connections = [];
rooms = [];
brugerrum = {}
var given_room = ""
minapp.listen(3333);

app.get('/:rum', function(req, res) {
    given_room = req.params.rum
    res.sendFile(__dirname + '/index.html');
});


mainsockets.sockets.on('connection', function(socket) {
    connections.push(socket); //forbind socket
    socket.emit('opret id', {
        id: given_room
    })

    socket.on('url fix', function(input) {
        given_room = ""
    });

    console.log('Sockets i alt: ', connections.length);

    socket.on('disconnect', function(input) {
        if (brugere.indexOf(socket.brugernavn) != -1) {
            brugere.splice((brugere.indexOf(socket.brugernavn)), 1);
        }

        connections.splice(connections.indexOf(socket), 1);
        var id = socket.id
        console.log('Socket user exit.. Ny total: ', connections.length);
        var rumnummer = brugerrum[id]
        var rum = mainsockets.sockets.adapter.rooms['rum-' + rumnummer]

        if (rum !== undefined) {
            if (socket.id == rum.host) {
                mainsockets.to(Object.keys(rum.sockets)[0]).emit('configNyHostDiscon', {
                    rumnummer: rumnummer
                })
            }

            if (rum.brugere.indexOf(socket.brugernavn) != -1) {
                rum.brugere.splice((rum.brugere.indexOf(socket.brugernavn)), 1);
                opdaterBrugere(rumnummer);
            }
        }

        delete brugerrum[id]

    });

    socket.on('nyt rum', function(input, callback) {
        socket.rumnummer = input;
        brugerrum[socket.id] = input
        var host = null
        var init = false
        if (socket.rumnummer == null || socket.rumnummer == "") {
            socket.rumnummer = '1'
            brugerrum[socket.id] = '1'
        }
        //hmmmm midlertidig fix
        if (!rooms.includes(socket.rumnummer)) {
            rooms.push(socket.rumnummer);
        }

        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] === undefined) {
            socket.send(socket.id)
            host = socket.id
            init = true

            socket.emit('hNyEjer');
        } else {
            host = mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].host
        }

        console.log(socket.brugernavn + " <- Brugeren er forbundet til følgende rum: " + socket.rumnummer)
        socket.join("rum-" + socket.rumnummer);

        if (init) {
            mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].rumEjer = socket.brugernavn
            mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].brugere = [socket.brugernavn]
            // host
            mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].host = host
            mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].nuvVid = {
                hPlayer: '/movies/movie1.mp4'
            }
        }
        mainsockets.sockets.in("rum-" + socket.rumnummer).emit('nytEjerNavn', {
            brugernavn: mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].rumEjer
        })
        var nuvVid = mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].nuvVid.hPlayer
        mainsockets.sockets.in("rum-" + socket.rumnummer).emit('makePlayerNy', {});
        socket.emit('skiftKlientTilVideo', {
            urlTilVid: nuvVid
        });
        if (socket.id != host) {
            setTimeout(function() {
                socket.broadcast.to(host).emit('fetchInfo');
            }, 1000);
            mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].brugere.push(socket.brugernavn)

        }
        opdaterBrugere(socket.rumnummer)

    });


    socket.on('play other', function(input) {
        var rumnummer = input.rum
        socket.broadcast.to("rum-" + rumnummer).emit('justPlay');
    });

    socket.on('pause other', function(input) {
        var rumnummer = input.rum
        socket.broadcast.to("rum-" + rumnummer).emit('pauseVid');
    });

    socket.on('tidspunkt ny', function(input) {
        var rumnummer = input.rum
        var tidNu = input.time
        socket.broadcast.to("rum-" + rumnummer).emit('soeg', {
            time: tidNu
        });
    });

    //gen sync vid
    socket.on('synk player', function(input) {
        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] !== undefined) {
            var rumnummer = input.rum
            var tidNu = input.time
            var state = input.state
            var urlTilVid = input.urlTilVid
            mainsockets.sockets.in("rum-" + rumnummer).emit('synkroniserVideoClient', {
                time: tidNu,
                state: state,
                urlTilVid: urlTilVid,
                playerId: 0
            })
        }
    });

    socket.on('skift vid', function(input, callback) {
        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] !== undefined) {
            var rumnummer = input.rum
            var urlTilVid = input.urlTilVid
            mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].nuvVid.hPlayer = urlTilVid
            mainsockets.sockets.in("rum-" + rumnummer).emit('skiftKlientTilVideo', {
                urlTilVid: urlTilVid
            });

        }
    });

    socket.on('get video', function(callback) {
        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] !== undefined) {
            var nuvVid = mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].nuvVid.hPlayer
            callback(nuvVid)
        }
    })

    socket.on('ny besked', function(input) {
        console.log("Krypteret besked skrevet i chatten: ", input)
        mainsockets.sockets.in("rum-" + socket.rumnummer).emit('new besked', {
            msg: input,
            user: socket.brugernavn
        });
    });

    socket.on('ny bruger', function(input, callback) {
        callback(true);
        var kodetBruger = input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        socket.brugernavn = kodetBruger;
        brugere.push(socket.brugernavn);
    });

    // gensynkroniser host op
    socket.on('gensynkroniser host', function(input) {
        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] !== undefined) {
            var hostSoc = mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].host
            if (socket.id != hostSoc) {
                socket.broadcast.to(hostSoc).emit('fetchInfo')
            } else {
                socket.emit('synkroniserNuvHost')
            }
        }
    })

    socket.on('hostStats', function(input) {
        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] !== undefined) {
            var rumnummer = input.rum
            console.log("get rumnummer input -> rumnummer: ", rumnummer)
            console.log("rumnummer rumnummer input -> ", mainsockets.sockets.adapter.rooms['rum-'+rumnummer])
            var host = mainsockets.sockets.adapter.rooms['rum-' + rumnummer].host
            if (input.tidNu === undefined) {
                var e = socket.id
                socket.broadcast.to(host).emit('afspillerStats', {
                    rum: rumnummer,
                    caller: e
                })
            } else {
                var e = input.caller
                socket.broadcast.to(e).emit('sammenlignEjer', input);
            }
        }

    })

    function opdaterBrugere(rumnummer) {
        if (mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer] !== undefined) {
            var roomUsers = mainsockets.sockets.adapter.rooms['rum-' + socket.rumnummer].brugere
            mainsockets.sockets.in("rum-" + rumnummer).emit('get brugere', roomUsers)
        }
    }

})
