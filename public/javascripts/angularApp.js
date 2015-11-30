var app = angular.module('bgg-collection-ranking', ['ui.router']);

app.factory('runs', ['$http', 'auth', function($http, auth) {
    var o = {
        runs: []
    };

    o.getAll = function() {
        return $http.get('/runs').success(function(data) {
            angular.copy(data, o.runs);
        });
    };

    o.create = function(run) {
        return $http.post('/runs', run, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function(data) {
            o.runs.push(data);
        });
    };

    o.get = function(id) {
        return $http.get('/runs/' + id).then(function(res) {
            return res.data;
        });
    };

    o.getRanking = function(run, id) {
        return $http.get('/runs/' + run._id + '/rankings/' + id).then(function(res) {
            return res.data;
        });
    };

    o.getGame = function(run, ranking, id) {
        return $http.get('/runs/' + run._id + '/rankings/' + ranking._id + '/games/' + id).then(function(res) {
            return res.data;
        });
    };

    o.updateWinningRanking = function(ranking, scoreChange) {
        return $http.put('/rankings/' + ranking._id + '/win/' + scoreChange, null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).then(function(res) {
            ranking.score = res.score;
            return res.data;
        });
    };

    o.updateLosingRanking = function(ranking, scoreChange) {
        return $http.put('/rankings/' + ranking._id + '/lose/' + scoreChange, null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).then(function(res) {
            ranking.score = res.score;
            return res.data;
        });
    };

    return o;
}]);

app.factory('auth', ['$http', '$window', function($http, $window) {
    var auth = {};

    auth.saveToken = function(token) {
        $window.localStorage['bgg-collection-ranking-token'] = token;
    };

    auth.getToken = function() {
        return $window.localStorage['bgg-collection-ranking-token'];
    };

    auth.isLoggedIn = function() {
        var token = auth.getToken();

        if (token && token != 'undefined') {
            var payload = JSON.parse($window.atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } else {
            return false;
        }
    };

    auth.currentUser = function() {
        if(auth.isLoggedIn()) {
            var token = auth.getToken();
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.displayName;
        }
    };

    auth.register = function(user) {
        return $http.post('/register', user).success(function(data) {
            auth.saveToken(data.token);
        })
    };

    auth.logIn = function(user) {
        return $http.post('/login', user).success(function(data) {
            auth.saveToken(data.token);
        });
    };

    auth.logOut = function() {
        $window.localStorage.removeItem('bgg-collection-ranking-token');
    };

    auth.logInFromGoogle = function(userId) {
        return $http.get('/users/' + userId).success(function(data) {
            auth.saveToken(data);
        });
    };

    return auth;
}]);

app.controller('MainCtrl', [
'$scope',
'auth',
'runs',
function($scope, auth, runs){
    $scope.runs = runs.runs;
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addRun = function() {
        if(!$scope.bggUser || 
            $scope.bggUser === '' || 
            !$scope.description || 
            $scope.description === '') { return; }
        runs.create({
            status: 'Open',
            username: $scope.bggUser,
            bggLink: 'http://www.boardgamegeek.com/xmlapi2/collection?username=' + $scope.bggUser + '&excludesubtype=boardgameexpansion',
            description: $scope.description
        });
        $scope.bggUser = '';
        $scope.description = '';
    };
}]);

app.controller('RunsCtrl', [
'$scope',
'auth',
'runs',
'run',
function($scope, auth, runs, run) {
    $scope.run = run;
    $scope.isLoggedIn = auth.isLoggedIn;

    var getMatch = function() {

        var index1 = Math.floor(Math.random()*run.rankings.length);
        var index2 = 0;
        do {
            index2 = Math.floor(Math.random()*run.rankings.length);
        } while (index1 === index2);
        $scope.ranking1 = run.rankings[index1];
        $scope.ranking2 = run.rankings[index2];
    };

    $scope.postResult = function(winner, loser) {
        runs.updateWinningRanking(winner, 5);
        runs.updateLosingRanking(loser, 5);

        getMatch();
    }

    $scope.getMatch = getMatch;

    getMatch();
}]);

app.controller('AuthCtrl', [
'$scope',
'$state',
'auth',
function($scope, $state, auth) {
    $scope.user = {};

    $scope.register = function() {
        auth.register($scope.user).error(function(error) {
            $scope.error = error;
        }).then(function() {
            $state.go('home');
        });
    };

    $scope.logIn = function() {
        auth.logIn($scope.user).error(function(error) {
            $scope.error = error;
        }).then(function() {
            $state.go('home');
        });
    };
}]);

app.controller('NavCtrl', [
'$scope',
'auth',
function($scope, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
}]);

app.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

    $stateProvider
        .state('home', {
            url: '/home',
            templateUrl: '/home.html',
            controller: 'MainCtrl',
            resolve: {
                postPromise: ['runs', function(runs) {
                    return runs.getAll();
                }]
            }
        });

    $stateProvider
        .state('runs', {
            url: '/runs/{id}',
            templateUrl: '/runs.html',
            controller: 'RunsCtrl',
            resolve: {
                run: ['$stateParams', 'runs', function($stateParams, runs) {
                    return runs.get($stateParams.id);
                }]
            }
        });

    $stateProvider
        .state('runResults', {
            url: '/runResults/{id}',
            templateUrl: '/runResults.html',
            controller: 'RunsCtrl',
            resolve: {
                run: ['$stateParams', 'runs', function($stateParams, runs) {
                    return runs.get($stateParams.id);
                }]
            }
        });

    $stateProvider
        .state('login', {
            url: '/login',
            templateUrl: '/login.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth) {
                if (auth.isLoggedIn()) {
                    $state.go('home');
                }
            }]
        });

    $stateProvider
        .state('register', {
            url: '/register',
            templateUrl: '/register.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth) {
                if (auth.isLoggedIn()) {
                    $state.go('home');
                }
            }]
        });

    $stateProvider
        .state('fromGoogle', {
            url: '/fromGoogle/:userId',
            templateUrl: '/home.html',
            onEnter: ['$state', '$stateParams', 'auth', function($state, $stateParams, auth) {
                auth.logInFromGoogle($stateParams.userId);
                $state.go('home');
            }]
        });

    $stateProvider
        .state('google', {
            url: '/auth/google'
        });

    $stateProvider
        .state('googleCallback', {
            url: '/auth/google/callback'
        });
    
    $urlRouterProvider.otherwise('home');
}]);

