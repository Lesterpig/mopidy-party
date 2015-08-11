from __future__ import unicode_literals

from mopidy_party import Extension, frontend as frontend_lib


def test_get_default_config():
    ext = Extension()

    config = ext.get_default_config()

    assert '[party]' in config
    assert 'enabled = true' in config
