angular.module('InstaKilogram')
    .controller('HomeCtrl', function($scope, $window, $rootScope, $auth, API) {

        if($auth.isAuthenticated() && ($rootScope.currentUser && $rootScope.currentUser.username)) {
            API.getFeed().success(function(data){
                $scope.photos = data;
            });
        }

        $scope.isAuthenticated = function() {
            // check if logged in
            return $auth.isAuthenticated();
        };

        $scope.linkInstagram = function() {
            // connect email account with Instagram
            $auth.link('instagram')
                .then(function(response) {
                    $window.localStorage.currentUser = JSON.stringify(response.data.user);
                    $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
                    API.getFeed().success(function(data){
                        $scope.photos = data;
                    });
                });
        };
    });