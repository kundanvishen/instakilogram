angular.module('InstaKilogram')
    .controller('LoginCtrl', function($scope, $window, $location, $routeScope, $auth) {
        $scope.instagramLogin = function() {
            $auth.authenticate('instagram')
                .then(function(response) {
                    $window.localStorage.currentUser = JSON.stringify(response.data.user);
                    $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
                })
                .catch(function(response) {
                    console.log(response.data);
                });
        }; // instagramLogin()

        $scope.emailLogin = function() {
            $auth.login({ email: $scope.email, password: $scope.password })
                .then(function(response) {
                    $window.localStorage.currentUser = JSON.stringify(response.data.user);
                    $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
                })
                .catch(function(resposne) {
                    $scope.errorMessage = {};
                    angular.forEach(response.data.message, function(message, field) {
                        $scope.loginForm[field].$setValidity('server', false);
                        $scope.errorMessage[field] = response.data.message[field];
                    }, this);
                });
        };
    });