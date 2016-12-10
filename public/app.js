var app = angular.module('mainApp', ['ngRoute']);

app.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: '/index.html'
  });
}]);

app.factory('socket', function ($rootScope) {
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
      })
    }
  };
});

app.controller('mainCtrl', function($scope, $timeout, socket) {
	$scope.msg = "";
	$scope.me = {};
  $scope.moveDirection = {};
	$scope.players = {};

  var arrowTimeout = 100;

	$scope.newplayer = function() {
		socket.emit('newplayer');
	}

	socket.on('newplayer', function(player) {
		$scope.me = player;
	});

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
  }

  function arrowMove() {
    var row = $scope.moveDirection.row || 0;
    var col = $scope.moveDirection.col || 0;
    if (!row && !col) return;
    // alert(row + "," + col);
    $scope.move(row, col);
    $scope.moveDirection = {};
  }

	$scope.newgame = function(userid) {
		socket.emit('newgame', userid);
	}

	$scope.getSquare = function(row,col) {
    var square = {};
		var x = $scope.me.x + col;
		var y = $scope.me.y + row;
    if (x <= 0 || y <= 0 || x > 10 || y > 10) {
      square.class = "wall";
      square.content = "wall";
      return square;
    }
		for (var player in $scope.players) {
			var thisPlayer = $scope.players[player];
			if (thisPlayer.level == $scope.me.level && thisPlayer.x == x && thisPlayer.y == y) {
        square.content = thisPlayer.userid;
        square.class = (thisPlayer.userid == $scope.me.userid) ? "me" : "enemy";
        return square;
      }
		}
    square.content = x + "," + y;
    square.class = "empty";
    return square;
	}

	$scope.move = function(row,col) {
    var x = $scope.me.x + col;
    var y = $scope.me.y + row;
    if (!x || !y || x > 10 || y > 10) return;
    if (!row && !col) return;
		var move = {
			userid: $scope.me.userid,
			row: row,
			col: col
		};
		socket.emit('move', move);
	}

	socket.on('update', function(player) {
		$scope.players[player.userid] = player;
		if (player.userid == $scope.me.userid) {
			$scope.me = player;
      if (!player.alive) alert("you died");
		}
	});

	socket.on('msg', function(msg) {
		$scope.msg = msg;
	});

});
