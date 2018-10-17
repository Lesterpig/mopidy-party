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

You must install `mopidy <https://www.mopidy.com/>`_ and some backends (soundcloud, spofity, youtube...).

**PROD:** you just have to install pip and then::

    sudo pip install Mopidy-Party

**DEV:** After cloning the repository, install by running::

    sudo pip install -e .

Usage
=====

To use the interface, simply point your browser to your Mopidy instance's IP address at port 6680 to see all available web interfaces.
For example, http://192.168.0.2:6680/

Direct access to Mopidy Party would then be: http://192.168.0.2:6680/party/

Configuration
=============

::

    [party]
    enabled = true
    votes_to_skip = 3

Project resources
=================

- `Source code <https://github.com/Lesterpig/mopidy-party>`_
- `Issue tracker <https://github.com/Lesterpig/mopidy-party/issues>`_
- `Development branch tarball <https://github.com/Lesterpig/mopidy-party/archive/master.tar.gz#egg=Mopidy-Party-dev>`_

Changelog
=========

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
