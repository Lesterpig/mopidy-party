'use strict';

// TODO : add a mopidy service designed for angular, to avoid ugly $scope.$apply()...
angular.module('partyApp', [])
  .controller('MainController', function ($scope, $http) {

    // Scope variables
    $scope.message = [];
    $scope.tracks = [];
    $scope.tracksToLookup = [];
    $scope.maxTracksToLookup = 50; // Will be overwritten later by module config
    $scope.loading = true;
    $scope.ready = false;
    $scope.currentState = {
      paused: false,
      length: 0,
      track: {
        length: 0,
        name: 'Nothing playing, add some songs to get the party going!'
      }
    };

    // Get the max tracks to lookup at once from the 'max_results' config value in mopidy.conf
    $http.get('/party/config?key=max_results').then(function success(response) {
      if (response.status == 200) {
        $scope.maxTracksToLookup = +response.data;
      }
    }, null);

    var mopidy = new Mopidy({
      'callingConvention': 'by-position-or-by-name'
    });

    mopidy.on('state:online', function () {
      mopidy.playback
        .getCurrentTrack()
        .then(function (track) {
          if (track)
            $scope.currentState.track = track;
          return mopidy.playback.getState();
        })
        .then(function (state) {
          $scope.currentState.paused = (state === 'paused');
          return mopidy.tracklist.getLength();
        })
        .then(function (length) {
          $scope.currentState.length = length;
        })
        .done(function () {
          $scope.ready = true;
          $scope.loading = false;
          $scope.$apply();
          $scope.search();
        });
    });

    mopidy.on('event:playbackStateChanged', function (event) {
      $scope.currentState.paused = (event.new_state === 'paused');
      $scope.$apply();
    });

    mopidy.on('event:trackPlaybackStarted', function (event) {
      $scope.currentState.track = event.tl_track.track;
      $scope.$apply();
    });

    mopidy.on('event:tracklistChanged', function () {
      mopidy.tracklist.getLength().done(function (length) {
        $scope.currentState.length = length;
        $scope.$apply();
      });
    });

    $scope.printDuration = function (track) {
      if (!track.length)
        return '';

      var _sum = parseInt(track.length / 1000);
      var _min = parseInt(_sum / 60);
      var _sec = _sum % 60;

      return '(' + _min + ':' + (_sec < 10 ? '0' + _sec : _sec) + ')';
    };

    $scope.search = function () {
      $scope.message = [];
      $scope.loading = true;

      if (!$scope.searchField) {
        mopidy.library.browse({
          'uri': 'local:directory'
        }).done($scope.handleBrowseResult);
        return;
      }

      mopidy.library.search({
        'query': {
          'any': [$scope.searchField]
        }
      }).done($scope.handleSearchResult);
    };

    $scope.handleBrowseResult = function (res) {
      $scope.loading = false;
      $scope.tracks = [];
      $scope.tracksToLookup = [];

      for (var i = 0; i < res.length; i++) {
        if (res[i].type == 'directory' && res[i].uri == 'local:directory?type=track') {
          mopidy.library.browse({
            'uri': res[i].uri
          }).done($scope.handleBrowseResult);
        } else if (res[i].type == 'track') {
          $scope.tracksToLookup.push(res[i].uri);
        }
      }

      if ($scope.tracksToLookup) {
        $scope.lookupOnePageOfTracks();
      }
    }

    $scope.lookupOnePageOfTracks = function () {
      mopidy.library.lookup({ 'uris': $scope.tracksToLookup.splice(0, $scope.maxTracksToLookup) }).done(function (tracklistResult) {
        Object.values(tracklistResult).map(function(singleTrackResult) { return singleTrackResult[0]; }).forEach($scope.addTrackResult);
      });
    };


    $scope.handleSearchResult = function (res) {
      $scope.loading = false;
      $scope.tracks = [];
      $scope.tracksToLookup = [];

      var _index = 0;
      var _found = true;
      while (_found && _index < $scope.maxTracksToLookup) {
        _found = false;
        for (var i = 0; i < res.length; i++) {
          if (res[i].tracks && res[i].tracks[_index]) {
            $scope.addTrackResult(res[i].tracks[_index]);
            _found = true;
          }
        }
        _index++;
      }

      $scope.$apply();
    };

    $scope.addTrackResult = function (track) {
      $scope.tracks.push(track);
      mopidy.tracklist.filter([{ 'uri': [track.uri] }]).done(
        function (matches) {
          if (matches.length) {
            for (var i = 0; i < $scope.tracks.length; i++) {
              if ($scope.tracks[i].uri == matches[0].track.uri)
                $scope.tracks[i].disabled = true;
            }
          }
          $scope.$apply();
        });
    };

    $scope.addTrack = function (track) {
      track.disabled = true;

      $http.post('/party/add', track.uri).then(
        function success(response) {
          $scope.message = ['success', 'Queued: ' + track.name];
        },
        function error(response) {
          if (response.status === 409) {
            $scope.message = ['error', '' + response.data];
          } else {
            $scope.message = ['error', 'Code ' + response.status + ' - ' + response.data];
          }
        }
      );
    };

    $scope.nextTrack = function () {
      $http.get('/party/vote').then(
        function success(response) {
          $scope.message = ['success', '' + response.data];
        },
        function error(response) {
          $scope.message = ['error', '' + response.data];
        }
      );
    };

    $scope.getTrackSource = function (track) {
      var sourceAsText = 'unknown';
      if (track.uri) {
        sourceAsText = track.uri.split(':', '1')[0];
      }

      return sourceAsText;
    };

    $scope.getFontAwesomeIcon = function (source) {
      var sources_with_fa_icon = ['bandcamp', 'mixcloud', 'soundcloud', 'spotify', 'youtube'];
      var css_class = 'fa fa-music';

      if (source == 'local') {
        css_class = 'fa fa-folder';
      } else if (sources_with_fa_icon.includes(source)) {
        css_class = 'fa-brands fa-' + source;
      }

      return css_class;
    };

    $scope.togglePause = function () {
      var _fn = $scope.currentState.paused ? mopidy.playback.resume : mopidy.playback.pause;
      _fn().done();
    };
  });
