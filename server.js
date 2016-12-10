var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var shortid = require('shortid');
app.use(express.static(__dirname + '/public'));

var MAXSQUARES = 10;
var players = {};

io.on('connection', function(socket) {
	console.log('new connection');

	socket.on('newplayer', function() {
		var player = {
			userid: shortid.generate(),
			level: 1,
			score: 5,
			x: null,
			y: null,
			alive: false
		};
		players[player.userid] = player;
		console.log(players);
		socket.emit('newplayer', player);
	});

	socket.on('newgame', function(userid) {
		var player = getPlayer(userid);
		if (!player) return socket.emit('newplayer', {});
		player = newgame(player);
		if (player.alive) {
			players[player.userid] = player;
			io.sockets.emit('update', player);
			for (var player in players) {
				socket.emit('update', players[player]);
			}
		} else {
			socket.emit('msg', 'no game found');
		}
	});

	socket.on('move', function(move) {
		var updates = movePlayer(move);
		for (var i in updates){
			var player = updates[i];
			players[player.userid] = player;
			io.sockets.emit('update', player);
		}
	});

});

server.listen(8000, function() {
	console.log('server up and running at 8000 port');
});

function getPlayer(userid) {
	return players[userid];
}

function movePlayer(move){
	var updates = [];
	var mover = getPlayer(move.userid);
	mover.x += move.col;
	mover.y += move.row;

	for (var player in players){
		var thisPlayer = players[player];
		if (thisPlayer.userid == move.userid) continue;
		if (thisPlayer.level == mover.level && thisPlayer.x == mover.x && thisPlayer.y == mover.y) {
			thisPlayer.score = 5;
			thisPlayer.alive = false;
			thisPlayer.x = null;
			thisPlayer.y = null;
			mover.score++;
			updates.push(thisPlayer);
			break;
		}
	}

	updates.push(mover);
	return updates;

}

function newgame(newplayer) {
	for (var x = 1; x <= MAXSQUARES; x++) {
		for (var y = 1; y <= MAXSQUARES; y++) {
			var allowed = true;
			for (var player in players) {
				var thisPlayer = players[player];
				if (thisPlayer.level == newplayer.level && thisPlayer.x == x && thisPlayer.y == y) {
					allowed = false;
					break;
				}
			}
			if (allowed) {
				newplayer.x = x;
				newplayer.y = y;
				newplayer.alive = true;
				return newplayer;
			}
		}
	}
	return newplayer;
}
