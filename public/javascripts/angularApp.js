var app = angular.module('flapperNews', ['ui.router']);

app.factory('runs', ['$http', function($http) {
    var o = {
        runs: []
    };

    o.getAll = function() {
        return $http.get('/runs').success(function(data) {
            angular.copy(data, o.runs);
        });
    };

    o.create = function(run) {
        return $http.post('/runs', run).success(function(data) {
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
        console.log('hey...');
        return $http.put('/rankings/' + ranking._id + '/win/' + scoreChange).then(function(res) {
            ranking.score = res.score;
            return res.data;
        });
    };

    o.updateLosingRanking = function(ranking, scoreChange) {
        console.log('hey...');
        return $http.put('/rankings/' + ranking._id + '/lose/' + scoreChange).then(function(res) {
            ranking.score = res.score;
            return res.data;
        });
    };

    return o;
}]);

app.controller('MainCtrl', [
'$scope',
'runs',
function($scope, runs){
    $scope.runs = runs.runs;

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
'runs',
'run',
function($scope, runs, run) {
    $scope.run = run;

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

        console.log('Winner:' + winner.game.name);
        console.log('Loser:' + loser.game.name);
        runs.updateWinningRanking(winner, 50);
        runs.updateLosingRanking(loser, 50);

        getMatch();
    }

    $scope.getMatch = getMatch;

    getMatch();
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
    
    $urlRouterProvider.otherwise('home');
}]);

