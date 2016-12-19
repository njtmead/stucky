var app = angular.module("mainApp", ["ngRoute", "ngStorage"]);

app.config(["$routeProvider", function($routeProvider) {
	$routeProvider.when("/", {
		templateUrl: "/index.html"
	});
}]);

app.factory("socket", function ($rootScope) {
	var socket = io.connect();
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			});
		}
	};
});

app.controller("mainCtrl", function($scope, $timeout, $localStorage, socket) {
	$scope.msg = "";
	$scope.me = {};
	$scope.frozen = 1001;
	$scope.moveDirection = {};
	$scope.players = {};
	var MAXSQUARES = 10;

	var arrowTimeout = 100;
	var lastMove = 0;

	loadUser();

	function loadUser() {
		var user = {};
		user.userid = $localStorage.userid;
		if (user.userid) {
			return login(user);
		} else {
			$scope.me.userid = "";
		}
	}

	$scope.register = function() {
		socket.emit("register");
	};

	socket.on("register", function(player) {
		$scope.me = player;
		if (player.userid) $localStorage.userid = player.userid;
	});

	$scope.login = function(user) {
		login(user);
	};

	function login(user) {
		socket.emit("login", user);
	}

	$scope.logout = function() {
		$localStorage.userid = null;
	};

	$scope.keypress = function(event) {
		var keycode = event.keyCode;
    // left arrow 37
		switch(keycode) {
		case 37:
        // alert("left");
			$scope.moveDirection.col = -1;
			$timeout(arrowMove, arrowTimeout);
			break;
		case 38:
        // alert("up");
			$scope.moveDirection.row = -1;
			$timeout(arrowMove, arrowTimeout);
			break;
		case 39:
        // alert("right");
			$scope.moveDirection.col = 1;
			$timeout(arrowMove, arrowTimeout);
			break;
		case 40:
        // alert("down");
			$scope.moveDirection.row = 1;
			$timeout(arrowMove, arrowTimeout);
			break;
		default:
        // do nothing
		}
	};

	function arrowMove() {
		var row = $scope.moveDirection.row || 0;
		var col = $scope.moveDirection.col || 0;
		if (!row && !col) return;
    // alert(row + "," + col);
		$scope.move(row, col);
		$scope.moveDirection = {};
	}

	$scope.respawn = function(userid) {
		socket.emit("respawn", userid);
	};

	$scope.getSquare = function(playerRow,playerCol) {
		var square = {};

		if (playerRow*playerRow <= 1 && playerCol*playerCol <= 1) square.class = "player canmove";

		var x = $scope.me.x + playerCol;
		var y = $scope.me.y + playerRow;

		if (x <= 0) x += MAXSQUARES;
		if (x > MAXSQUARES) x -= MAXSQUARES;
		if (y <= 0) y += MAXSQUARES;
		if (y > MAXSQUARES) y -= MAXSQUARES;


		for (var player in $scope.players) {
			var thisPlayer = $scope.players[player];
			if (thisPlayer.level == $scope.me.level && thisPlayer.x == x && thisPlayer.y == y) {
				square.isPlayer = true;
				square.content = thisPlayer.score;
				// square.class = (thisPlayer.userid == $scope.me.userid) ? "me" : "enemy";
				return square;
			}
		}
		square.content = x + "," + y;
		// square.class = "empty";
		return square;
	};

	$scope.getShield = function(playerRow, playerCol, shieldRow, shieldCol) {

		var x = $scope.me.x + playerCol;
		var y = $scope.me.y + playerRow;

		if (x <= 0) x += MAXSQUARES;
		if (x > MAXSQUARES) x -= MAXSQUARES;
		if (y <= 0) y += MAXSQUARES;
		if (y > MAXSQUARES) y -= MAXSQUARES;

		for (var i in $scope.players) {
			var thisPlayer = $scope.players[i];
			if (thisPlayer.level == $scope.me.level && thisPlayer.x == x && thisPlayer.y == y) {
				if (shieldRow == 0 && shieldCol == 0) return "shield yellow";
				return thisPlayer.shields[shieldRow + "," + shieldCol] ? "shield red" : "shield black";
			}
		}
		return "shield";
	};

	$scope.move = function(row,col) {
		if ($scope.frozen < 1000) return;
		if (row*row >= 4 || col*col >= 4) return;
		if (!row && !col) return;
		var move = {
			userid: $scope.me.userid,
			row: row,
			col: col
		};
		socket.emit("move", move);
	};

	socket.on("update", function(player) {
		$scope.players[player.userid] = player;
		if (player.userid == $scope.me.userid) {
			$scope.me = player;
			if (!player.alive) alert("you died");
			if (player.alive) {
				lastMove = new Date();
				unfreeze();
			}
		}
	});

	function unfreeze() {
		$scope.frozen = new Date() - lastMove;
		if ($scope.frozen < 1000) {
			$timeout(unfreeze, 10);
		}
	}

	socket.on("msg", function(msg) {
		$scope.msg = msg;
	});

});
