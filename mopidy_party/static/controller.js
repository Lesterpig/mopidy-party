'use strict';

var MIN_DURATION_BEFORE_SKIP = 60000;

// TODO : add a mopidy service designed for angular, to avoid ugly $scope.$apply()...

angular.module('partyApp', [])
  .controller('MainController', function($scope) {

  // Scope variables

  $scope.message = [];
  $scope.tracks  = [];
  $scope.loading = true;
  $scope.ready   = false;
  $scope.currentState = {
    paused : false,
    length : 0,
    track  : {
      length : 0,
      name   : '-'
    }
  };

  // Initialize

  var mopidy = new Mopidy({
    'callingConvention' : 'by-position-or-by-name'
  });

  // Adding listenners

  mopidy.on('state:online', function () {
    mopidy.playback
    .getCurrentTrack()
    .then(function(track){
      if(track)
        $scope.currentState.track = track;
      return mopidy.playback.getState();
    })
    .then(function(state){
      $scope.currentState.paused = (state === 'paused');
      return mopidy.tracklist.getLength();
    })
    .then(function(length){
      $scope.currentState.length = length;
    })
    .done(function(){
      $scope.ready   = true;
      $scope.loading = false;
      $scope.$apply();
    });
  });
  mopidy.on('event:playbackStateChanged', function(event){
    $scope.currentState.paused = (event.new_state === 'paused');
    $scope.$apply();
  });
  mopidy.on('event:trackPlaybackStarted', function(event){
    $scope.currentState.track = event.tl_track.track;
    $scope.$apply();
  });
  mopidy.on('event:tracklistChanged', function(){
    mopidy.tracklist.getLength().done(function(length){
      $scope.currentState.length = length;
      $scope.$apply();
    });
  });

  $scope.printDuration = function(track){

    if(!track.length)
      return '';

    var _sum = parseInt(track.length / 1000);
    var _min = parseInt(_sum / 60);
    var _sec = _sum % 60;

    return '(' + _min + ':' + (_sec < 10 ? '0' + _sec : _sec) + ')' ;
  };

  $scope.togglePause = function(){
    var _fn = $scope.currentState.paused ? mopidy.playback.resume : mopidy.playback.pause;
    _fn().done();
  };

  $scope.search = function(){

    if(!$scope.searchField)
      return;

    $scope.message = [];
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
            mopidy.tracklist.filter({'uri': [res[i].tracks[_index].uri]}).done(function(matches){
		if (matches.length) {
		  for (var i = 0; i < $scope.tracks.length; i++)
		  {
		    if ($scope.tracks[i].uri == matches[0].track.uri)
		    	$scope.tracks[i].disabled = true;
		    console.log(matches[0].track.uri);
		    console.log($scope.tracks[i].uri);
		  }
		  $scope.$apply();
		}
	    });
          }
        }
        _index++;
      }

      $scope.$apply();
    });
  };

  $scope.addTrack = function(track){

    track.disabled = true;

    mopidy.tracklist
    .index()
    .then(function(index){
      return mopidy.tracklist.add({uris: [track.uri]});
    })
    .then(function(){
      // Notify user
      $scope.message = ['success', 'Next track: ' + track.name];
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
      track.disabled = false;
      $scope.message = ['error', 'Unable to add track, please try again...'];
      $scope.$apply();
    })
    .done();
  };

  $scope.nextTrack = function(){
    /*mopidy.playback
    .getTimePosition()
    .then(function(time){
      if(time < MIN_DURATION_BEFORE_SKIP){
        var _toWait = parseInt((MIN_DURATION_BEFORE_SKIP - time)/1000);
        $scope.message = ['error', 'Please wait at least '+_toWait+' seconds ;)'];
        return;
      }
      $scope.message = ['success', 'All right, next music will start now!'];
      return mopidy.playback.next();
    })
    .done(function(){
      $scope.$apply();
    });*/
    
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", "/party/vote", false ); // false for synchronous request
    xmlHttp.send( null );
    $scope.message = ['success', xmlHttp.responseText];
    $scope.$apply();
  };


});
