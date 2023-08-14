import os

import tornado.web

from mopidy import config, ext

__version__ = '1.2.1'


class VoteRequestHandler(tornado.web.RequestHandler):

    def initialize(self, core, data, config):
        self.core = core
        self.data = data
        self.requiredVotes = config["party"]["votes_to_skip"]

    def _getip(self):
        return self.request.headers.get("X-Forwarded-For", self.request.remote_ip)

    def get(self):
        currentTrack = self.core.playback.get_current_track().get()
        if (currentTrack == None): return
        currentTrackURI = currentTrack.uri

        # If the current track is different to the one stored, clear votes
        if (currentTrackURI != self.data["track"]):
            self.data["track"] = currentTrackURI
            self.data["votes"] = []

        if (self._getip() in self.data["votes"]): # User has already voted
            self.write("You have already voted to skip this song =)")
        else: # Valid vote
            self.data["votes"].append(self._getip())
            if (len(self.data["votes"]) == self.requiredVotes):
                self.core.playback.next()
                self.write("Skipping...")
            else:
                self.write("You have voted to skip this song. ("+str(self.requiredVotes-len(self.data["votes"]))+" more votes needed)")


class AddRequestHandler(tornado.web.RequestHandler):

    def initialize(self, core, data, config):
        self.core = core
        self.data = data

    def _getip(self):
        return self.request.headers.get("X-Forwarded-For", self.request.remote_ip)

    def post(self):
        # when the last n tracks were added by the same user, abort.
        if self.data["queue"] and all([e == self._getip() for e in self.data["queue"]]):
            self.write("You have requested too many songs")
            self.set_status(403)
            return

        track_uri = self.request.body.decode()
        if not track_uri:
            self.set_status(400)
            return

        self.data["queue"].append(self._getip())
        self.data["queue"].pop(0)

        pos = 0
        if self.data["last"]:
            queue = self.core.tracklist.index(self.data["last"]).get() or 0
            current = self.core.tracklist.index().get() or 0
            pos = max(queue, current) # after lastly enqueued and after current track

        try:
            self.data["last"] = self.core.tracklist.add(uris=[track_uri], at_position=pos+1).get()[0]
        except:
            self.write("Unable to add track, please try again...")
            self.set_status(400)
            return

        self.core.tracklist.set_consume(True)
        if self.core.playback.get_state().get() == "stopped":
            self.core.playback.play()


class IndexHandler(tornado.web.RequestHandler):
    def initialize(self, config):
        self.__dict = {}
		# Make the configuration from mopidy.conf [party] section available as variables in index.html
        for conf_key, value in config["party"].items():
            if conf_key != 'enabled':
                self.__dict[conf_key] = value

    def get(self):
        return self.render('static/index.html', **self.__dict)
    

def party_factory(config, core):
    from tornado.web import RedirectHandler
    data = {'track':"", 'votes':[], 'queue': [None] * config["party"]["max_tracks"], 'last':None}
    
    return [
    ('/', RedirectHandler, {'url': 'index.html'}), #always redirect from extension root to the html
    ('/index.html', IndexHandler, {'config': config }),
    ('/vote', VoteRequestHandler, {'core': core, 'data':data, 'config':config}),
    ('/add', AddRequestHandler, {'core': core, 'data':data, 'config':config})
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
        schema['max_tracks'] = config.Integer(minimum=0)
        schema['hide_pause'] = config.Boolean(optional=True)
        schema['hide_skip'] = config.Boolean(optional=True)
        schema['style'] = config.String()
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
