****************************
Mopidy-Party
****************************

Mopidy web extension designed for party! Let your guests manage the sound ;)

- Minimal, fast web interface designed for mobile
- Search soundtracks and add it to the queue
- Skip current track (only if at least 1 min played from current track)

See this `blog entry <http://blog.lesterpig.com/2015/09/01/Build-a-connected-jukebox-from-a-Raspberry-Pi/>`_ for some details about this package.

Installation
============

You must install `mopidy <https://www.mopidy.com/>`_ and some backends (soundcloud, spofity, youtube...).

**PROD:** you just have to install pip and then::

    sudo pip install Mopidy-Party

**DEV:** After cloning the repository, install by running::

    sudo pip install -e .


Project resources
=================

- `Source code <https://github.com/Lesterpig/mopidy-party>`_
- `Issue tracker <https://github.com/Lesterpig/mopidy-party/issues>`_
- `Development branch tarball <https://github.com/Lesterpig/mopidy-party/archive/master.tar.gz#egg=Mopidy-Party-dev>`_


Changelog
=========

v0.1.2 (2016-10-10)
----------------------------------------

- Add artists and album names in songs list

v0.1.0 (2015-09-01)
----------------------------------------

- Initial release.
