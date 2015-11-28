var app = angular.module('flapperNews', ['ui.router']);

app.factory('posts', ['$http', function($http) {
    var o = {
        posts: []
    };

    o.getAll = function() {
        return $http.get('/posts').success(function(data) {
            angular.copy(data, o.posts);
        });
    };

    o.create = function(post) {
        return $http.post('/posts', post).success(function(data) {
            o.posts.push(data);
        });
    };

    o.upvote = function(post) {
        return $http.put('/posts/' + post._id + '/upvote')
            .success(function(data) {
                post.upvotes += 1;
            });
    };

    o.get = function(id) {
        return $http.get('/posts/' + id).then(function(res) {
            return res.data;
        });
    };

    o.addComment = function(id, comment) {
        return $http.post('/posts/' + id + '/comments', comment);
    };

    o.upvoteComment = function(post, comment) {
        return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote')
            .success(function(data) {
                comment.upvotes += 1;
            });
    };

    return o;
}]);

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

    return o;
}]);

app.controller('MainCtrl', [
'$scope',
'posts',
'runs',
function($scope, posts, runs){
    $scope.posts = posts.posts;
    $scope.runs = runs.runs;

    $scope.addPost = function() {
        if(!$scope.title || $scope.title === '') {return; }
        posts.create({
            title: $scope.title,
            link: $scope.link
        });
        $scope.title = '';
        $scope.link = '';
    };

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

    $scope.incrementUpvotes = function(post) {
        posts.upvote(post);
    };
}]);

app.controller('PostsCtrl', [
'$scope',
'posts',
'post',
function($scope, posts, post){
    $scope.post = post;

    $scope.addComment = function() {
        if ($scope.body ==='') { return; }
        posts.addComment(post._id, {
            body: $scope.body,
            author: 'user'
        }).success(function(comment) {
            $scope.post.comments.push(comment);
        });
        $scope.body = '';
    };

    $scope.incrementUpvotes = function(comment) {
        posts.upvoteComment(post, comment);
    };
}]);

app.controller('RunsCtrl', [
'$scope',
'runs',
'run',
function($scope, runs, run) {
    $scope.run = run;
    $scope.runs = runs;
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
                post: ['$stateParams', 'runs', function($stateParams, runs) {
                    return runs.get($stateParams.id);
                }]
            }
        });
    
    $urlRouterProvider.otherwise('home');
}]);

