'use strict';

// TODO : add a mopidy service designed for angular

angular.module('partyApp', [])
  .controller('MainController', function($scope) {

  // Initialize

  var mopidy = new Mopidy({
    'callingConvention' : 'by-position-or-by-name'
  });

  $scope.tracks = [];

  $scope.search = function(){

    $scope.loading = true;

    mopidy.library.search({
      'any' : [$scope.searchField]
    }).done(function(res){
      $scope.loading = false;
      $scope.tracks  = [];

      var _index = 0;
      var _found = true;
      while(_found){
        _found = false;
        for(var i = 0; i < res.length; i++){
          if(res[i].tracks && res[i].tracks[_index]){
            $scope.tracks.push(res[i].tracks[_index]);
            _found = true;
          }
        }
        _index++;
      }

      $scope.$apply();
    });
  };

  $scope.addTrack = function(track){
    mopidy.tracklist
    .index()
    .then(function(index){
      return mopidy.tracklist.add({uris: [track.uri], at_position: index+1});
    })
    .then(function(){
      // Notify user
      $scope.message = ['track_added', track.name];
      $scope.$apply();
      return mopidy.tracklist.setConsume([true]);
    })
    .then(function(){
      return mopidy.playback.getState();
    })
    .then(function(state){
      // Get current state
      if(state !== 'stopped')
        return;
      // If stopped, start music NOW!
      return mopidy.playback.play();
    })
    .catch(function(){
      $scope.message = ['error'];
      $scope.$apply();
    })
    .done();
  };


});
