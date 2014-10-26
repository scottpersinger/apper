angular.module('apper', ['ngResource', 
  'ui.bootstrap', 
  'angularTreeview',
  'angularTreeview',
  'ui.router',
  'ui.ace'])

.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

// ************ APP ROUTING *****************

  
  $stateProvider
  .state('root', {
    controller: 'RootCtrl'
  })

  .state('root.editor', {
    url: "/editor",
    templateUrl: "editor.html"
  });
  
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/editor');

})

.factory('AuthInterceptor', function ($rootScope, $window, $q, $location) {

  return {
      request: function (config) {
          $rootScope.loading = true;
          $rootScope.message = 'Saving...';
          return config || $q.when(config);
      },
      requestError: function (request) {
          console.log('request error');
          $rootScope.loading = false;
          return $q.reject(request);
      },
      response: function (response) {
          $rootScope.loading = false;
          return response || $q.when(response);
      },
      responseError: function (response) {
          console.log(JSON.stringify(response));
          $rootScope.loading = false;
          return $q.reject(response);
      }
  };
})

// Add the AuthInterceptor declared above
.config(function ($httpProvider) {
    $httpProvider.interceptors.push('AuthInterceptor');
})


// ************ CONTROLLERS *****************

.controller('RootCtrl', function($rootScope, $scope, $modal, $log, AppModel) {
  $scope.apps = AppModel.query();
  $rootScope.loading = true;
  $scope.app_id = null;
  $scope.running = null;

  $scope.toggled = function(open) {
    //console.log('Dropdown is now: ', open);
  };

  $scope.toggleDropdown = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.status.isopen = !$scope.status.isopen;
  };

  $scope.openApp = function(app_id) {
    $scope.app_id = app_id;
    $scope.$broadcast('openApp', app_id);
  }

  $rootScope.showMessage = function(msg) {
    $scope.message = msg;
    setTimeout(function() {
      $scope.show_message = true;
      $scope.$apply();
    }, 2000);
  }

  $scope.newApp = function() {
    var modalInstance = $modal.open({
      templateUrl: 'newapp-modal.html',
      controller: 'NewAppCtrl'
    });

    modalInstance.result.then(function (opts) {
      $log.info("New app link ", opts);
      new AppModel({name: opts.name, heroku_user_id: 1, repository: opts.repository}).$save(function() {
        $scope.apps = AppModel.query();
      }, function(err) {
        alert("Error creating app " + err);
      });
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  }

  $scope.runApp = function() {
    new AppModel().$run({appId: $scope.app_id}, function() {
      $scope.running = true;
      $rootScope.$broadcast("appRunning", {appId: $scope.app_id});
    });
  }

})

.controller('NewAppCtrl', function($scope, $modalInstance) {
  $scope.opts = {
    name: '',
    repository: 'https://github.com/heroku/mobile-template1'
  };

  $scope.ok = function () {
    if ($scope.opts.name.length < 3) {
      return alert("Please enter an app name, at least 3 characters");
    }
    $modalInstance.close($scope.opts);
  };

  $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
  };

})

.controller('EditorCtrl', function($rootScope, $scope, $location, AppModel, FileModel) {
  $scope.tagtree = {}; // Have to initialize this here or $watch doesn't work
  $scope.fileTree = [];
  $scope.app_path = null;

  $scope.fileNode = {content:''};

  $scope.$on('openApp', function(event, app_id) {
    FileModel.query({app_id: app_id, order: ['path','name']}, function(files) {
      var root = [];
      files.forEach(function(file) {
        if (!file.path) {
          root.push(file);
        } else {
          var node = root;
          var paths = file.path.split("/");
          paths.forEach(function(path) {
            var entry = null;
            node.forEach(function(item) {
              if (item.name === path) {
                entry = item;
              }
            });
            if (!entry) {
              entry = {name: path, id: path, children: []};
              node.push(entry);
            }
            node = entry.children;
          });
          node.push(file);
        }
      });
      $scope.fileTree = root;
    });
  });

  $rootScope.$on('appRunning', function(event, args) {
    $scope.app_path = "/app" + args.appId + "/";
    setTimeout(function() {
      document.getElementsByTagName('iframe')[0].src = $scope.app_path;
    }, 1000);
  });

  $scope.$watch( 'tagtree.currentNode', function( newObj, oldObj ) {
      if( $scope.tagtree && angular.isObject($scope.tagtree.currentNode) ) {
        console.log( $scope.tagtree.currentNode.name );
        $scope.fileNode = FileModel.get({fileId: $scope.tagtree.currentNode.id, select:'*'});
      }
  }, false);  

  $scope.saver = null;

  $scope.aceLoaded = function(_editor){
    var _session = _editor.getSession();
    _session.on("change", function(){ 
      if (!$scope.saver) {
        $scope.saver = setTimeout(function() {
          $scope.saver = null;
          var f = $scope.fileNode;
          new FileModel({id: f.id, content:f.content}).$save();
        }, 2000);
      }
    });
  };
})


// ************ SERVER RESOURCES (via Ajax) *****************

.factory('AppModel', function($resource) {
  return $resource('/resource/apps/:appId', {appId: null}, {
    'run': {
      method: 'POST',
      params: {appId: null},
      url: '/resource/apps/:appId/run'
    }
  });
})

.factory('FileModel', function($resource) {
  return $resource('/resource/files/:fileId', {select:['id','name','path'],limit:300}, null);
})
