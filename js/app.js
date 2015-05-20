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
		
		lyrAnalysis = new esri.layers.GraphicsLayer();
		lyrAnalysis.setVisibility(false);
		map.addLayer(lyrAnalysis);
		
		dojo.connect(map, "onExtentChange", createCircles);
		dojo.connect(map, "onUpdateEnd", mapUpdateEnd);
		
		//init layers
		var layers = response.itemInfo.itemData.operationalLayers;  
		
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
	showSelectedPanel();
}

// MAP UPDATE END
function mapUpdateEnd() {
	if (mapLayersLoaded == false) {
		mapLayersLoaded = true;
	}
}

// INIT MAP
function initMap(layers){
	var layerInfo = dojo.map(layers, function(layer,index){
		
		if (layer.title == config.lyrStores) {
			lyrStores = layer.layerObject;
			dojo.connect(lyrStores, "onUpdateEnd", storesUpdateEnd);
		}
	  		
		if (layer.title == config.lyrEnrichment) {
	  		lyrEnrichment = layer.layerObject;
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

// -- COUNTER FUNCTIONS -- //

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



// -- PAGE FUNCTIONS -- //

// CHANGE PAGE
function changePage(num) {
	page += num;
	if (page <0)
		page = 0;
	if (page > 2)
		page = 2;
	
	var startPos = dojo.style("panelContent", "left");
	var endPos = page * 800;
	if (endPos > 0)
		endPos = 0 - endPos;
	if (startPos != endPos) {
		var node = dojo.byId("panelContent");
		var anim1 = dojo.animateProperty({
	        node: node,
	        duration: 800,
	        easing: dojo.fx.easing['sineIn'],
	        properties: {
	            left: {
	            	start: startPos,
	                end: endPos
	            }
	        },
	        onEnd: function(){
              dojo.style("panelContent", "left", page*800);
          	}
	    });
	    var anim2 = dojo.animateProperty({
	        node: dojo.byId("panelContainer"),
	        duration: 800,
	        properties: {
	            backgroundColor: {
	            	start: dojo.style("panelContainer", "backgroundColor"),
	            	end: config.colors[page]
	            }
	        }
	    });
    	dojo.fx.combine([anim1, anim2]).play();
	}
	if (page == 0) {
		if (fences.length == 0) {
			dojo.style("panelNext", "display", "none");
		} else {
			dojo.style("panelNext", "display", "block");
		}
		dojo.style("panelPrevious", "display", "none");
	} else {
		dojo.style("panelPrevious", "display", "block");
	}
	if (page == 2) {
		dojo.style("panelNext", "display", "none");
	} else {
		dojo.style("panelNext", "display", "block");
	}
	togglePageLayers();	
	updateAnalysis();
}

// TOGGLE PAGE LAYERS
function togglePageLayers() {
	if (page == 0) {
		lyrFences.setVisibility(false);
		lyrStores.setVisibility(true);
		var chk = dojo.byId("chkFilter");
		// if (income>0) {
		// 	lyrEnrichment.setVisibility(true);
		// } else {
		// 	lyrEnrichment.setVisibility(false);
		// }
		lyrAnalysis.setVisibility(false);
		map.graphics.setVisibility(true);
		createCircles();
	} else if (page == 1) {
		lyrStores.setVisibility(false);
		// lyrEnrichment.setVisibility(false);
		lyrFences.setVisibility(true);
		lyrAnalysis.setVisibility(false);
		map.graphics.setVisibility(false);
	} else {
		lyrStores.setVisibility(false);
		// lyrEnrichment.setVisibility(false);
		lyrFences.setVisibility(false);
		lyrAnalysis.setVisibility(true);
		map.graphics.setVisibility(false);
	}
}



// -- FILTER FUNCTIONS -- //

// TOGGLE FILTER
function toggleFilter() {
	togglePageLayers();
	var chk = dojo.byId("chkFilter");
	if (chk.checked) {
		var value = $("#sliderFilter").slider("value");
		filterStores(value);
	} else {
		lyrStores.setDefinitionExpression("1=1");
	}
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
	var val = $(".selectText" ).val();
	if (val == "all") {
		return null;
	} else {
		return "LIFENAME = '" + val + "'";
	}
}

function getNatOrgDefQuery() {
	var val = parseInt($( "#sliderDistanceN" ).slider("value"));
	var osake = $("#selectOsake").val();

	if (val == 0) {
		return null;
	} else {
		return "Pref_code = '13' AND City_code <> '381' AND " + osake + " >= " + val;
	}
}

// FILTER STORES
function filterStores() {
	togglePageLayers();
	if (filterTimer)
		clearTimeout(filterTimer);
	//var chk = dojo.byId("chkFilter");
	var expr = "1=1";
	//if (chk.checked) {
		if (income > 0)
			expr = config.filterField + " >= " + (income * 1000);
		lyrStores.setDefinitionExpression(expr);
	//}
}

// UPDATE DISTANCE
function updateDistance() {
	if (distanceTimer)
		clearTimeout(distanceTimer);
	createCircles();
}

// CREATE CIRCLES
function createCircles(){
	map.graphics.clear();
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
}

// CREATE CIRCLES
function createCircles2(){

	if (distanceTimer)
		clearTimeout(distanceTimer);
		
	map.graphics.clear();
	var lSym = new esri.symbol.SimpleLineSymbol("solid", new dojo.Color([0,0,0,0]), 1);
	var sym = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, lSym, new dojo.Color([0,0,0,0.1]));
		
	var graphics = lyrStores.graphics;
	for (var i=0; i<graphics.length; i++) {
		var gra = graphics[i];
		var mapPoint = gra.geometry;
		var screenPoint = map.toScreen(mapPoint);
		var mapWidthPolyline = new esri.geometry.Polyline(map.spatialReference);
		mapWidthPolyline.addPath([[map.extent.xmin,mapPoint.y],[map.extent.xmax , mapPoint.y]]);
		var mapWidthGeodesic = esri.geometry.geodesicLengths([esri.geometry.webMercatorToGeographic(mapWidthPolyline)],esri.Units.METERS)[0];
		var mapResolutionGeodesic = mapWidthGeodesic / map.width;
		var geodesicRadius = distance / mapResolutionGeodesic;
		var circleGeometry = esri.geometry.Polygon.createCircle({
			center: screenPoint,
			map: map,
			numberOfPoints: 60,
			r: geodesicRadius
		});
		map.graphics.add(new esri.Graphic(circleGeometry, sym));
	}

}



// -- TRIGGER FUNCTIONS -- //

// LAUNCH CAMPAIGN
function launchCampaign() {
	dojo.style("loader", "display", "inline");
	deleteFences();
	processStores();
}

// PROCESS STORES
function processStores() {
	var msg = dojo.byId("txtMessage").value;
	var tag = dojo.byId("txtName").value;
	var graphics = lyrStores.graphics;
	storeCount = graphics.length;
	for (var i=0; i<graphics.length; i++) {
		var gra = graphics[i];
		var id = tag + "_" + gra.attributes.FID;
		var geom = gra.geometry;
		var pt = esri.geometry.webMercatorToGeographic(geom);
		createFence(pt, id, msg, tag);
	}
}

// CREATE FENCE
function createFence(pt, id, msg, tag) {
	var obj = {
		"condition": {
			"direction": "enter",
			"geo": {
				"latitude": pt.y,
	      		"longitude": pt.x,
	      		"distance": distance
    		}
  		},
		"action": {
			"message": msg
		},
		"setTags": [tag],
		"triggerId": id
	};
	
	fences.push(createFenceGraphic(obj));
  	if (fences.length == storeCount) {
  		console.log("Fence Creation Complete:" + fences.length);
  		dojo.style("loader", "display", "none");
  		changePage(1);
  		startTimer();
		renderFences();
  		setTimeout(zoomToFences, 1800);
  	}
}




// ZOOM TO FENCES
function zoomToFences() {
	var ext = esri.graphicsExtent(fences);
	map.setExtent(ext.expand(2));
}

// DELETE FENCES
function deleteFences() {
	stopTimer();
	fences = [];
}


// UPDATE FENCE
function updateFence() {
	if (selectedFence) {
		var gra = selectedFence;
		var attr = gra.attributes;
		var msg = dojo.byId("txtMessageSelected").value;
		gra.attributes.message = msg;
	    clearSelectedFence();
	}
}

// CREATE FENCE GRAPHIC
function createFenceGraphic(t) {
	var id = t.triggerId;
	var msg = t.action.message;
	var geo = t.condition.geo;
	var dist = geo.distance;
	var pt = new esri.geometry.Point(geo.longitude, geo.latitude);
	var ptWM = esri.geometry.geographicToWebMercator(pt);
	var attr = {
		triggerId: id,
		distance: dist,
		message: msg,
		triggers: 0,
		sales: 0
	}
	var gra = new esri.Graphic(ptWM, null, attr);
	return gra;
}

// -- RENDER FUNCTIONS -- //

// RENDER FENCES
function renderFences() {
	
	lyrFences.clear();
	var fence;
	var id;
	var triggers = 0;
	var sales = 0;
	var pct = 0;
	var size = 0;

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
	
	// INNER
	for (var i=0; i<fences.length; i++) {
		fence = fences[i];
		id = fence.attributes.triggerId;
		pct = getPercent(fence);
		size = parseInt(pct * 0.75);
		var symInner = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 25+size, lSym, new dojo.Color([rgb[0],rgb[1], rgb[2], 0.6]));
		var gra2 = new esri.Graphic(fence.geometry, symInner, {triggerId: id, type: "inner"});
		lyrFences.add(gra2);
	}
	
	// RING
	for (var i=0; i<fences.length; i++) {
		fence = fences[i];
		id = fence.attributes.triggerId;
		var symRing = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 25, lSym, new dojo.Color([0,0,0,1]));
		var gra3 = new esri.Graphic(fence.geometry, symRing, {triggerId: id, type: "ring"});
		lyrFences.add(gra3);
	}
	
	// LABEL
	for (var i=0; i<fences.length; i++) {
		fence = fences[i];
		id = fence.attributes.triggerId;
		pct = getPercent(fence);
		var font = new esri.symbol.Font("10px", esri.symbol.Font.STYLE_NORMAL, esri.symbol.Font.VARIANT_NORMAL, esri.symbol.Font.WEIGHT_NORMAL, "Arial");
		var symText = new esri.symbol.TextSymbol(pct + "%", font, "#ffffff");
		symText.setOffset(0, -4);
		lyrFences.add(new esri.Graphic(fence.geometry, symText, {triggerId: id, type: "label"}));
	}
	
}

// UPDATE FENCE GRAPHICS
function updateFenceGraphics() {
	
	if (page == 1) {
		
		for (var i=0; i<fences.length; i++) {
			fence = fences[i];
			var id = fence.attributes.triggerId;
			var triggers = fence.attributes.triggers;
			var sales = fence.attributes.sales;
			var pct = getPercent(fence);
			var size = parseInt(pct * 0.75);
			
			// INNER
			var gra1 = getFenceGraphic(id, "inner");
			if (gra1) {
				var sym1 = gra1.symbol;
				sym1.setSize(25+size);
				gra1.setSymbol(sym1);
			}
			
			
			// LABEL
			var gra2 = getFenceGraphic(id, "label");
			if (gra2) {
				var sym2 = gra2.symbol;
				sym2.setText(pct + "%");
				gra2.setSymbol(sym2);
			}
			
		}
	
		updateCounters();
		
	}
	
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

// UPDATE COUNTERS
function updateCounters() {
	var totalT = 0;
	var totalS = 0;
	if (selectedFence) {
		totalT = selectedFence.attributes.triggers;
		totalS = selectedFence.attributes.sales;
	} else {
		for (var i=0; i<fences.length; i++) {
			var f = fences[i];
			totalT += f.attributes.triggers;
			totalS += f.attributes.sales;
		}
	}
	counterTriggers.setValue(totalT);
	counterSales.setValue(totalS);
}

// GET COLOR RGB
function getColorRGB(color) {
	var symColor = dojo.colorFromString(color);
	return symColor.toRgb(); 
}

// UPDATE ANALYSIS
function updateAnalysis() {
	if (page == 2) {
		topStore = null;
		var fences2 = fences.slice(0);
		fences2.sort(compareSales);
		fences2.reverse();
		var gra = fences2[0];
		var pt = gra.geometry;
		var sym = new esri.symbol.PictureMarkerSymbol('http://coolmaps.esri.com/icons/starbucks.png', 20, 20);
		topStore = new esri.Graphic(pt, sym, gra.attributes);
		queryTapestry(pt);
	}
}

// COMPARE SALES
function compareSales(a,b) {
  if (a.attributes.sales < b.attributes.sales)
     return -1;
  if (a.attributes.sales > b.attributes.sales)
    return 1;
  return 0;
}

// QUERY ERROR HANDLER
function queryErrorHandler(error) {
	console.log(error.message);
}

// QUERY TAPESTRY
function queryTapestry(pt){
	var queryTask = new esri.tasks.QueryTask("http://services.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Tapestry/MapServer/1");
	var query = new esri.tasks.Query();
	query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
	query.geometry = pt;
	query.returnGeometry = true;
	query.outFields = ["DOMTAP"];
	queryTask.execute(query, tapestryResultsHandler, queryErrorHandler);
}

// TAPESTRY RESULTS HANDLER
function tapestryResultsHandler(featureSet) {
	lyrAnalysis.clear();
	dojo.byId("panelTapestry1").innerHTML = "";
	dojo.byId("panelTapestry2").innerHTML = "";
	dojo.byId("panelTapestry3").innerHTML = "";
	if(featureSet.features.length > 0) {
		var gra = featureSet.features[0];
		var rgb = getColorRGB(config.colors[2]);
		var lSym = new esri.symbol.SimpleLineSymbol("solid", new dojo.Color([rgb[0], rgb[1], rgb[2], 1]), 2);
		var sym = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, lSym, new dojo.Color([rgb[0], rgb[1], rgb[2], 0.5]));
		gra.setSymbol(sym);
		lyrAnalysis.add(gra);
		if (topStore)
			lyrAnalysis.add(topStore);
		var num = gra.attributes.DOMTAP;
		showTapestryInfo(num);
	}
}

// SHOW TAPESTRY INFO
function showTapestryInfo(num) {
	
	var obj = tapestryData[num-1];
	
	// 1
	var info1 = "<span class='title'>Dominant Lifestyle:</span><br/>" + obj["Name"];
	dojo.byId("panelTapestry1").innerHTML = info1;
	
	// 2
	var info2 = "";
	info2 += "<span class='titleTapestry'>Household Type:</span> " + obj["Household Type"] + "<br/>";
	info2 += "<span class='titleTapestry'>Median Age:</span> " + obj["Median Age"] + "<br/>";
	info2 += "<span class='titleTapestry'>Income:</span> " + obj["Income"] + "<br/>";
	info2 += "<span class='titleTapestry'>Employment:</span> " + obj["Employment"] + "<br/>";
	info2 += "<span class='titleTapestry'>Education:</span> " + obj["Education"] + "<br/>";
	info2 += "<span class='titleTapestry'>Residence:</span> " + obj["Residential"] + "<br/>";
	dojo.byId("panelTapestry2").innerHTML = info2;
	
	// 3
	var info3 = "";
	info3 += "<span class='titleTapestry'>Race/Ethnicity:</span> " + obj["Race/Ethnicity"] + "<br/>";
	info3 += "<span class='titleTapestry'>Financial:</span> " + obj["Financial"] + "<br/>";
	info3 += "<span class='titleTapestry'>Media:</span> " + obj["Media"] + "<br/>";
	info3 += "<span class='titleTapestry'>Vehicle:</span> " + obj["Vehicle"] + "<br/>";
	info3 += "<span class='titleTapestry'>Activities:</span> " + obj["Activities"] + "<br/>";
	info3 += "<span class='titleTapestry'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>" + obj["Activities2"] + "<br/>";
	dojo.byId("panelTapestry3").innerHTML = info3;
}



// -- SELECTED FENCE FUNCTIONS -- //

// SHOW SELECTED PANEL
function showSelectedPanel() {
	var txt = selectedFence.attributes.triggerId.replace("_", " ");
	dojo.byId("titleSelected").innerHTML = ": " + txt;
	dojo.byId("titleStore").innerHTML = "SELECTED STORE MESSAGE";
	dojo.byId("txtMessageSelected").value = selectedFence.attributes.message;
	dojo.style("panelSelected", "display", "block");
}

// HIDE SELECTED PANEL
function hideSelectedPanel() {
	dojo.byId("titleSelected").innerHTML = ": ALL STORES";
	dojo.byId("titleStore").innerHTML = "NO STORE SELECTED";
	dojo.style("panelSelected", "display", "none");
}

// CLEAR SELECTED FENCE
function clearSelectedFence() {
	selectedFence = null;
	hideSelectedPanel();
}





// -- TIMER FUNCTIONS -- //


// START TIMER
function startTimer() {
	timer = setInterval(updateData, 2000);
}

// STOP TIMER
function stopTimer() {
	if (timer)
		clearInterval(timer);
}

// UPDATE DATA
function updateData() {

	var index = Math.floor(Math.random()*storeCount);
	
	var min = 3;
	var max = 10;
	var t = Math.floor(Math.random() * (max - min + 1)) + min;
	var s = Math.floor(Math.random() * 3) + 1;
	
	var f = fences[index];
	var curT  = f.attributes.triggers;
	var curS = f.attributes.sales;
	f.attributes.triggers = curT + t;
	f.attributes.sales = curS + s;
	
	updateFenceGraphics();
	//updateAnalysis();
	
}

