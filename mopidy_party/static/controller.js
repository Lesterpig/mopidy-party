'use strict';

// TODO : add a mopidy service designed for angular, to avoid ugly $scope.$apply()...
angular.module('partyApp', [])
  .controller('MainController', function ($scope, $http, $timeout, $window) {

    // Scope variables
    $scope.message = [];
    let messageTimer = null;
    $scope.messageFadingOut = false;
    $scope.messagePosition = { top: '30px', left: '5px' };
    $scope.tracks = [];
    $scope.tracksToLookup = [];
    $scope.maxTracksToLookup = 50; // Will be overwritten later by module config
    $scope.loading = true;
    $scope.maxSongLengthMS = 0; //0 No limit. May be overwritten by module config
    $scope.searching = false;
    $scope.searchingSources = [];
    $scope.submitSymbol = '↵';
    $scope.ready = false;
    $scope.autosubmitTime = 0; //0 No autosubmit. May be overwritten by module config
    let countdownInterval;
    let countdownTime;
    $scope.currentState = {
      paused: false,
      length: 0,
      track: {
        length: 0,
        name: 'Nothing playing, add some songs to get the party going!'
      }
    };
    $scope.sources_blacklist = ['cd', 'file']; // Will be overwritten later by module config
    $scope.sources_priority = ['local'];       // Will be overwritten later by module config
    $scope.prioritized_sources = [];

    // Get the max tracks to lookup at once from the 'max_results' config value in mopidy.conf
    $http.get('/party/config?key=max_results').then(function success (response) {
      if (response.status == 200) {
        $scope.maxTracksToLookup = response.data;
      }
    }, null);

    // Get the max song length 'max_song_duration' config value in mopidy.conf (minutes)
    $http.get('/party/config?key=max_song_duration').then(function success (response) {
      if (response.status == 200) {
        $scope.maxSongLengthMS = response.data * 60000;
      }
    }, null);

    function parseConfigList(data) {
      return String(data || '')
        .replace(/^['"]|['"]$/g, '')
        .replace(/\\n/g, '\n')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('#'));
    }

    // Get the source priority list
    $http.get('/party/config?key=source_prio').then(function success (response) {
      if (response.status == 200) {
        $scope.sources_priority = parseConfigList(response.data);
      }
    }, null);
    // Get the source blacklist
    $http.get('/party/config?key=source_blacklist').then(function success (response) {
      if (response.status == 200) {
        $scope.sources_blacklist = parseConfigList(response.data);
      }
    }, null);

    // Get the autosubmit time
    $http.get('/party/config?key=autosubmit_time').then(function success (response) {
      if (response.status == 200) {
        $scope.autosubmitTime = response.data;
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
          $scope.searching = false;
          $scope.$apply();
          $scope.search();
        });

      /* Initialize available sources */
      mopidy.library.browse({ "uri": null }).done(
        function (uri_results){
          $scope.sources = uri_results.map(source => source.uri.split(":")[0]);
          $scope.prioritized_sources = getPrioritizedSources($scope.sources, $scope.sources_priority, $scope.sources_blacklist)
        }
      );

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
      if ($scope.autosubmitTime > 0) {
        cancelCountdown();
      }
      $scope.message = [];
      $scope.tracks = [];
      $scope.tracksToLookup = [];
      $scope.searchingSources = [];

      if (!$scope.searchField) {
        $scope.browse();
      } else {
        $scope.searchSourcesInOrder();
      }
    };

    //Autosubmit with countdown
    $scope.$watch('searchField', function(newVal, oldVal) {
      if ($scope.autosubmitTime > 0) {     
        if (newVal !== oldVal) {
          cancelCountdown(); // Reset previous timeouts
          countdownTime = $scope.autosubmitTime;
          startCountdown();
        }
      }
    });

    $scope.browse = function () {
        mopidy.library.browse({
          'uri': 'local:directory'  //TODO: depend on source_prio
        }).done($scope.handleBrowseResult);
        return;
    }

    $scope.handleBrowseResult = function (res) {
      $scope.loading = false;
      $scope.searching = false;
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
        var tracks = Object.values(tracklistResult).reduce(function (allTracks, singleTrackResult) {
          return allTracks.concat(singleTrackResult || []);
        }, []);
        $scope.addTrackResults(tracks);
      });
    };

    $scope.searchSourcesInOrder = function () {
      $scope.searchingSources = angular.copy($scope.prioritized_sources);
      $scope.searching = true;

      for (const src of $scope.prioritized_sources) {
        $scope.searchSources([src]);
      }
    }

    $scope.searchSources = function ($sourceList) {
      if($sourceList.length > 0) {
        mopidy.library.search({
          'query': {
            'any': [$scope.searchField]
          },
          'uris': $sourceList.map(source => source + ':')
        }).done($scope.handleSearchResult);
      }
    }

    $scope.handleSearchResult = function (res) {
      var _index = 0;
      var _found = true;
      const index = $scope.searchingSources.indexOf(getSource(res));
      if (index !== -1) {
        $scope.searchingSources.splice(index, 1);
      }
      for (var i = 0; i < res.length; i++) {
        if (res[i].tracks) {
          _index += $scope.addTrackResults(res[i].tracks);
        }
        if (_index >= $scope.maxTracksToLookup) {
          break;
        }
      }
      if ($scope.searchingSources.length < 1) {
        $scope.searching = false;
      }
      $scope.$apply();
    };

    $scope.addTrackResults = function (tracks) {
      let uris = [];
      tracks.forEach(function(track) {
        if ($scope.maxSongLengthMS <= 0 || track.length <= $scope.maxSongLengthMS) {
          $scope.tracks.push(track);
          uris.push(track.uri);
        }
      });
      mopidy.tracklist.filter([{ 'uri': uris }]).done(
        function (matches) {
          if (matches && matches.length) {
            $scope.$apply(function() {
              const matchedUris = new Set(matches.map(m => m.track.uri));
              $scope.tracks.forEach(function(track) {
                if (matchedUris.has(track.uri)) {
                  track.disabled = true;
                }
              });
            });
          }
        }
      );
      
      $scope.$apply();
      return uris.length; //Return the number of tracks added to the list
    };

    $scope.addTrack = function (track, event) {
      track.disabled = true;

      $http.post('/party/add', track.uri).then(
        function success(response) {
          $scope.setMessage('success', 'Queued: ' + track.name, event);
        },
        function error(response) {
          if (response.status === 409) {
            $scope.setMessage('error', '' + response.data, event);
          } else {
            $scope.setMessage('error', 'Code ' + response.status + ' - ' + response.data, event);
          }
        }
      );
    };

    $scope.nextTrack = function (event) {
      $http.get('/party/vote').then(
        function success(response) {
          $scope.setMessage('success', '' + response.data, event);
        },
        function error(response) {
          $scope.setMessage('error', '' + response.data, event);
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
      var sources_with_fa_icon = ['bandcamp', 'mixcloud', 'pandora', 'soundcloud', 'spotify', 'youtube', 'tidal'];
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

    //CONTROL PANEL STYLE START
    function adjustBodyPadding() {
      var controlPanel = document.getElementById('controlpanel');
      if (controlPanel) {
        document.body.style.paddingTop = controlPanel.offsetHeight + 'px';
      }
    }
    $timeout(adjustBodyPadding);
    angular.element($window).on('resize', adjustBodyPadding);
    $scope.$on('$destroy', function () {
      angular.element($window).off('resize', adjustBodyPadding);
    });
    //CONSTROL PANEL STYLE END

    //MESSAGE STYLE START
    $scope.setMessage = function(type, text, event) {
      $scope.message = [type, text];
      $scope.messageFadingOut = false;

      if (event && event.clientX !== undefined && event.clientY !== undefined) {
        var maxLeft = Math.max(10, $window.innerWidth - 260);
        var maxTop = Math.max(10, $window.innerHeight - 120);
        $scope.messagePosition = {
          top: Math.min(event.clientY, maxTop) + 'px',
          left: Math.min(event.clientX, maxLeft) + 'px'
        };
      } else {
        $scope.messagePosition = { top: '30px', left: '5px' };
      }

      if (type === 'error') {
        console.error('Error:', text);
      }

      if (messageTimer) {
        $timeout.cancel(messageTimer);
      }

      messageTimer = $timeout(function() {
        $scope.messageFadingOut = true;

        $timeout(function() {
          $scope.message = [];
          $scope.messageFadingOut = false;
          messageTimer = null;
        }, 500); // match fade-out time in CSS
      }, 5000);
    };

    $scope.closeMessage = function () {
      if (messageTimer) {
        $timeout.cancel(messageTimer);
        messageTimer = null;
      }
      $scope.message = [];
      $scope.messageFadingOut = false;
    };
    //MESSAGE STYLE END

    //SEARCH COUNTDOWN START
    function startCountdown() {
      $scope.submitSymbol = countdownTime.toString();
      countdownInterval = $timeout(function tick() {
        countdownTime--;
        if (countdownTime > 0) {
          $scope.submitSymbol = countdownTime.toString();
          countdownInterval = $timeout(tick, 1000);
        } else {
          $scope.search();
          $scope.submitSymbol = '↵';
        }
      }, 1000);
    }

    function cancelCountdown() {
      $timeout.cancel(countdownInterval);
      countdownTime = $scope.autosubmitTime;
      $scope.submitSymbol = '↵';
    }
    //SEARCH COUNTDOWN END

  });

function getPrioritizedSources (availablesources, sourceprio, blacklist) {
    const blacklistSet = new Set(blacklist); //eliminate duplicates
    const availableSet = new Set(availablesources);
    const prioritized = sourceprio.filter(src => availableSet.has(src) && !blacklistSet.has(src));
    const remaining = availablesources.filter(src => !blacklistSet.has(src) && !prioritized.includes(src));
    return [...prioritized, ...remaining];
}

function findFirstUri (obj) {
  if (typeof obj !== 'object' || obj === null) return null;

  if ('uri' in obj && typeof obj.uri === 'string') {
    return obj.uri;
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const found = findFirstUri(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

function getSource (result) {
  var uri = findFirstUri(result);
  if (uri) {
    return uri.split(':', '1')[0];
  }
  return ""
}
