****************************
Mopidy-Party
****************************

Mopidy web extension designed for party! Let your guests manage the sound ;)

- Minimal, fast web interface designed for mobile
- Search soundtracks and add it to the queue
- Skip current track after a configurable number of votes (defaults to 3)

See this `blog entry <https://blog.lesterpig.com/post/build-a-connected-jukebox-from-a-raspberry-pi/>`_ for some details about this package.

Installation
============

You must install `mopidy <https://www.mopidy.com/>`_ (version 3) and some backends (soundcloud, spotify, youtube...).

**PROD:** you just have to install pip and then::

    sudo python3 -m pip install Mopidy-Party

**DEV:** After cloning the repository, install by running::

    sudo python3 -m pip install -e .

Usage
=====

To use the interface, simply use your browser to visit your Mopidy instance's IP at port 6680 to see all available web interfaces.
For example, http://192.168.0.2:6680/

Direct access to Mopidy Party should then be: http://192.168.0.2:6680/party/

Configuration
=============

::

    [party]
    enabled = true
    votes_to_skip = 3  # Votes needed from different users to allow skipping a song.
    max_tracks = 0     # Maximum number of tracks that can be added by a single user in a row. 0 to disable.
    hide_pause = false # Change to true to hide the pause button
    hide_skip = false  # Change to true to hide the skip button 
    style = dark.css   # Stylesheet to use. Also embedded is original.css (light theme)
	max_results = 50   # Maximum number of tracks to show when searching / browsing on a single page

Project resources
=================

- `Source code <https://github.com/Lesterpig/mopidy-party>`_
- `Issue tracker <https://github.com/Lesterpig/mopidy-party/issues>`_
- `Development branch tarball <https://github.com/Lesterpig/mopidy-party/archive/master.tar.gz#egg=Mopidy-Party-dev>`_


Developer information
=====================

The RequestHandler 'config' makes `mopidy.conf` `[party]` configuration available via `http GET` requests. Useful if you want to make aspects of the controller configurable.

Example: The controller uses the below request, to read the `mopidy.conf` `[party]` section's `max_results` value.
.. code-block:: javascript

$http.get('/party/config?key=max_results')
 

Changelog
=========

v1.2.1 (2023-08-14)
----------------------------------------
- Add music source name and icon in search results (by grasdk)
- Bump fontawesome version

v1.2.0 (2022-12-21)
----------------------------------------
- Add hide_pause, hide_skip, style config options (by grasdk)
- Provide two default styles (dark and original)

v1.1.0 (2022-10-12)
----------------------------------------
- Use IP from X-Forwarded-For header if available (by girst) 
- Limit maximum number of tracks per user in a row (by girst)
- Allows fallback tracks (added by other mopidy frontends) (by girst)
- Dark mode (by girst)

v1.0.0 (2020-01-03)
----------------------------------------
- Port to python3 and Mopidy 3 (by girst)

v0.3.1 (2018-10-17)
----------------------------------------
- Vendorize mopidy javascript for 3.0 upstream compatibility

v0.3.0 (2018-08-03)
----------------------------------------
- Add browse when search string is empty and on load (supports both mopidy-local and mopidy-local-sqlite backends, by juniormonkey)

v0.2.0 (2017-01-08)
----------------------------------------
- Add vote to skip (by RealityFork)

v0.1.2 (2016-10-10)
----------------------------------------
- Add artists and album names in songs list

v0.1.0 (2015-09-01)
----------------------------------------
- Initial release.
