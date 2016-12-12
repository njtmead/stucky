var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var shortid = require("shortid");

var MAXSQUARES = 10;
var players = {};

app.use(express.static(__dirname + "/public"));
server.listen(3000, function() {
	console.log("server up and running at 8000 port");
});

io.on("connection", function(socket) {
	console.log("new connection");

	socket.on("register", function() {
		var player = {
			userid: shortid.generate(),
			level: 1,
			score: 1,
			x: null,
			y: null,
			shields: {
				"-1,-1": true,
				"-1,0": true,
				"-1,1": true,
				"0,-1": true,
				"0,1": true,
				"1,-1": true,
				"1,0": true,
				"1,1": true
			},
			alive: false
		};
		player = removeShield(player);
		players[player.userid] = player;
		// console.log(players);
		socket.userid = player.userid;
		socket.emit("register", player);
	});

	socket.on("disconnect", function() {
		var userid = socket.userid;
		if (userid){
			console.log("disconnection " + userid);
			players[userid].alive = false;
		}
	});

	socket.on("login", function(player) {
		if (!player.userid) return;
		for (var i in players) {
			var thisPlayer = players[i];
			if (thisPlayer.userid == player.userid) {
				socket.userid = player.userid;
				return socket.emit("register", thisPlayer);
			}
		}
	});

	socket.on("respawn", function(userid) {
		var player = getPlayer(userid);
		if (!player) return socket.emit("register", {});
		player = respawn(player);
		if (player.alive) {
			players[player.userid] = player;
			io.sockets.emit("update", player);
			for (var i in players) {
				socket.emit("update", players[i]);
			}
		} else {
			socket.emit("msg", "no game found");
		}
	});

	socket.on("move", function(move) {
		var updates = movePlayer(move);
		for (var i in updates){
			var player = updates[i];
			players[player.userid] = player;
			io.sockets.emit("update", player);
		}
	});

});

function getPlayer(userid) {
	return players[userid];
}

function movePlayer(move){
	var updates = [];
	var shieldToCheck = (-1*move.row) + "," + (-1*move.col);
	var mover = getPlayer(move.userid);

	mover.x += move.col;
	mover.y += move.row;

	if (mover.x <= 0) mover.x = MAXSQUARES;
	if (mover.x > MAXSQUARES) mover.x = 1;
	if (mover.y <= 0) mover.y = MAXSQUARES;
	if (mover.y > MAXSQUARES) mover.y = 1;

	for (var player in players){
		var enemy = players[player];
		if (enemy.userid == move.userid) continue;
		if (enemy.level == mover.level && enemy.x == mover.x && enemy.y == mover.y) {
			if (enemy.shields[shieldToCheck]) {
				// mover hit enemy shield
				mover = loseLife(mover);
				enemy = gainLife(enemy);
			} else {
				// mover missed enemy shield
				mover = gainLife(mover);
				enemy = loseLife(enemy);
			}
			updates.push(enemy);
			break;
		}
	}

	updates.push(mover);
	return updates;

}

function removeShield(player) {
	var count = 0;
	var randomShield;
	for (var i in player.shields) {
		if (!player.shields[i]) continue;
		if (Math.random() < 1/++count) randomShield = i;
	}
	player.shields[randomShield] = false;
	return player;
}

function addShield(player) {
	var count = 0;
	var randomShield;
	for (var i in player.shields) {
		if (player.shields[i]) continue;
		if (Math.random() < 1/++count) randomShield = i;
	}
	player.shields[randomShield] = true;
	return player;
}

function loseLife(player) {
	if (player.score > 1) {
		player.score--;
		player = addShield(player);
	}
	player.alive = false;
	player.x = null;
	player.y = null;
	return player;
}

function gainLife(player) {
	if (player.score < 8) {
		player.score++;
		player = removeShield(player);
	}
	return player;
}

function respawn(player) {
	for (var x = 1; x <= MAXSQUARES; x++) {
		for (var y = 1; y <= MAXSQUARES; y++) {
			var allowed = true;
			for (var i in players) {
				var thisPlayer = players[i];
				if (thisPlayer.level == player.level && thisPlayer.x == x && thisPlayer.y == y) {
					allowed = false;
					break;
				}
			}
			if (allowed) {
				player.x = x;
				player.y = y;
				player.alive = true;
				return player;
			}
		}
	}
	return player;
}
