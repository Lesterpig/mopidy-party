from __future__ import absolute_import, unicode_literals

import os

import tornado.web

from mopidy import ext, config

__version__ = '0.1.2'


class PartyRequestHandler(tornado.web.RequestHandler):
    REQUIRED_VOTES = 3

    def initialize(self, core, data):
	self.core = core
	self.data = data

    def get(self):
	ct = self.core.playback.get_current_track().get()
	if (ct == None): return
	ct = ct.uri
	if (ct != self.data["track"]):
	    self.data["track"] = ct
	    self.data["votes"] = []

	if (self.request.remote_ip in self.data["votes"]):
	    self.write("You have already voted to skip this song =)")
	else: # Valid vote
            self.data["votes"].append(self.request.remote_ip)
	    if (len(self.data["votes"]) == self.REQUIRED_VOTES):
		self.core.playback.next()
	    self.write("You have voted to skip this song. ("+str(self.REQUIRED_VOTES-len(self.data["votes"]))+" more votes needed)")



def party_factory(config, core):
    data = {'track': "", 'votes': []}
    return [
	('/vote', PartyRequestHandler, {'core': core, 'data':data})
    ]


class Extension(ext.Extension):

    dist_name = 'Mopidy-Party'
    ext_name = 'party'
    version = __version__

    def get_default_config(self):
        conf_file = os.path.join(os.path.dirname(__file__), 'ext.conf')
        return config.read(conf_file)

    def get_config_schema(self):
        schema = super(Extension, self).get_config_schema()
        return schema

    def setup(self, registry):
        registry.add('http:static', {
            'name': self.ext_name,
            'path': os.path.join(os.path.dirname(__file__), 'static'),
        })
	registry.add('http:app', {
	    'name': self.ext_name,
	    'factory': party_factory,
	})
