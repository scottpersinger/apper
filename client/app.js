angular.module('apper', ['ngResource', 'ui.bootstrap', 'angularTreeview'])

.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

// ************ APP ROUTING *****************

  $stateProvider.state('editor', {
    url: "/editor",
    templateUrl: "editor.html"
  })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/editor');

})

// ************ CONTROLLERS *****************

.controller('EditorCtrl', function($scope, $location, Contact) {
  $scope.apps = App.query();

})


// ************ SERVER RESOURCES (via Ajax) *****************

.factory('App', function($resource) {
  return $resource('/resource/apps/:appId', null);
})
