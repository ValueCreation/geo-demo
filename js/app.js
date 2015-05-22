// app.js - Main app functions

var page = 0;

var geomService;

var webmap;

var map;

var mapLayersLoaded = false;

var lyrStores;

var lyrEnrichment;

var lyrFences;

var lyrAnalysis;

var storeCount;

var fences;

var selectedFence;

var income = 0;

var distance = 100;
var natOrgIndex = 0;

var topStore;

var counterStores;

var counterTriggers;

var counterSales;

var filterTimer;

var distanceTimer;
var natOrgIndexTimer;

var timer;

var chomonicxLayer;
var geodemoLayer;

// Load config XML file
dojo.addOnLoad(init);

// -- MAP FUNCTIONS -- //

// INIT
function init(){
	
	loadCounters();

	dojo.parser.parse();
	
	//esri.config.defaults.io.proxyUrl = config.proxyURL;
 	geomService = new esri.tasks.GeometryService(config.geomURL);
 	
	var mapDeferred = esri.arcgis.utils.createMap(config.webmap, "map", {
		mapOptions: {
			wrapAround180:true,
			slider: true,
			nav: false,
			logo: true
		},
		ignorePopups: false
	});
		
	mapDeferred.addCallback(function(response) {
    	
		map = response.map;
		
		lyrFences = new esri.layers.GraphicsLayer();
		lyrFences.setVisibility(false);
		map.addLayer(lyrFences);
		
		dojo.connect(lyrFences, "onClick", fenceClickHandler);	
		dojo.connect(map, "onExtentChange", createCircles);
		dojo.connect(map, "onUpdateEnd", mapUpdateEnd);
		
		//init layers
		var layers = response.itemInfo.itemData.operationalLayers;  
		for (var i=0; i<layers.length; i++) {
			if (layers[i].title == "ChomonicxSwebM") {
				chomonicxLayer = layers[i];
				chomonicxLayer.layerObject.setVisibility(false);
			} else if (layers[i].title == config.lyrStores) {
				geodemoLayer = layers[i];
				geodemoLayer.layerObject.setVisibility(true);
			}
		}

		if (map.loaded) {
			initMap(layers);
		} else {
			dojo.connect(map,"onLoad",function() {
    				initMap(layers);
  			});
  		}

  		var basemapGallery = new esri.dijit.BasemapGallery({
          		showArcGISBasemaps: true,
			map: map
		}, "basemapGallery");
		
		basemapGallery.startup();
        
		basemapGallery.on("error", function(msg) {
			console.log("basemap gallery error:  ", msg);
		});
		
	});
	
	mapDeferred.addErrback(function(error) {
		console.log("Map creation failed: ", dojo.toJson(error));
	});

}

// FENCE CLICK HANDLER
function fenceClickHandler(event) {
	var gra = event.graphic;
	var id = gra.attributes.triggerId;
	for (var i=0; i<fences.length; i++) {
		var f = fences[i];
		if (f.attributes.triggerId = id) {
			selectedFence = f;
			break;
		}
	}
}

// MAP UPDATE END
function mapUpdateEnd() {
	if (mapLayersLoaded == false) {
		mapLayersLoaded = true;
	}
}

// INIT MAP
function initMap(layers){
	var layerInfo = dojo.map(layers, function(layer,index) {
		
		if (layer.title == config.lyrStores) {
			lyrStores = layer.layerObject;
			dojo.connect(lyrStores, "onUpdateEnd", storesUpdateEnd);
		}

	});
}

// STORES UPDATE END
function storesUpdateEnd() {
	var count = lyrStores.graphics.length;
	counterStores.setValue(count);
	createCircles();
	// setTimeout(function () {
		// updateStoresDefQuery();
	// }, 2000);	
}

// LOAD COUNTERS
function loadCounters() {
	var config = {
		digitsNumber : 5,
		direction : Counter.ScrollDirection.Upwards, 
		//characterSet : Counter.DefaultCharacterSets.numericUp,
		characterSet : "0123456789 ",
		charsImageUrl : "images/c.png",
		markerImageUrl : "images/marker.png"
	};
	counterStores = new Counter("panelStores", config);
	counterStores.value = 0;
	counterTriggers = new Counter("panelTriggers", config);
	counterTriggers.value = 0;
	counterSales = new Counter("panelSales", config);
	counterSales.value = 0;
}

//FILTER STORES BY URBANICITY, LIFEMODE & NAT/ORG
function updateStoresDefQuery() {
	var def = [];
	/*
	var uDef = getUrbanacityDefQuery();
	if (uDef)
		def.push(uDef);

	var lmDef = getLifeModeDefQuery();
	if (lmDef)
		def.push(lmDef);
	*/
	var noDef = getNatOrgDefQuery();
	if (noDef)
		def.push(noDef);
	
	lyrFences.clear();
	
	if ($("#lyrFences:checked").val()) {
		lyrFences.setVisibility(true);
	} else {
		lyrFences.setVisibility(false);
	}
	lyrStores.setDefinitionExpression(def.join(" AND "));

}

function getUrbanacityDefQuery() {
	var selected = [];
	$(".circle-selected").each(function (idx, item){
		selected.push(item.id);
	});

	if (selected.length == 0) {
		return null; 
	} else {
		return "Urbanacity IN ('" + selected.join("','") + "')";
	}
}

function getLifeModeDefQuery() {
	var val = $(".selectText").val();
	if (val == "all") {
		return null;
	} else {
		return "LIFENAME = '" + val + "'";
	}
}

function getNatOrgDefQuery() {
	var val = parseInt($( "#sliderDistanceN").slider("value"));
	var osake = $("#selectOsake").val();

	if (val == 0) {
		return null;
	} else {
		return "City_code <> '381' AND " + osake + " >= " + val;
	}
}

// CREATE CIRCLES
function createCircles(){
	//map.graphics.clear();
	fences = [];	

	var graphics = lyrStores.graphics;
	storeCount = graphics.length;
	for (var i=0; i<graphics.length; i++) {
		var gra = graphics[i];
		var id = gra.attributes.FID;
		var geom = gra.geometry;
		var pt = esri.geometry.webMercatorToGeographic(geom);
		var obj = {
			"condition": {
				"direction": "enter",
				"geo": {
					"latitude": pt.y,
	      				"longitude": pt.x,
	      				"distance": distance
    				}
  			},
			"triggerId": id
		};
		
		fences.push(createFenceGraphic(obj));
  		if (fences.length == storeCount) {
			renderFences();
  		}
	}
	
	/*
	if (page == 0) {
		var px = map.extent.getHeight() / map.height;
		var size = parseInt(distance / px);
		var lSym = new esri.symbol.SimpleLineSymbol("solid", new dojo.Color([0,0,0,0]), 1);
		var sym = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, size, lSym, new dojo.Color([0,0,0,0.2]));
		var graphics = lyrStores.graphics;
		for (var i=0; i<graphics.length; i++) {
			var gra = graphics[i];
			var mapPt = gra.geometry;
			map.graphics.add(new esri.Graphic(mapPt, sym));
		}
	}
	*/
}

// CREATE FENCE GRAPHIC
function createFenceGraphic(t) {
	var id = t.triggerId;
	var geo = t.condition.geo;
	var dist = geo.distance;
	var pt = new esri.geometry.Point(geo.longitude, geo.latitude);
	var ptWM = esri.geometry.geographicToWebMercator(pt);
	var attr = {
		triggerId: id,
		distance: dist,
		triggers: 0,
		sales: 0
	}
	var gra = new esri.Graphic(ptWM, null, attr);
	return gra;
}

// RENDER FENCES
function renderFences() {
	
	lyrFences.clear();
	var fence;
	var id;
	var triggers = 0;

	var lSym = new esri.symbol.SimpleLineSymbol("solid", new dojo.Color([0,0,0,0]), 1);
	var rgb = getColorRGB(config.colors[1]);
	
	// OUTER
	for (var i=0; i<fences.length; i++) {
		fence = fences[i];
		id = fence.attributes.triggerId;
		triggers = fence.attributes.triggers;
		var symOuter = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 100, lSym, new dojo.Color([rgb[0],rgb[1], rgb[2], 0.2]));
		var gra1 = new esri.Graphic(fence.geometry, symOuter, {triggerId: id, type: "outer"});
		lyrFences.add(gra1);
	}
	
	map.reorderLayer(lyrFences, 1);

}

// GET FENCE GRAPHIC
function getFenceGraphic(id, type) {
	var graphics = lyrFences.graphics;
	for (var i=0; i<graphics.length; i++) {
		var gra = graphics[i];
		if (gra.attributes.triggerId == id && gra.attributes.type == type) {
			return gra;
		}
	}
	return null
}

// GET PERCENT
function getPercent(t) {
	var triggers = 0;
	var sales = 0;
	var pct = 0;
	triggers = t.attributes.triggers;
	sales = t.attributes.sales;
	if (triggers > 0 && sales > 0)
		pct = parseInt(sales/triggers*100);
	return pct;
}

// GET COLOR RGB
function getColorRGB(color) {
	var symColor = dojo.colorFromString(color);
	return symColor.toRgb(); 
}

// QUERY ERROR HANDLER
function queryErrorHandler(error) {
	console.log(error.message);
}

function selectChomonicxLayer() {

	if ($("#chomonicxLayer:checked").val()) {
		chomonicxLayer.layerObject.setVisibility(true);	
	} else {
		chomonicxLayer.layerObject.setVisibility(false);
	}


}

function selectGeoDemoLayer() {

	if ($("#geodemoLayer:checked").val()) {
		geodemoLayer.layerObject.setVisibility(true);	
	} else {
		geodemoLayer.layerObject.setVisibility(false);
	}

}

function selectLyrFences() {
	
	if ($("#lyrFences:checked").val()) {
		lyrFences.setVisibility(true);	
	} else {
		lyrFences.setVisibility(false);
	}

}

