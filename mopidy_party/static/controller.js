'use strict';

// TODO : add a mopidy service designed for angular, to avoid ugly $scope.$apply()...
angular.module('partyApp', [])
  .controller('MainController', function($scope, $http) {

  // Scope variables
  $scope.message = [];
  $scope.tracks  = [];
  $scope.tracksToLookup = [];
  $scope.maxTracksToLookupAtOnce = 50; //note: will be overwritten by config value
  $scope.loading = true;
  $scope.ready   = false;
  $scope.currentState = {
    paused : false,
    length : 0,
    track  : {
      length : 0,
      name   : 'Nothing playing, add some songs to get the party going!'
    }
  };

  //Get the max tracks to lookup at once from the "max_results" config value in mopidy.conf
  $http.get('/party/config?key=max_results').then(function success(response){
	if (response.status == 200) {
		$scope.maxTracksToLookupAtOnce = response.data;
	}
  }, null);


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
      $scope.search();
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
  
  $scope.search = function(){

    $scope.message = [];
    $scope.loading = true;

    if(!$scope.searchField) {
      mopidy.library.browse({
        'uri' : 'local:directory'
      }).done($scope.handleBrowseResult);
      return;
    }

    mopidy.library.search({
      'query': {
        'any' : [$scope.searchField]
      }
    }).done($scope.handleSearchResult);
  };

  $scope.handleBrowseResult = function(res){
    $scope.loading = false;
    $scope.tracks  = [];
    $scope.tracksToLookup = [];

    for(var i = 0; i < res.length; i++){
      if(res[i].type == 'directory' && res[i].uri == 'local:directory?type=track'){
        mopidy.library.browse({
          'uri' : res[i].uri
        }).done($scope.handleBrowseResult);
      } else if(res[i].type == 'track'){
        $scope.tracksToLookup.push(res[i].uri);
      }
    }
    if($scope.tracksToLookup) {
      $scope.lookupOnePageOfTracks();
    }
  }

  $scope.lookupOnePageOfTracks = function(){
	//the splice function returns and removes the elements from the list of tracks to show in one page
	mopidy.library.lookup({'uris' : $scope.tracksToLookup.splice(0, $scope.maxTracksToLookupAtOnce)}).done(function(tracklistResult){
		//mopidy.library.lookup delivers a JSON object, we unwrap it with Object.values() into an array.
		//Each result is an array in itself, where the first (0'th) element is a track object, so we convert the result array using a 
		//simple lambda function that converts each result to the track-part only (0'th element).
		var browseTracklist = Object.values(tracklistResult).map((singleTrackResult) => singleTrackResult[0]);
		for(var j = 0; j < browseTracklist.length; j++){
          $scope.addTrackResult(browseTracklist[j]);
        }
        $scope.$apply();
    });
  };


  $scope.handleSearchResult = function(res){

    $scope.loading = false;
    $scope.tracks  = [];

    var _index = 0;
    var _found = true;
    while(_found){
      _found = false;
      for(var i = 0; i < res.length; i++){
        if(res[i].tracks && res[i].tracks[_index]){
          $scope.addTrackResult(res[i].tracks[_index]);
          _found = true;
        }
      }
      _index++;
    }

    $scope.$apply();
  };

  $scope.addTrackResult = function(track){
    $scope.tracks.push(track);
	mopidy.tracklist.filter([{'uri': [track.uri]}]).done(
      function(matches){
        if (matches.length) {
          for (var i = 0; i < $scope.tracks.length; i++)
          {
            if ($scope.tracks[i].uri == matches[0].track.uri)
              $scope.tracks[i].disabled = true;
          }
          $scope.$apply();
        }
      });
  };

  $scope.addTrack = function(track){
    track.disabled = true;

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "POST", "/party/add", false ); // false for synchronous request
    xmlHttp.send(track.uri);
    var msgtype = 'success'
    if (xmlHttp.status >= 400) {
      track.disabled = false;
      $scope.message = ['error', xmlHttp.responseText];
    } else {
      $scope.message = ['success', 'Queued: ' + track.name];
    }
    $scope.$apply();
  };

  $scope.nextTrack = function(){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", "/party/vote", false ); // false for synchronous request
    xmlHttp.send( null );
    $scope.message = ['success', xmlHttp.responseText];
    $scope.$apply();
  };
  
  $scope.getTrackSource = function(track){
    var sourceAsText = "unknown";
    if (track.uri) {
      sourceAsText = track.uri.split(":", "1")[0];
    }
    return sourceAsText;
  };
  
    
  $scope.getFontAwesomeIcon = function(source){
    var sources_with_fa_icon = ["bandcamp", "mixcloud", "soundcloud", "spotify", "youtube"];
    var css_class =  "fa fa-music";
    if (source == "local") {
      css_class = "fa fa-folder";
    } else if (sources_with_fa_icon.includes(source)) {
      css_class = "fa-brands fa-"+source;
    }
    return css_class;
  };


  $scope.togglePause = function(){
    var _fn = $scope.currentState.paused ? mopidy.playback.resume : mopidy.playback.pause;
    _fn().done();
  };

});
