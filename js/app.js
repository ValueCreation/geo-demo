﻿// app.js - Main app functions

var geomService;
var webmap;
var map;
var mapLayersLoaded = false;
var lyrStores;
var lyrFences;
var storeCount;
var fences;
var selectedFence;
var distance = 100;
var counterStores;
var counterTriggers;
var counterSales;

var selectCount = 0;

var chomonicxLayer;
var geodemoLayer;
var geodemoUpdateLayer;
var noDef;

// Load config XML file
dojo.addOnLoad(init);
// -- MAP FUNCTIONS -- //

// INIT
function init(){
	
	loadCounters();

	dojo.parser.parse();
	
	//esri.config.defaults.io.proxyUrl = config.proxyURL;
 	//geomService = new esri.tasks.GeometryService(config.geomURL);
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
		dojo.connect(map, "onExtentChange", storesUpdateEnd);
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
		
		// 全件表示用のレイヤ作成
		makeGeodemoLayer();

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

function makeGeodemoLayer() {
	
	//if (!noDef) {
	var def = "City_code <> '381'";
	//}
	
	var geodemoUrl = geodemoLayer.url;
	
	if (geodemoUpdateLayer) {
		map.removeLayer(geodemoUpdateLayer);
	}
	
	geodemoUpdateLayer = new esri.layers.FeatureLayer(geodemoUrl,{
				id:"geodemoUpdateLayer",
				mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,	
				infoTemplate: getMakePopupTemplate(),
				outFields: ["storeName","kana","postCode","address","kata_sho","phone","company","category","jCode","prefCode","companyCode","masterCode","level_","beer","premiumBeer","happoshu","thirdBeer","chuhaiSour","shochu1","shochu2","japaneseSake","wine","fruitWine","liqueur","whiskey","brandy","other"],
			});

	var icon_url="http://static.arcgis.com/images/Symbols/AtoZ/blueS.png";
	//var icon_url="http://static.arcgis.com/images/Symbols/AtoZ/redS.png";
	var symbol = new esri.symbol.PictureMarkerSymbol({
			"url":icon_url,
			"height":20.71428571428571,
			"width":15,
			"type":"esriPMS",
			"xoffset":0,
			"yoffset":15
			});
	
	geodemoUpdateLayer.setDefinitionExpression(noDef);
	var renderer = new esri.renderer.SimpleRenderer(symbol);
	geodemoUpdateLayer.setRenderer(renderer);
	map.addLayer(geodemoUpdateLayer);
	map.reorderLayer(geodemoUpdateLayer, 1);
	
	//if ($("#geodemoUpdateLayer:checked").val()) {
	//	geodemoUpdateLayer.setVisibility(true);
	//} else {
	geodemoUpdateLayer.setVisibility(false);
	//}
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
function storesUpdateEnd(extent) {
	var query = new esri.tasks.Query();
	query.geometry = map.extent;
	geodemoLayer.layerObject.queryFeatures(query, featureCount);
	
	createCircles();

}

function featureCount(response){
	var count = response.features.length;
	counterStores.setValue(count);
}

function changeLayerColor() {

	var icon_url="http://static.arcgis.com/images/Symbols/AtoZ/redS.png";
	var symbol = new esri.symbol.PictureMarkerSymbol({
				"url":icon_url,
				"height":20.71428571428571,
				"width":15,
				"type":"esriPMS",
				"xoffset":0,
				"yoffset":15
			});

	var renderer = new esri.renderer.SimpleRenderer(symbol);
	geodemoLayer.layerObject.setRenderer(renderer);
	geodemoLayer.layerObject.redraw();

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
	$("input:checkbox[id='geodemoUpdateLayer']").attr({'disabled':true});	
}

//FILTER STORES BY URBANICITY, LIFEMODE & NAT/ORG
function updateStoresDefQuery() {
	var def = [];
	/*
	if (noDef) {
		makeGeodemoLayer(noDef);
	} else {
		makeGeodemoLayer(noDef);
	}
	*/
	/*
	var uDef = getUrbanacityDefQuery();
	if (uDef)
		def.push(uDef);

	var lmDef = getLifeModeDefQuery();
	if (lmDef)
		def.push(lmDef);
	*/
	noDef = getNatOrgDefQuery();
	if (noDef)
		def.push(noDef);
	
	lyrStores.setDefinitionExpression(def.join(" AND "));
	
	lyrFences.clear();	
	changeLayerColor();
	selectCount++;
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
function createCircles() {
	//map.graphics.clear();
	fences = [];

	var graphics = lyrStores.graphics;
	//var graphics= geodemoUpdateLayer.graphics;
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
	
	if (selectCount > 0) {
		$("input:checkbox[id='geodemoUpdateLayer']").attr({'disabled':false});
		if ($("#lyrFences:checked").val()) {
			lyrFences.setVisibility(true);
		}
		if ($("#geodemoUpdateLayer:checked").val()) {
			geodemoUpdateLayer.setVisibility(true);
		}
		rgb = getColorRGB(config.colorsRed[1]);
	} else {
		rgb = getColorRGB(config.colorsBlue[1]);
	}
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

function selectGeoDemoUpdateLayer() {

	if ($("#geodemoUpdateLayer:checked").val()) {
		geodemoUpdateLayer.setVisibility(true);	
	} else {
		geodemoUpdateLayer.setVisibility(false);
	}

}

function selectLyrFences() {
	
	if ($("#lyrFences:checked").val()) {
		lyrFences.setVisibility(true);	
	} else {
		lyrFences.setVisibility(false);
	}

}

function getMakePopupTemplate() {
	
	var popupTemplate = new esri.dijit.PopupTemplate({
		  	title: "{storeName}",
			fieldInfos: [
				{
					fieldName: "storeName",
					visible: true,
					label: "店舗名"
				},{
					fieldName: "kana",
					visible: true,
					label: "フリガナ"
				},{
					fieldName: "postCode",
					visible: true,
					label: "郵便番号"
				},{
					fieldName: "address",
					visible: true,
					label: "住所"
				},{
					fieldName: "kata_sho",
					visible: true,
					label: "方書"
				},{
					fieldName: "phone",
					visible: true,
					label: "電話番号"
				},{
					fieldName: "company",
					visible: true,
					label: "企業名"
				},{
					fieldName: "category",
					visible: true,
					label: "業態"
				},{
					fieldName: "jCode",
					visible: true,
					label: "行政コード"
				},{
					fieldName: "prefCode",
					visible: true,
					label: "都道府県コード"
				},{
					fieldName: "companyCode",
					visible: true,
					label: "企業コード"
				},{
					fieldName: "masterCode",
					visible: true,
					label: "マスターコード"
				},{
					fieldName: "level_",
					visible: true,
					label: "同定レベル"
				},{
					fieldName: "beer",
					visible: true,
					label: "ビール"
				},{
					fieldName: "premiumBeer",
					visible: true,
					label: "プレミアムビール"
				},{
					fieldName: "happoshu",
					visible: true,
					label: "発泡酒"
				},{
					fieldName: "thirdBeer",
					visible: true,
					label: "第3のビール"
				},{
					fieldName: "chuhaiSour",
					visible: true,
					label: "チューハイ・サワー"
				},{
					fieldName: "shochu1",
					visible: true,
					label: "焼酎（甲類）"
				},{
					fieldName: "shochu2",
					visible: true,
					label: "焼酎（乙類）"
				},{
					fieldName: "japaneseSake",
					visible: true,
					label: "日本酒"
				},{
					fieldName: "wine",
					visible: true,
					label: "ワイン"
				},{
					fieldName: "fruitWine",
					visible: true,
					label: "果実酒"
				},{
					fieldName: "liqueur",
					visible: true,
					label: "リキュール"
				},{
					fieldName: "whiskey",
					visible: true,
					label: "ウィスキー"
				},{
					fieldName: "brandy",
					visible: true,
					label: "ブランデー"
				},{
					fieldName: "other",
					visible: true,
					label: "その他"
				}
			],
			showAttachments: true
		});
	
	return popupTemplate;

}


