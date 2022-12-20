var afspiller = 0

function synkroniserVideo(rumnummer) {
    var tidNu = 0
    var state
    var urlTilVid = id
    console.log("Syncing: rumnummer: ", rumnummer)

    tidNu = primVideoElem.tidNuPlayer;
    e = primVideoElem.paused;

    socket.emit('synk player', {
        rum: rumnummer,
        time: tidNu,
        state: e,
        urlTilVid: urlTilVid
    });
}

function fetchTid() {
    return primVideoElem.tidNuPlayer;
}

function skiftVideoFraInput(rumnummer, film_navn) {
    console.log("skift video ->", rumnummer, film_navn)
    if(rumnummer == 1) {
        console.log("... rum_id er 1, dvs. ikke i et rum ...")
        alert("Du er ikke i et rum og kan derfor ikke afspille filmen. Indtast dit navn og tilslut dig et rum")
    } else {
        skiftVid(rumnummer, film_navn)
    }
}

function skiftVid(rumnummer, rawId) {
    if (rawId != "invalid") {
        var time = fetchTid()
        socket.emit('skift vid', {
            rum: rumnummer,
            urlTilVid: rawId,
            time: time
        });
    } else {
        console.log("fejl i video id...")
    }
}

socket.on('fetchInfo', function(data) {
    socket.emit('gensynkroniser host', {});
});

var rumnummer = 1
var id = "333333333"

// Syncs the video client
socket.on('synkroniserVideoClient', function(data) {
    var tidNu = data.time
    var e = data.state
    primVideoElem.tidNuPlayer = tidNu
    if (e) {
        primVideoElem.pause()
    } else {
        primVideoElem.play()
    }

});

socket.on('skiftKlientTilVideo', function(data) {
    var urlTilVid = data.urlTilVid;
    socket.emit('get video', function(id) {
        urlTilVid = id
        id = urlTilVid
        afspilMp4(urlTilVid)
    })
    setTimeout(function() {
        socket.emit('gensynkroniser host', {});
    }, 1000);

});

var afspiller = 0


socket.on('afspillerStats', function(data) {
    var rumnummer = data.rum
    var e = data.caller

    var tidNu = primVideoElem.tidNuPlayer
    var state = primVideoElem.paused
    socket.emit('hostStats', {
        rum: rumnummer,
        tidNu: tidNu,
        state: state,
        caller: e
    });
});

socket.on('makePlayerNy', function(data) {
    var html5 = document.getElementById('playerOmroede');
    html5.style.display = 'block';
});

var host = false

socket.on('hNyEjer', function(data) {
    host = true
});
socket.on('unhNyEjer', function(data) {
    host = false
});
socket.on('fetchInfo', function(data) {
    socket.emit('gensynkroniser host', {});
});
socket.on('synkroniserNuvHost', function(data) {
    synkroniserVideo(rumnummer)
});

// Nyt ejer navn
socket.on('nytEjerNavn', function(data) {
    var user = data.brugernavn
    var hostlabel = document.getElementById('hostlabel') // nyt label
    hostlabel.innerHTML = "<i class=\"fas fa-plus\"></i> Følgende bruger styrer afspilleren: " + '"' + user + '"'

})

socket.on('configNyHostDiscon', function(data) {
    changeHost(data.rumnummer)
})

function getHostData(rumnummer) {
    socket.emit('hostStats', {
        rum: rumnummer
    });
}

socket.on('sammenlignEjer', function(data) {
    var hostTime = data.tidNu
    var tidNu = primVideoElem.tidNuPlayer
    if (tidNu < hostTime - 2 || tidNu > hostTime + 2) {
        console.log("syncz")
    }
});


var afspiller = 0

function playOther(rumnummer) {
    socket.emit('play other', {
        rum: rumnummer
    });
}

socket.on('justPlay', function(data) {
    if (primVideoElem.paused) {
        primVideoElem.play();
    }
});

function pausePlaya(rumnummer) {
    socket.emit('pause other', {
        rum: rumnummer
    });
}

socket.on('pauseVid', function(data) {
    primVideoElem.pause()
});

function nytTidspunktStandard(rumnummer, tidNu) {
    socket.emit('tidspunkt ny', {
        rum: rumnummer,
        time: tidNu
    });
}

socket.on('soeg', function(data) {
    tidNu = data.time
    var clientTime = primVideoElem.tidNuPlayer
    if (clientTime < tidNu - .2 || clientTime > tidNu + .2) {
        primVideoElem.tidNuPlayer = tidNu
    }
});


var primVideoElem = document.querySelector('video');
var afspiller = 0
primVideoElem.addEventListener("play", function(e) {
    if (host) {
        playOther(rumnummer)
    } else {
        getHostData(rumnummer)
    }
})
primVideoElem.addEventListener("pause", function(e) {
    if (host) {
        pausePlaya(rumnummer)
    }
})

//søg nyt tidspunkt
primVideoElem.addEventListener("seeked", function(e) {
    var tidNu = primVideoElem.tidNuPlayer
    if (host) {
        nytTidspunktStandard(rumnummer, tidNu)
    }
})

function afspilPlayer() {
    if (primVideoElem.paused) {
        primVideoElem.play();
    } else {
        primVideoElem.pause();
    }
}

function afspilMp4(urlTilVid) {
    console.log("changing video to: " + urlTilVid)
    primVideoElem.src = urlTilVid
}

