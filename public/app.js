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

app.controller('mainCtrl', function($scope, socket) {
	$scope.msg = "";
	$scope.me = {};
	$scope.players = {};

	$scope.newplayer = function() {
		socket.emit('newplayer');
	}

	socket.on('newplayer', function(player) {
		$scope.me = player;
	});

	$scope.newgame = function(userid) {
		socket.emit('newgame', userid);
	}

	$scope.getSquare = function(row,col) {
		var x = $scope.me.x + col;
		var y = $scope.me.y + row;
    if (!x || !y || x > 10 || y > 10) return "wall";
		for (var player in $scope.players) {
			var thisPlayer = $scope.players[player];
			if (thisPlayer.level == $scope.me.level && thisPlayer.x == x && thisPlayer.y == y) return thisPlayer.userid;
		}
		return x + "," + y;
	}

	$scope.move = function(row,col) {
    var x = $scope.me.x + col;
    var y = $scope.me.y + row;
    if (!x || !y || x > 10 || y > 10) return alert("wall");
    if (!row && !col) return alert("that's you");
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
