// Flickr plugin for Leaflet
// https://github.com/shurshur/Leaflet.Flickr

L.Flickr = L.FeatureGroup.extend({
	options: {
		maxLoad: 100, // max photos loaded in one request (should be less or equal 100)
		maxTotal: 300 // max total photos
	},

	initialize: function(api_key, options) {
		L.FeatureGroup.prototype.initialize.call(this);
		L.Util.setOptions(this, options);
		this._api_key = '16cee53eb308c07061310759d04424c0';
		this._load_licenses();
	},

	onAdd: function(map, insertAtTheBottom) {
		this._map = map;
		this._insertAtTheBottom = insertAtTheBottom;
		this._update('map');
		map.on('moveend', this._update, this);
		this.fire('add');
	},

	onRemove: function(map) {
		map.off('moveend', this._update, this);
		this.eachLayer(map.removeLayer, map);
		this.fire('remove');
	},

	_load: function(data) {
		for (var i = 0; i < data.photos.photo.length; i++) {
			var p = data.photos.photo[i];
			var ico = new L.Icon({
				iconUrl: p.url_t,
				shadowUrl: null,
				iconAnchor: [12,12],
				popupAnchor: [0,-12]
			});
			var m = new L.Marker([p.latitude,p.longitude], {icon: ico});
			var pdate = new Date(p.dateupload*1000);
			var months = ['January','February','March','April','May','June','July','August','Septepmber','October','November','December'];
			pdate = pdate.getDate()+'&nbsp;'+months[pdate.getMonth()]+'&nbsp;'+pdate.getFullYear();
			var plicense = this._licenses[p.license];
			if (plicense.url)
				plicense = '<a href=\"'+plicense.url+'\" target=\"_new\">'+plicense.name+'</a>';
			else
				plicense = plicense.name;
			var ptext = p.title+'<br/><a id="'+p.id+'" title="'+p.title+'" href="http://www.flickr.com/photos/'+p.owner+'/'+
				p.id+'/" target="_new"><img src="'+p.url_t +'" alt="'+p.title+'" width="167"/></a><br/>'+
				'&copy;&nbsp;<a href="http://www.flickr.com/people/'+p.owner+'/" target="_new">'+p.ownername+'</a>, '+
				plicense+', '+pdate;
				m.bindPopup(ptext);
			this.fire('addlayer', {
				layer: m
			});
			this.addLayer(m);
		}
		var ks = [];
		for(var key in this._layers)
			ks.push(key);
		for(var i = 0; i < ks.length-this.options.maxTotal; i++)
			this.removeLayer(this._layers[ks[i]]);
		//this.fire("loaded");
	},

	_load_licenses: function() {
		var url = 'https://api.flickr.com/services/rest/?method=flickr.photos.licenses.getInfo&api_key='+this._api_key+'&format=json&nojsoncallback=1';
		var req = new XMLHttpRequest();
		req.open('GET', url, false);
		var _this = this;
		req.onreadystatechange = function() {
			if (req.readyState !=4) return;
			if (req.status != 200) return;
			var json = JSON.parse(req.responseText);
			if (json.stat != 'ok') {
				alert('Flick API error:\n'+json.message);
				return;
			}
			_this._licenses = [];
			for (var i=0; i<json.licenses.license.length; i++) {
				var l = json.licenses.license[i];
				_this._licenses[l.id] = {};
				_this._licenses[l.id].name = l.name;
				_this._licenses[l.id].url = l.url;
			}
		}
		req.send(null);
	},

	_update: function() {
		var zoom = this._map.getZoom();
		var bounds = this._map.getBounds();
		var minll = bounds.getSouthWest();
		var maxll = bounds.getNorthEast();
  		if(this._zoom && this._bbox)
    			if(this._zoom == zoom && minll.lng >= this._bbox[0] && minll.lat >= this._bbox[1] && maxll.lng <= this._bbox[2] && maxll.lat <= this._bbox[3])
      				return;
  		var bbox = [];
  		bbox[0] = minll.lng;
  		bbox[1] = minll.lat;
  		bbox[2] = maxll.lng;
  		bbox[3] = maxll.lat;
		this._bbox = bbox;
		this._zoom = zoom;
		var url = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&bbox='+
			minll.lng+','+minll.lat+','+maxll.lng+','+maxll.lat+'&has_geo=1&format=json&extras=geo,url_t,owner_name,date_upload,license'+
			'&per_page='+this.options.maxLoad+'&api_key='+this._api_key+'&nojsoncallback=1'
		var req = new XMLHttpRequest();
		req.open('GET', url, false);
		var _this = this;
		req.onreadystatechange = function() {
			if (req.readyState !=4) return;
			if (req.status != 200) return;
			var json = JSON.parse(req.responseText);
			if(json.stat == 'ok')
				_this._load(json);
			else {
				// don't show error if code=4 && message="Not a valid bounding box"
				if (json.code == 4) return;
				alert('Flick API error:\n'+json.message);
			}
		}
		req.send(null);
	}

});
