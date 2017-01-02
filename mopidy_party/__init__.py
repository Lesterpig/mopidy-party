from __future__ import absolute_import, unicode_literals

import os

import tornado.web

from mopidy import config, ext

__version__ = '0.1.2'


class PartyRequestHandler(tornado.web.RequestHandler):

	def initialize(self, core, config):
		self.core = core
		self.data = {'track':"", 'votes':[]}
		if ("votes_to_skip" in config["party"]):
			self.requiredVotes = config["party"]["votes_to_skip"]
		else:
			self.requiredVotes = 3

	def get(self):
		currentTrack = self.core.playback.get_current_track().get()
		if (currentTrack == None): return
		currentTrackURI = currentTrack.uri

		# If the current track is different to the one stored, clear votes
		if (currentTrackURI != self.data["track"]):
			self.data["track"] = currentTrackURI
			self.data["votes"] = []

		if (self.request.remote_ip in self.data["votes"]): # User has already voted
			self.write("You have already voted to skip this song =)")
		else: # Valid vote
			self.data["votes"].append(self.request.remote_ip)
			if (len(self.data["votes"]) == self.requiredVotes):
				self.core.playback.next()
				self.write("Skipping...")
			else:
				self.write("You have voted to skip this song. ("+str(self.requiredVotes-len(self.data["votes"]))+" more votes needed)")



def party_factory(config, core):
	return [
	('/vote', PartyRequestHandler, {'core': core, 'data':data, 'config':config})
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
		schema['votes_to_skip'] = config.Integer(minimum=0)
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
