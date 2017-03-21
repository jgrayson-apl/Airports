/*
 | Copyright 2016 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
  "boilerplate/ItemHelper",
  "boilerplate/UrlParamHelper",
  "dojo/i18n!./nls/resources",
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/Color",
  "dojo/colors",
  "dojo/number",
  "dojo/date",
  "dojo/on",
  "dojo/query",
  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-class",
  "dojo/dom-construct",
  "dojo/promise/all",
  "esri/core/Collection",
  "esri/core/watchUtils",
  "esri/core/promiseUtils",
  "esri/core/workers",
  "esri/core/workers/Connection",
  "esri/layers/Layer",
  "esri/Map",
  "esri/views/MapView",
  "esri/Viewpoint",
  "esri/Graphic",
  "esri/PopupTemplate",
  "esri/geometry/geometryEngine",
  "esri/geometry/support/webMercatorUtils",
  "esri/geometry/support/normalizeUtils",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Circle",
  "esri/geometry/Polygon",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/PointSymbol3D",
  "esri/symbols/ObjectSymbol3DLayer",
  "esri/symbols/LineSymbol3D",
  "esri/symbols/LineSymbol3DLayer",
  "esri/layers/support/LabelClass",
  "esri/symbols/LabelSymbol3D",
  "esri/symbols/TextSymbol3DLayer",
  "esri/tasks/support/Query",
  "esri/widgets/BasemapToggle",
  "widgets/SceneFlyTool",
  "widgets/CompassPlus/sources/CompassPlus",
  "application/NearUtils",
  "dojo/domReady!"
], function (ItemHelper, UrlParamHelper, i18n, declare, lang, Color, colors, number, date, on, query,
             dom, domAttr, domClass, domConstruct, all,
             Collection, watchUtils, promiseUtils, workers, Connection,
             Layer, Map, MapView, Viewpoint, Graphic, PopupTemplate, geometryEngine, webMercatorUtils, normalizeUtils,
             Point, Polyline, Circle, Polygon, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol,
             SimpleRenderer, PointSymbol3D, ObjectSymbol3DLayer, LineSymbol3D, LineSymbol3DLayer,
             LabelClass, LabelSymbol3D, TextSymbol3DLayer, Query,
             BasemapToggle, SceneFlyTool, CompassPlus, NearUtils) {

  //--------------------------------------------------------------------------
  //
  //  Static Variables
  //
  //--------------------------------------------------------------------------

  const CSS = {
    loading: "boilerplate--loading",
    error: "boilerplate--error",
    errorIcon: "esri-icon-notice-round"
  };

  return declare(null, {

    constructor: function () {

      this.nearUtils = new NearUtils();

    },

    config: null,

    direction: null,

    init: function (boilerplateResponse) {
      if(boilerplateResponse) {
        this.direction = boilerplateResponse.direction;
        this.config = boilerplateResponse.config;
        this.settings = boilerplateResponse.settings;
        let boilerplateResults = boilerplateResponse.results;
        let webMapItem = boilerplateResults.webMapItem;
        let webSceneItem = boilerplateResults.webSceneItem;
        let groupData = boilerplateResults.group;

        document.documentElement.lang = boilerplateResponse.locale;

        this.urlParamHelper = new UrlParamHelper();
        this.itemHelper = new ItemHelper();

        this._setDirection();

        if(webMapItem) {
          this._createWebMap(webMapItem);
        }
        else if(webSceneItem) {
          this._createWebScene(webSceneItem);
        }
        else if(groupData) {
          this._createGroupGallery(groupData);
        }
        else {
          this.reportError(new Error("app:: Could not load an item to display"));
        }
      }
      else {
        this.reportError(new Error("app:: Boilerplate is not defined"));
      }
    },

    reportError: function (error) {
      // remove loading class from body
      domClass.remove(document.body, CSS.loading);
      domClass.add(document.body, CSS.error);
      let node = dom.byId("loading_message");
      if(node) {
        node.innerHTML = "<h1><span class=\"" + CSS.errorIcon + "\"></span> " + i18n.error + "</h1><p>" + error.message + "</p>";
      }
      return error;
    },

    _setDirection: function () {
      let direction = this.direction;
      let dirNode = document.getElementsByTagName("html")[0];
      domAttr.set(dirNode, "dir", direction);
    },

    _createWebMap: function (webMapItem) {
      this.itemHelper.createWebMap(webMapItem).then(function (map) {

        let viewProperties = {
          map: map,
          container: this.settings.webmap.containerId
        };

        if(!this.config.title && map.portalItem && map.portalItem.title) {
          this.config.title = map.portalItem.title;
        }
        lang.mixin(viewProperties, this.urlParamHelper.getViewProperties(this.config));

        require(["esri/views/MapView"], function (MapView) {
          let view = new MapView(viewProperties);
          view.then(function (response) {
            this.urlParamHelper.addToView(view, this.config);
            this._ready(view);
          }.bind(this), this.reportError);
        }.bind(this));
      }.bind(this), this.reportError);
    },

    _createWebScene: function (webSceneItem) {
      this.itemHelper.createWebScene(webSceneItem).then(function (map) {

        let viewProperties = {
          map: map,
          container: this.settings.webscene.containerId
        };

        if(!this.config.title && map.portalItem && map.portalItem.title) {
          this.config.title = map.portalItem.title;
        }

        lang.mixin(viewProperties, this.urlParamHelper.getViewProperties(this.config));

        require(["esri/views/SceneView"], function (SceneView) {

          let view = new SceneView(viewProperties);

          view.then(function (response) {

            this.urlParamHelper.addToView(view, this.config);

            this._ready(view);

          }.bind(this), this.reportError);

        }.bind(this));

      }.bind(this), this.reportError);
    },

    _createGroupGallery: function (groupData) {
      let groupInfoData = groupData.infoData;
      let groupItemsData = groupData.itemsData;

      if(!groupInfoData || !groupItemsData || groupInfoData.total === 0 || groupInfoData instanceof Error) {
        this.reportError(new Error("app:: group data does not exist."));
        return;
      }

      let info = groupInfoData.results[0];
      let items = groupItemsData.results;

      this._ready();

      if(info && items) {
        let html = "";

        html += "<h1>" + info.title + "</h1>";

        html += "<ol>";

        items.forEach(function (item) {
          html += "<li>" + item.title + "</li>";
        });

        html += "</ol>";

        document.body.innerHTML = html;
      }

    },

    _showLoading: function () {
      domClass.add(document.body, CSS.loading);

    },

    _hideLoading: function () {
      domClass.remove(document.body, CSS.loading);

    },

    _ready: function (view) {

      // TITLE //
      document.title = this.config.title;
      let appTitleNode = domConstruct.create("div", { className: "ui-node esri-component esri-widget app-title" });
      view.ui.add(appTitleNode, { position: "top-left", index: 0 });
      //let esriLink = domConstruct.create("a", { href: "//www.esri.com", target: "_blank" }, appTitleNode);
      //domConstruct.create("img", { src: "./images/science_of_where.jpg" }, esriLink);
      domConstruct.create("span", { innerHTML: this.config.title }, appTitleNode);


      // VIEW POPUP DOCKING OPTIONS //
      view.popup.dockEnabled = true;
      view.popup.dockOptions = {
        buttonEnabled: false,
        position: "bottom-left",
        breakpoint: true
      };

      // COMPASS PLUS //
      let compassPlus = new CompassPlus({
        container: domConstruct.create("div", { id: "compass-node" }, view.root),
        view: view,
        visible: false
      });
      //}, domConstruct.create("div", { id: "compass-node" }, view.root));

      //view.ui.add(compassPlus, { position: "bottom-left", index: 0 });

      // BASEMAP TOGGLE //
      let basemapToggle = new BasemapToggle({
        view: view,
        nextBasemap: "streets-night-vector"
      });
      // basemapToggle.on("toggle", function (evt) {
      /*if(this.overview) {
       this.overview.map.basemap = evt.current;
       }*/
      //compassPlus.style = (evt.current.title === "Topographic") ? CompassPlus.STYLES.DARK : CompassPlus.STYLES.DEFAULT;
      // }.bind(this));
      view.ui.add(basemapToggle, { position: "top-left", index: 1 });

      // FLY TOOL //
      this.flyTool = new SceneFlyTool({ view: view });
      this.flyTool.startup();
      this.flyTool.on("change", function () {
        compassPlus.visible = this.flyTool.checked;
      }.bind(this));
      view.ui.add(this.flyTool, { position: "top-left", index: 2 });

      // VIEW EXTENT //
      this.initialViewExtent = view.extent.clone();

      // SIDE PANEL //
      //let sidePanelNode = dom.byId("side-panel");

      // NEARBY AIRPORTS //
      let nearInfoNode = domConstruct.create("div", { className: "ui-node esri-component esri-widget near-info-node" });
      view.ui.add(nearInfoNode, { position: "top-right", index: 0 });
      // NEARBY HEADING //
      domConstruct.create("div", { innerHTML: "Nearby Airports", className: "near-info-heading" }, nearInfoNode);

      // NEARBY LABEL //
      let nearLabelNode = domConstruct.create("div", { innerHTML: "Loading airport locations...", className: "near-info-label" }, nearInfoNode);
      this.updateNearLabel = function (msg) {
        nearLabelNode.innerHTML = msg;
      }.bind(this);

      let optionsNode = domConstruct.create("div", { className: "near-info-options" }, nearInfoNode);

      // UPDATE MODE //
      let updateModeNode = domConstruct.create("div", { className: "near-info-inputs" }, optionsNode);
      domConstruct.create("span", { innerHTML: "Update Mode:" }, updateModeNode);
      domConstruct.create("input", { id: "update-position", className: "mode-input", type: "radio", name: "mode", value: "position", checked: "checked" }, updateModeNode);
      domConstruct.create("label", { "for": "update-position", innerHTML: "Position", title: "Update when view position changes" }, updateModeNode);
      domConstruct.create("input", { id: "update-stationary", className: "mode-input", type: "radio", name: "mode", value: "stationary" }, updateModeNode);
      domConstruct.create("label", { "for": "update-stationary", innerHTML: "Stationary", title: "Update when view becomes stationary" }, updateModeNode);


      // CUTOFF //
      let cutoffNode = domConstruct.create("div", { className: "near-info-cutoff" }, optionsNode);
      domConstruct.create("span", { innerHTML: "Within" }, cutoffNode);
      this.cutoffInput = domConstruct.create("input", { type: "range", min: 50, max: 1000, step: 50, value: 100 }, cutoffNode);
      let cutoffInputLabel = domConstruct.create("span", { innerHTML: this.cutoffInput.value + " kms" }, cutoffNode);
      this.updateCutoffLabel = function () {
        cutoffInputLabel.innerHTML = lang.replace("{cutoff} kms", { cutoff: number.format(this.cutoffInput.value) });
      }.bind(this);

      // INSIDE FOV //
      let insideFOVNode = domConstruct.create("div", { className: "near-info-inputs" }, optionsNode);
      domConstruct.create("label", { "for": "within-fov-input", innerHTML: "Within field of view:" }, insideFOVNode);
      let withinFOVInput = domConstruct.create("input", { id: "within-fov-input", type: "checkbox" }, insideFOVNode);
      on(withinFOVInput, "change", function () {
        this._calcNear(view);
      }.bind(this));

      // NEAR INFO //
      let nearInfoContent = domConstruct.create("div", { className: "near-info-content" }, nearInfoNode);
      this.updateNearInfo = function (message) {
        nearInfoContent.innerHTML = message;
      }.bind(this);

      // OVERVIEW //
      let overviewContainer = domConstruct.create("div", { id: "near-info-overview" }, nearInfoNode);
      this.overview = new MapView({
        container: overviewContainer,
        ui: { components: [] },
        constraints: { snapToZoom: false },
        //map: view.map,
        map: new Map({ basemap: "streets-night-vector" }),
        extent: view.extent
      });
      this.overview.then(function () {
        // CREATE NEAR AOI GRAPHICS //
        this.nearAOIGraphic = new Graphic({
          symbol: new SimpleFillSymbol({ color: null, outline: { color: "#65D2F4", style: "dash", width: 1.5 } })
        });
        this.nearFOVGraphic = new Graphic({
          symbol: new SimpleFillSymbol({ color: null, outline: { color: Color.named.limegreen, style: "dot", width: 1.5 } })
        });
        this.viewPositionGraphic = new Graphic({
          symbol: new SimpleMarkerSymbol({ style: "cross", color: Color.named.white, size: "15px", outline: { color: "#65D2F4", width: 1.5 } })
        });
        this.overview.graphics.addMany([this.nearAOIGraphic, this.nearFOVGraphic, this.viewPositionGraphic]);

        // UPDATE NEAR AOI GRAPHICS //
        this.updateNearAOI = function (position, cutoffKms, goTo) {

          let viewGeometry = new Circle({
            spatialReference: this.overview.spatialReference,
            center: position,
            numberOfPoints: 360,
            geodesic: true,
            radius: this.overview.extent.width,
            radiusUnit: "meters"
          });
          this.fovInfo = this.createFOVGeometry(view, viewGeometry);

          this.overview.graphics.remove(this.nearFOVGraphic);
          this.nearFOVGraphic = this.nearFOVGraphic.clone();
          this.nearFOVGraphic.geometry = this.fovInfo.fovGeometry;
          this.overview.graphics.add(this.nearFOVGraphic);

          let aoiGeometry = new Circle({
            spatialReference: this.overview.spatialReference,
            center: position,
            numberOfPoints: 180,
            geodesic: true,
            radius: cutoffKms,
            radiusUnit: "kilometers"
          });

          this.overview.graphics.remove(this.nearAOIGraphic);
          this.nearAOIGraphic = this.nearAOIGraphic.clone();
          this.nearAOIGraphic.geometry = aoiGeometry;
          if(goTo) {
            this.overview.goTo(this.nearAOIGraphic.geometry.extent.expand(1.5)).then(function () {
              this.overview.graphics.add(this.nearAOIGraphic);
            }.bind(this));
          } else {
            this.overview.graphics.add(this.nearAOIGraphic);
          }
        }.bind(this);
      }.bind(this));

      // PROCESSING INFO //
      let processingInfoNode = domConstruct.create("div", { id: "near-info-processing" }, nearInfoNode);
      this.updateProcessingInfo = function (msg) {
        clearTimeout(this.processingHandle);
        domClass.add(processingInfoNode, "updating");
        processingInfoNode.innerHTML = msg;
        this.processingHandle = setTimeout(function () {
          domClass.remove(processingInfoNode, "updating");
        }.bind(this), 750);
      }.bind(this);

      /* let nearbyAirportsListNode = domConstruct.create("div", { id: "near-info-nearby-list" }, nearInfoNode);
       this.setNearbyAirports = function (nearbyAirports) {
       nearbyAirportsListNode.innerHTML = "";
       nearbyAirports.forEach(function (nearbyAirport) {
       domConstruct.create("div", { class: "near-info-nearby-item", innerHTML: nearbyAirport.getAttribute("ident") }, nearbyAirportsListNode);
       }.bind(this));
       }.bind(this);*/

      // DISPLAY FLIGHTS //
      let flightsNode = domConstruct.create("div", { className: "ui-node esri-component esri-widget near-info-node" });
      view.ui.add(flightsNode, { position: "top-right", index: 0 });
      domConstruct.create("div", { innerHTML: "Display Flights", className: "near-info-heading" }, flightsNode);
      let flightsOptionsNode = domConstruct.create("div", { className: "near-info-inputs" }, flightsNode);
      let flightsLayerVisibleInput = domConstruct.create("input", { id: "flights-layer-visible", type: "checkbox" }, flightsOptionsNode);
      on(flightsLayerVisibleInput, "change", function () {
        if(this.flightsLayer == null) {
          // LOAD FLIGHTS LAYER //
          this.loadFlightAwareLayer(view);
          this.loadFlightAwarePlans(view);
        } else {
          this.flightsLayer.visible = this.flightPlansLayer.visible = this.flightPlansLayer2.visible = flightsLayerVisibleInput.checked;
        }
        this.toggleLayout();
      }.bind(this));
      domConstruct.create("label", { "for": "flights-layer-visible", innerHTML: "FlightAware Flights and Flight Plans" }, flightsOptionsNode);

      /**
       *
       */
      this.toggleLayout = function () {
        window.requestAnimationFrame(function () {
          query(".ui-layout").toggleClass("open");
        });
      }.bind(this);


      // LISTS OF AIRPORT LOCATIONS //
      this.airportLocationsList = [];

      this.loadAirportLocations(view).then(function () {

        // NEAREST AIRPORT GRAPHIC //
        this.nearestAirportGraphic = new Graphic({
          attributes: { id: -1 }
        });
        this.overview.graphics.add(this.nearestAirportGraphic);

        //  AIRPORTS LAYER LAYERVIEW //
        view.whenLayerView(this.airportsLayer).then(function (layerView) {
          watchUtils.whenOnce(layerView, "controller").then(function (result) {
            let controller = result.value;

            // LAYERVIEW GRAPHICS //
            let graphicsCollection = controller.graphics;
            let onChangeHandle = graphicsCollection.on("change", function (evt) {
              if(evt.added.length > 0) {

                // FEATURE INFOS AND GEOMETRIES //
                let featureInfos = [];
                let addedGeometries = [];
                evt.added.forEach(function (feature) {
                  addedGeometries.push(feature.geometry);
                  featureInfos.push({
                    id: feature.getAttribute(this.airportsLayer.objectIdField),
                    latitude: feature.geometry.latitude,
                    longitude: feature.geometry.longitude
                  });
                }.bind(this));
                // ADDED GEOMETRIES AS MULTIPOINT //
                let addedGeometryUnion = geometryEngine.union(addedGeometries);

                // ADD TO PROCESSING LIST //
                // geometries: LIST OF GEOMETRIES IN GEOGRAPHIC
                //     extent: EXTENT OF GEOMETRIES IN SOURCE PROJECTION
                this.airportLocationsList.push({ featureInfos: featureInfos, extent: addedGeometryUnion.extent });

                // UPDATE LOADING GRAPHICS PROGRESS //
                this.updateProcessingInfo(lang.replace("{graphicsCount} airport locations loaded...", {
                  graphicsCount: number.format(graphicsCollection.length)
                }), true);

              }
            }.bind(this));

            // WHEN WE HAVE ALL THE FEATURES LOADED //
            watchUtils.whenTrueOnce(controller, "hasAllFeatures", function () {
              onChangeHandle.remove();

              // AIRPORT FEATURES //
              this.airportFeatures = controller.graphics;
              this.updateNearLabel(lang.replace("A total of {airportsCount} airports loaded.", {
                airportsCount: number.format(this.airportFeatures.length)
              }));

              // CREATE CONNECTION TO NEAR WORKERS //
              this.createNearWorkerConnection().then(function (connection) {
                // CONNECTION TO NEAR WORKERS //
                this.nearWorkerConnection = connection;

                //
                // PERFORM NEAR CALCULATIONS //
                //

                // 1- WHEN VIEW POSITION CHANGES //
                let positionHandle = watchUtils.pausable(view, "camera", function () {
                  this._calcNear(view);
                }.bind(this));
                //positionHandle.pause();

                // 1- WHEN VIEW BECOMES STATIONARY //
                let stationaryHandle = watchUtils.pausable(view, "stationary", function (stationary) {
                  if(stationary) {
                    this._calcNear(view);
                  }
                }.bind(this));
                stationaryHandle.pause();

                // TOGGLE UPDATE MODE //
                query(".mode-input").on("change", function (evt) {
                  if(evt.target.id === "update-position") {
                    stationaryHandle.pause();
                    positionHandle.resume();
                  } else {
                    positionHandle.pause();
                    stationaryHandle.resume();
                  }
                }.bind(this));

                // 2- WHEN CUTOFF DISTANCE IS UPDATED //
                // UPDATE CUTOFF LABEL AND AOI GRAPHIC //
                on(this.cutoffInput, "input", function () {
                  this.updateCutoffLabel();
                  this.updateNearAOI(view.camera.position, this.cutoffInput.value);
                }.bind(this));
                // UPDATE NEAR CALCULATIONS //
                on(this.cutoffInput, "change", function () {
                  this._calcNear(view);
                }.bind(this));


                // INITIAL NEAR CALCULATION //
                this._calcNear(view);

                // REMOVE INITIAL LOADING CSS //
                this._hideLoading();

              }.bind(this));
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }.bind(this));

    },

    loadAirportLocations: function (view) {

      /*
       OBJECTID (type: esriFieldTypeOID, alias: OBJECTID, SQL Type: sqlTypeInteger, length: 0, nullable: false, editable: false)
       SiteNumber (type: esriFieldTypeString, alias: SiteNumber, SQL Type: sqlTypeNVarchar, length: 12, nullable: true, editable: true)
       Type_ (type: esriFieldTypeString, alias: Type, SQL Type: sqlTypeNVarchar, length: 14, nullable: true, editable: true)
       LocationID (type: esriFieldTypeString, alias: LocationID, SQL Type: sqlTypeNVarchar, length: 5, nullable: true, editable: true)
       EffectiveDate (type: esriFieldTypeString, alias: EffectiveDate, SQL Type: sqlTypeNVarchar, length: 12, nullable: true, editable: true)
       Region (type: esriFieldTypeString, alias: Region, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       DistrictOffice (type: esriFieldTypeString, alias: DistrictOffice, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       State (type: esriFieldTypeString, alias: State, SQL Type: sqlTypeNVarchar, length: 2, nullable: true, editable: true)
       StateName (type: esriFieldTypeString, alias: StateName, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       County (type: esriFieldTypeString, alias: County, SQL Type: sqlTypeNVarchar, length: 50, nullable: true, editable: true)
       CountyState (type: esriFieldTypeString, alias: CountyState, SQL Type: sqlTypeNVarchar, length: 2, nullable: true, editable: true)
       City (type: esriFieldTypeString, alias: City, SQL Type: sqlTypeNVarchar, length: 50, nullable: true, editable: true)
       FacilityName (type: esriFieldTypeString, alias: FacilityName, SQL Type: sqlTypeNVarchar, length: 200, nullable: true, editable: true)
       Ownership (type: esriFieldTypeString, alias: Ownership, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       Use_ (type: esriFieldTypeString, alias: Use_, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       Owner (type: esriFieldTypeString, alias: Owner, SQL Type: sqlTypeNVarchar, length: 100, nullable: true, editable: true)
       OwnerAddress (type: esriFieldTypeString, alias: OwnerAddress, SQL Type: sqlTypeNVarchar, length: 200, nullable: true, editable: true)
       OwnerCSZ (type: esriFieldTypeString, alias: OwnerCSZ, SQL Type: sqlTypeNVarchar, length: 200, nullable: true, editable: true)
       OwnerPhone (type: esriFieldTypeString, alias: OwnerPhone, SQL Type: sqlTypeNVarchar, length: 15, nullable: true, editable: true)
       Manager (type: esriFieldTypeString, alias: Manager, SQL Type: sqlTypeNVarchar, length: 100, nullable: true, editable: true)
       ManagerAddress (type: esriFieldTypeString, alias: ManagerAddress, SQL Type: sqlTypeNVarchar, length: 200, nullable: true, editable: true)
       ManagerCSZ (type: esriFieldTypeString, alias: ManagerCSZ, SQL Type: sqlTypeNVarchar, length: 200, nullable: true, editable: true)
       ManagerPhone (type: esriFieldTypeString, alias: ManagerPhone, SQL Type: sqlTypeNVarchar, length: 15, nullable: true, editable: true)
       ARPLatitude (type: esriFieldTypeString, alias: ARPLatitude, SQL Type: sqlTypeNVarchar, length: 15, nullable: true, editable: true)
       ARPLongitude (type: esriFieldTypeString, alias: ARPLongitude, SQL Type: sqlTypeNVarchar, length: 16, nullable: true, editable: true)
       ARPMethod (type: esriFieldTypeString, alias: ARPMethod, SQL Type: sqlTypeNVarchar, length: 5, nullable: true, editable: true)
       ARPElevation (type: esriFieldTypeDouble, alias: ARPElevation, SQL Type: sqlTypeDecimal, nullable: true, editable: true)
       ARPElevationMethod (type: esriFieldTypeString, alias: ARPElevationMethod, SQL Type: sqlTypeNVarchar, length: 5, nullable: true, editable: true)
       MagneticVariation (type: esriFieldTypeString, alias: MagneticVariation, SQL Type: sqlTypeNVarchar, length: 4, nullable: true, editable: true)
       MagneticVariationYear (type: esriFieldTypeDouble, alias: MagneticVariationYear, SQL Type: sqlTypeDecimal, nullable: true, editable: true)
       TrafficPatternAltitude (type: esriFieldTypeString, alias: TrafficPatternAltitude, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       ChartName (type: esriFieldTypeString, alias: ChartName, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       DistanceFromCBD (type: esriFieldTypeSmallInteger, alias: DistanceFromCBD, SQL Type: sqlTypeSmallInt, nullable: true, editable: true)
       DirectionFromCBD (type: esriFieldTypeString, alias: DirectionFromCBD, SQL Type: sqlTypeNVarchar, length: 4, nullable: true, editable: true)
       LandAreaCoveredByAirport (type: esriFieldTypeInteger, alias: LandAreaCoveredByAirport, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       BoundaryARTCCID (type: esriFieldTypeString, alias: BoundaryARTCCID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       BoundaryARTCCComputerID (type: esriFieldTypeString, alias: BoundaryARTCCComputerID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       BoundaryARTCCName (type: esriFieldTypeString, alias: BoundaryARTCCName, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       ResponsibleARTCCID (type: esriFieldTypeString, alias: ResponsibleARTCCID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       ResponsibleARTCCComputerID (type: esriFieldTypeString, alias: ResponsibleARTCCComputerID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       ResponsibleARTCCName (type: esriFieldTypeString, alias: ResponsibleARTCCName, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       TieInFSS (type: esriFieldTypeString, alias: TieInFSS, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       TieInFSSID (type: esriFieldTypeString, alias: TieInFSSID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       TieInFSSName (type: esriFieldTypeString, alias: TieInFSSName, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       AirportToFSSPhoneNumber (type: esriFieldTypeString, alias: AirportToFSSPhoneNumber, SQL Type: sqlTypeNVarchar, length: 15, nullable: true, editable: true)
       TieInFSSTollFreeNumber (type: esriFieldTypeString, alias: TieInFSSTollFreeNumber, SQL Type: sqlTypeNVarchar, length: 15, nullable: true, editable: true)
       AlternateFSSID (type: esriFieldTypeString, alias: AlternateFSSID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       AlternateFSSName (type: esriFieldTypeString, alias: AlternateFSSName, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       AlternateFSSTollFreeNumber (type: esriFieldTypeString, alias: AlternateFSSTollFreeNumber, SQL Type: sqlTypeNVarchar, length: 15, nullable: true, editable: true)
       NOTAMFacilityID (type: esriFieldTypeString, alias: NOTAMFacilityID, SQL Type: sqlTypeNVarchar, length: 3, nullable: true, editable: true)
       NOTAMService (type: esriFieldTypeString, alias: NOTAMService, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       ActiviationDate (type: esriFieldTypeString, alias: ActiviationDate, SQL Type: sqlTypeNVarchar, length: 12, nullable: true, editable: true)
       AirportStatusCode (type: esriFieldTypeString, alias: AirportStatusCode, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       CertificationTypeDate (type: esriFieldTypeString, alias: CertificationTypeDate, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       FederalAgreements (type: esriFieldTypeString, alias: FederalAgreements, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       AirspaceDetermination (type: esriFieldTypeString, alias: AirspaceDetermination, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       CustomsAirportOfEntry (type: esriFieldTypeString, alias: CustomsAirportOfEntry, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       CustomsLandingRights (type: esriFieldTypeString, alias: CustomsLandingRights, SQL Type: sqlTypeNVarchar, length: 2, nullable: true, editable: true)
       MilitaryJointUse (type: esriFieldTypeString, alias: MilitaryJointUse, SQL Type: sqlTypeNVarchar, length: 2, nullable: true, editable: true)
       MilitaryLandingRights (type: esriFieldTypeString, alias: MilitaryLandingRights, SQL Type: sqlTypeNVarchar, length: 2, nullable: true, editable: true)
       InspectionMethod (type: esriFieldTypeString, alias: InspectionMethod, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       InspectionGroup (type: esriFieldTypeString, alias: InspectionGroup, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       LastInspectionDate (type: esriFieldTypeString, alias: LastInspectionDate, SQL Type: sqlTypeNVarchar, length: 10, nullable: true, editable: true)
       LastOwnerInformationDate (type: esriFieldTypeString, alias: LastOwnerInformationDate, SQL Type: sqlTypeNVarchar, length: 10, nullable: true, editable: true)
       FuelTypes (type: esriFieldTypeString, alias: FuelTypes, SQL Type: sqlTypeNVarchar, length: 22, nullable: true, editable: true)
       AirframeRepair (type: esriFieldTypeString, alias: AirframeRepair, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       PowerPlantRepair (type: esriFieldTypeString, alias: PowerPlantRepair, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       BottledOxygenType (type: esriFieldTypeString, alias: BottledOxygenType, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       BulkOxygenType (type: esriFieldTypeString, alias: BulkOxygenType, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       LightingSchedule (type: esriFieldTypeString, alias: LightingSchedule, SQL Type: sqlTypeNVarchar, length: 10, nullable: true, editable: true)
       BeaconSchedule (type: esriFieldTypeString, alias: BeaconSchedule, SQL Type: sqlTypeNVarchar, length: 10, nullable: true, editable: true)
       ATCT (type: esriFieldTypeString, alias: ATCT, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       UNICOMFrequencies (type: esriFieldTypeString, alias: UNICOMFrequencies, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       CTAFFrequency (type: esriFieldTypeString, alias: CTAFFrequency, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       SegmentedCircle (type: esriFieldTypeString, alias: SegmentedCircle, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       BeaconColor (type: esriFieldTypeString, alias: BeaconColor, SQL Type: sqlTypeNVarchar, length: 4, nullable: true, editable: true)
       NonCommercialLandingFee (type: esriFieldTypeString, alias: NonCommercialLandingFee, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       MedicalUse (type: esriFieldTypeString, alias: MedicalUse, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       SingleEngineGA (type: esriFieldTypeInteger, alias: SingleEngineGA, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       MultiEngineGA (type: esriFieldTypeInteger, alias: MultiEngineGA, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       JetEngineGA (type: esriFieldTypeInteger, alias: JetEngineGA, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       HelicoptersGA (type: esriFieldTypeInteger, alias: HelicoptersGA, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       GlidersOperational (type: esriFieldTypeInteger, alias: GlidersOperational, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       MilitaryOperational (type: esriFieldTypeInteger, alias: MilitaryOperational, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       Ultralights (type: esriFieldTypeInteger, alias: Ultralights, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsCommercial (type: esriFieldTypeInteger, alias: OperationsCommercial, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsCommuter (type: esriFieldTypeInteger, alias: OperationsCommuter, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsAirTaxi (type: esriFieldTypeInteger, alias: OperationsAirTaxi, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsGALocal (type: esriFieldTypeInteger, alias: OperationsGALocal, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsGAItin (type: esriFieldTypeInteger, alias: OperationsGAItin, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsMilitary (type: esriFieldTypeInteger, alias: OperationsMilitary, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       OperationsDate (type: esriFieldTypeString, alias: OperationsDate, SQL Type: sqlTypeNVarchar, length: 12, nullable: true, editable: true)
       AirportPositionSource (type: esriFieldTypeString, alias: AirportPositionSource, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       AirportPositionSourceDate (type: esriFieldTypeString, alias: AirportPositionSourceDate, SQL Type: sqlTypeNVarchar, length: 12, nullable: true, editable: true)
       AirportElevationSource (type: esriFieldTypeString, alias: AirportElevationSource, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       AirportElevationSourceDate (type: esriFieldTypeString, alias: AirportElevationSourceDate, SQL Type: sqlTypeNVarchar, length: 12, nullable: true, editable: true)
       ContractFuelAvailable (type: esriFieldTypeString, alias: ContractFuelAvailable, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       TransientStorage (type: esriFieldTypeString, alias: TransientStorage, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       OtherServices (type: esriFieldTypeString, alias: OtherServices, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       WindIndicator (type: esriFieldTypeString, alias: WindIndicator, SQL Type: sqlTypeNVarchar, length: 4, nullable: true, editable: true)
       LongestRwy (type: esriFieldTypeInteger, alias: LongestRwy, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       RwySurf (type: esriFieldTypeString, alias: RwySurf, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       FuelService (type: esriFieldTypeString, alias: FuelService, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       RunwaySurfaceTypeCondition (type: esriFieldTypeString, alias: RunwaySurfaceTypeCondition, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       Night_BCN (type: esriFieldTypeString, alias: Night_BCN, SQL Type: sqlTypeNVarchar, length: 1, nullable: true, editable: true)
       CycleNum (type: esriFieldTypeString, alias: CycleNum, SQL Type: sqlTypeNVarchar, length: 4, nullable: true, editable: true)
       alnum (type: esriFieldTypeInteger, alias: alnum, SQL Type: sqlTypeInteger, nullable: true, editable: true)
       cycle (type: esriFieldTypeString, alias: cycle, SQL Type: sqlTypeNVarchar, length: 20, nullable: true, editable: true)
       apdpdf (type: esriFieldTypeString, alias: apdpdf, SQL Type: sqlTypeNVarchar, length: 11, nullable: true, editable: true)
       */

      // AIRPORTS LAYER ITEM //
      // FL:  20aa93c1d68f461986902831f540bf4f
      // SL:  5a47c44093f34963850f6418829ebba0
      return Layer.fromPortalItem({ id: "20aa93c1d68f461986902831f540bf4f" }).then(function (layer) {
        // AIRPORTS LAYER //
        this.airportsLayer = layer;

        // LOAD LAYER //
        return this.airportsLayer.load().then(function () {
          //console.info(this.airportsLayer);

          // UPDATE SYMBOLS FROM SIMPLE MARKERS TO 3D CYLINDERS //
          this.airportsLayer.renderer.uniqueValueInfos.forEach(function (uvInfos) {
            uvInfos.symbol = new PointSymbol3D({
              symbolLayers: [
                new ObjectSymbol3DLayer({
                  height: 2000.0, width: 1000.0,
                  resource: {
                    primitive: "cylinder"
                  },
                  material: {
                    color: uvInfos.symbol.color
                  }
                })
              ]
            })
          });

          /* this.airportsLayer.renderer = new SimpleRenderer({
           symbol: new PointSymbol3D({
           symbolLayers: [
           new ObjectSymbol3DLayer({
           height: 2000.0, width: 1000.0,
           resource: {
           primitive: "cylinder"
           },
           material: {
           color: "#65D2F4"
           }
           })
           ]
           })
           });
           */

          // UPDATE LABELING //
          this.airportsLayer.labelingInfo = [
            new LabelClass({
              labelExpressionInfo: { value: "{FacilityName}" },
              labelPlacement: "above-center",
              symbol: new LabelSymbol3D({
                symbolLayers: [
                  new TextSymbol3DLayer({
                    material: { color: "#fff" },
                    size: 6,
                    font: {
                      style: "normal",
                      weight: "bold",
                      family: "Avenir Next W00"
                    }
                  })
                ]
              })
            })
          ];
          this.airportsLayer.labelsVisible = true;

          // ADD LAYER TO MAP //
          view.map.add(this.airportsLayer);

        }.bind(this));
      }.bind(this));

    },

    loadFlightAwareLayer: function (view) {

      // https://geoeventsample3.esri.com:6443/arcgis/rest/services/FlightAwarePosition/StreamServer

      Layer.fromPortalItem({ id: "bb9024d47a27459f83b7901dcc65b6c4" }).then(function (layer) {
        // FLIGHTAWARE LAYER //
        this.flightsLayer = layer;

        // LOAD LAYER //
        this.flightsLayer.load().then(function () {
          //console.info(this.flightsLayer);

          /*
           type ( type: esriFieldTypeString , alias: type , nullable: true )
           ident ( type: esriFieldTypeString , alias: ident , nullable: true )
           lat ( type: esriFieldTypeDouble , alias: lat , nullable: true )
           lon ( type: esriFieldTypeDouble , alias: lon , nullable: true )
           clock ( type: esriFieldTypeDate , alias: clock , nullable: true )
           id ( type: esriFieldTypeString , alias: id , nullable: true )
           updateType ( type: esriFieldTypeString , alias: updateType , nullable: true )
           air_ground ( type: esriFieldTypeString , alias: air_ground , nullable: true )
           facility_hash ( type: esriFieldTypeString , alias: facility_hash , nullable: true )
           facility_name ( type: esriFieldTypeString , alias: facility_name , nullable: true )
           pitr ( type: esriFieldTypeDate , alias: pitr , nullable: true )
           alt ( type: esriFieldTypeDouble , alias: alt , nullable: true )
           altChange ( type: esriFieldTypeString , alias: altChange , nullable: true )
           gs ( type: esriFieldTypeString , alias: gs , nullable: true )
           heading ( type: esriFieldTypeDouble , alias: heading , nullable: true )
           rp1lat ( type: esriFieldTypeDouble , alias: rp1lat , nullable: true )
           rp1lon ( type: esriFieldTypeDouble , alias: rp1lon , nullable: true )
           rp1alt ( type: esriFieldTypeDouble , alias: rp1alt , nullable: true )
           rp1clock ( type: esriFieldTypeDate , alias: rp1clock , nullable: true )
           squawk ( type: esriFieldTypeString , alias: squawk , nullable: true )
           hexid ( type: esriFieldTypeString , alias: hexid , nullable: true )
           fob ( type: esriFieldTypeDouble , alias: fob , nullable: true )
           oat ( type: esriFieldTypeDouble , alias: oat , nullable: true )
           airspeed_kts ( type: esriFieldTypeDouble , alias: airspeed_kts , nullable: true )
           airspeed_mach ( type: esriFieldTypeDouble , alias: airspeed_mach , nullable: true )
           winds ( type: esriFieldTypeDouble , alias: winds , nullable: true )
           eta ( type: esriFieldTypeDate , alias: eta , nullable: true )
           baro_alt ( type: esriFieldTypeDouble , alias: baro_alt , nullable: true )
           gps_alt ( type: esriFieldTypeDouble , alias: gps_alt , nullable: true )
           atcident ( type: esriFieldTypeString , alias: atcident , nullable: true )
           */

          this.flightsLayer.updateFilter({ geometry: this.initialViewExtent }).then(function (evt) {
            console.info("updateFilter: ", evt.filter);
          }.bind(this));

          /*view.watch("extent", function (extent) {
           let flightsFilter = { geometry: extent };
           this.flightsLayer.updateFilter(flightsFilter).then(function (evt) {
           console.info("updateFilter: ", evt.filter);
           }.bind(this));
           }.bind(this));*/


          this.flightsLayer.purgeOptions = { age: 5 };

          this.flightsLayer.popupTemplate = new PopupTemplate({
            title: "{ident}",
            content: "{alt}m<br>{clock:DateFormat}<br>{id}",
            actions: [{
              id: "follow-flight",
              title: "Follow Flight",
              className: "esri-icon-locate-circled"
            }]
          });

          // UPDATE LABELING //
          this.flightsLayer.labelingInfo = [
            new LabelClass({
              labelExpressionInfo: { value: "{ident}" },
              labelPlacement: "above-center",
              symbol: new LabelSymbol3D({
                symbolLayers: [
                  new TextSymbol3DLayer({
                    material: { color: Color.named.lime },
                    size: 9,
                    font: {
                      style: "normal",
                      weight: "bold",
                      family: "Avenir Next W00"
                    }
                  })
                ]
              })
            })
          ];
          this.flightsLayer.labelsVisible = true;

          // UPDATE RENDERER //
          this.flightsLayer.renderer = new SimpleRenderer({
            symbol: new PointSymbol3D({
              symbolLayers: [
                /*new ObjectSymbol3DLayer({
                 height: 1000.0, /!*width: 200.0, depth: 2000.0,*!/
                 resource: {
                 primitive: "sphere"
                 },
                 material: {
                 color: Color.named.lime.concat(0.8)
                 }
                 }),*/
                new ObjectSymbol3DLayer({
                  height: 500.0, width: 2000.0, depth: 5000.0,
                  resource: {
                    href: "./resources/models/Arrow3D_003.json"
                  },
                  material: {
                    color: Color.named.lime.concat(0.8)
                  }
                }),
                new ObjectSymbol3DLayer({
                  height: -15000.0, width: 150.0, depth: 150.0,
                  resource: {
                    primitive: "cylinder"
                  },
                  material: {
                    color: Color.named.white.concat(0.3)
                  }
                })
              ]
            }),
            visualVariables: [
              /*{
               type: "color",
               field: "alt",
               stops: [
               { value: 0.0, color: Color.named.red.concat(0.3) },
               { value: 1000.0, color: Color.named.orange.concat(0.8) },
               { value: 1001.0, color: Color.named.yellow.concat(0.8) },
               { value: 5000.0, color: Color.named.lime }
               ]
               },*/
              {
                type: "rotation",
                rotationType: "geographic", // "arithmetic" "geographic"
                field: "heading"
              }
            ]
          });

          // ADD LAYER TO MAP //
          view.map.add(this.flightsLayer);

          watchUtils.when(view.popup, "selectedFeature", function (selectedFeature) {
            if(this.filterFlightPlan) {
              this.selectedFlight = (selectedFeature && (selectedFeature.layer === this.flightsLayer)) ? selectedFeature : null;
              this.filterFlightPlan();
            }
          }.bind(this));

          /*watchUtils.whenFalse(view.popup, "visible", function () {
           this.selectedFlight = null;
           this.followFlight();
           }.bind(this));*/

          /*view.popup.on("trigger-action", function (evt) {
           if(evt.action.id === "follow-flight") {
           this.selectedFlight = view.popup.selectedFeature;
           this.followFlight();
           }
           }.bind(this));*/

          /*this.followFlight = function (flightToFollow) {
           if(this.selectedFlight) {
           view.goTo({
           target: this.selectedFlight.geometry,
           heading: +this.selectedFlight.getAttribute("heading"),
           tilt: view.camera.tilt
           });
           }
           }.bind(this);*/

          this.flightsLayer.on("graphics-controller-create", function (evt) {
            let graphicsCollection = evt.graphicsController.graphics;
            graphicsCollection.on("change", function (evt) {
              //console.info(evt.added.length, evt.moved.length, evt.removed.length,evt);
              evt.added.forEach(function (added) {
                if(this.selectedFlight && (this.selectedFlight.getAttribute("ident") === added.getAttribute("ident"))) {
                  this.selectedFlight = added;
                  //this.followFlight();
                }
              }.bind(this));

            }.bind(this));
          }.bind(this));


        }.bind(this)).otherwise(function (error) {
          console.warn(error);

        }.bind(this));
      }.bind(this));

    },

    loadFlightAwarePlans: function (view) {

      let bottomPanel = dom.byId("bottom-panel");
      let flightPlanContainer = domConstruct.create("div", { id: "flight-plan-view" }, bottomPanel);
      this.flightPlanView = new MapView({
        container: flightPlanContainer,
        ui: { components: ["compass"] },
        constraints: { snapToZoom: false },
        map: new Map({ basemap: "streets-night-vector" }),
        extent: view.extent
      });
      this.flightPlanView.then(function () {


        let flightPlanViewScaleNode = domConstruct.create("div", { className: "ui-node esri-component esri-widget flight-plan-node" });
        this.flightPlanView.ui.add(flightPlanViewScaleNode, { position: "bottom-left", index: 0 });
        watchUtils.init(this.flightPlanView, "scale, rotation", function () {
          flightPlanViewScaleNode.innerHTML = lang.replace("{scale} --- {rotation}", {
            scale: number.format(this.flightPlanView.scale, { places: 0 }),
            rotation: number.format(this.flightPlanView.rotation, { places: 1 })
          });
        }.bind(this));


        this.flightPlanNode = domConstruct.create("div", { className: "ui-node esri-component esri-widget flight-plan-node" });
        this.flightPlanView.ui.add(this.flightPlanNode, { position: "top-right", index: 0 });

        this.flightPlanInfoNode = domConstruct.create("div", { className: "ui-node esri-component esri-widget flight-plan-node" });
        this.flightPlanView.ui.add(this.flightPlanInfoNode, { position: "top-right", index: 1 });

        /* this.flightPlanView.popup.dockEnabled = true;
         this.flightPlanView.popup.dockOptions = {
         buttonEnabled: false,
         position: "top-left",
         breakpoint: true
         };*/

        // https://geoeventsample3.esri.com:6443/arcgis/rest/services/Hosted/FlightAwareFlightPlan/FeatureServer/0

        /*
         dest ( alias: dest , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         reg ( alias: reg , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         prefix ( alias: prefix , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         ete ( alias: ete , type: esriFieldTypeInteger , editable: true , nullable: true )
         edt ( alias: edt , type: esriFieldTypeDate , length: 29 , editable: true , nullable: true )
         suffix ( alias: suffix , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         atcident ( alias: atcident , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         ident ( alias: ident , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         aircrafttype ( alias: aircrafttype , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         id ( alias: id , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         alt ( alias: alt , type: esriFieldTypeDouble , editable: true , nullable: true )
         status ( alias: status , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         eta ( alias: eta , type: esriFieldTypeDate , length: 29 , editable: true , nullable: true )
         orig ( alias: orig , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         route ( alias: route , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         type ( alias: type , type: esriFieldTypeString , length: 1000000 , editable: true , nullable: true )
         speed ( alias: speed , type: esriFieldTypeDouble , editable: true , nullable: true )
         objectid ( alias: objectid , type: esriFieldTypeOID , length: 8 , editable: false , nullable: false )
         globalid ( alias: globalid , type: esriFieldTypeGlobalID , length: 1000000 , editable: false , nullable: false )
         _id ( alias: _id , type: esriFieldTypeString , length: 32 , editable: false , nullable: false )
         */

        Layer.fromPortalItem({ id: "9d985753903448869cabd25a78988a3f" }).then(function (layer) {
          this.flightPlansLayer2 = layer;
          this.flightPlansLayer2.load().then(function () {

            this.flightPlansLayer2.visible = false;
            this.flightPlansLayer2.renderer.symbol.color = Color.named.yellow;

            /*this.flightPlansLayer2.labelingInfo = [
             new LabelClass({
             labelExpressionInfo: { value: "{ident} - {orig} to {dest}" },
             labelPlacement: "above-along",
             symbol: new LabelSymbol3D({
             symbolLayers: [
             new TextSymbol3DLayer({
             material: { color: Color.named.yellow },
             size: 15,
             font: {
             style: "normal",
             weight: "bold",
             family: "Avenir Next W00"
             }
             })
             ]
             })
             })
             ];
             this.flightPlansLayer2.labelsVisible = true;*/

            /*this.flightPlansLayer2.popupTemplate = new PopupTemplate({
             title: "{ident} - {orig} to {dest}",
             content: "{*}"
             });*/

            this.flightPlanView.map.add(this.flightPlansLayer2);

            this.flightPlanGraphic = new Graphic({ symbol: this.flightPlansLayer2.renderer.symbol.clone() });
            this.flightPlanView.graphics.add(this.flightPlanGraphic);

          }.bind(this));
        }.bind(this));


        Layer.fromPortalItem({ id: "9d985753903448869cabd25a78988a3f" }).then(function (layer) {
          this.flightPlansLayer = layer;

          this.flightPlansLayer.load().then(function () {
            //console.info(this.flightPlansLayer);

            this.flightPlansLayer.elevationInfo = {
              offset: 1000,
              mode: "relative-to-ground"
            };

            this.flightPlansLayer.renderer = new SimpleRenderer({
              symbol: new LineSymbol3D({
                symbolLayers: [
                  new LineSymbol3DLayer({
                    size: 2.5,
                    material: { color: Color.named.yellow.concat(0.8) }
                  })
                ]
              })
            });

            this.flightPlansLayer.popupTemplate = new PopupTemplate({
              title: "{ident}",
              content: "{*}"
            });

            this.flightPlansLayer.visible = false;

            // ADD LAYER TO MAP //
            view.map.add(this.flightPlansLayer);


            // FILTER FLIGHT PLAN BY IDENTITY //
            this.filterFlightPlan = function () {
              if(this.selectedFlight != null) {
                this.flightPlansLayer.elevationInfo = {
                  offset: (+this.selectedFlight.getAttribute("alt") * 0.3048),
                  mode: "relative-to-ground"
                };

                let flightPlanDefinitionExpression = lang.replace("ident = '{ident}'", this.selectedFlight.attributes);

                this.flightPlansLayer.definitionExpression = flightPlanDefinitionExpression;
                this.flightPlansLayer.visible = true;

                //this.flightPlansLayer2.definitionExpression = flightPlanDefinitionExpression
                //this.flightPlansLayer2.visible = true;
                this.zoomToFlightPlan(flightPlanDefinitionExpression);

              } else {
                this.flightPlansLayer.definitionExpression = null;
                this.flightPlansLayer.visible = false;

                this.flightPlansLayer2.definitionExpression = null;
                this.flightPlansLayer2.visible = false;
              }
            }.bind(this);


          }.bind(this));
        }.bind(this));

      }.bind(this));
    },

    _testRotatedGeom: function (geom) {
      if(!this.rotatedGraphic) {
        this.rotatedGraphic = new Graphic({ geometry: geom, symbol: new SimpleLineSymbol({ color: Color.named.red, width: 1.5, style: "dash" }) });
        this.flightPlanView.graphics.add(this.rotatedGraphic);
      } else {
        this.flightPlanView.graphics.remove(this.rotatedGraphic);
        this.rotatedGraphic = this.rotatedGraphic.clone();
        this.rotatedGraphic.geometry = geom;
        this.flightPlanView.graphics.add(this.rotatedGraphic);
      }
    },

    /**
     * https://jscore.esri.com/javascript/latest/api-reference/esri-geometry-support-normalizeUtils.html
     *
     * @param definitionExpression
     */
    zoomToFlightPlan: function (definitionExpression) {

      this.flightPlanNode.innerHTML = "";

      this.flightPlansLayer2.queryFeatures(new Query({
        where: definitionExpression,
        outFields: ["*"],
        returnGeometry: true
      })).then(function (featureSet) {
        if(featureSet.features.length > 0) {
          let flightPlanFeature = featureSet.features[0];
          let flightPlanGeometry = flightPlanFeature.geometry;

          this.flightPlanNode.innerHTML = lang.replace("{ident} - {orig} to {dest}", flightPlanFeature.attributes);

          //console.info(esriConfig.geometryServiceUrl);
          //normalizeUtils.normalizeCentralMeridian([flightPlanGeometry]).then(function (normalizedGeometries) {
          //  flightPlanGeometry = normalizedGeometries[0];

          this.flightPlanView.graphics.remove(this.flightPlanGraphic);
          this.flightPlanGraphic = this.flightPlanGraphic.clone();
          this.flightPlanGraphic.geometry = flightPlanGeometry;
          this.flightPlanView.graphics.add(this.flightPlanGraphic);

          let flightPlanStart = flightPlanGeometry.getPoint(0, 0);
          let flightPlanEnd = flightPlanGeometry.getPoint(0, flightPlanGeometry.paths[0].length - 1);

          let nearInfo = this.nearUtils._distVincenty(flightPlanStart.y, flightPlanStart.x, flightPlanEnd.y, flightPlanEnd.x);
          let angleDeg = nearInfo.FWD_AZIMUTH;
          let distanceMeters = nearInfo.DISTANCE;

          let rotationAngle = (360.0 - angleDeg) + 90.0;
          let rotatedFlightPlanGeom = geometryEngine.rotate(webMercatorUtils.geographicToWebMercator(flightPlanGeometry), rotationAngle);
          //this._testRotatedGeom(rotatedFlightPlanGeom);

          //let hullFlightPlan = geometryEngine.convexHull(rotatedFlightPlanGeom);
          //console.info(JSON.stringify(hullFlightPlan.toJSON(), null, " "));

          let scaleRatio = (rotatedFlightPlanGeom.extent.width / this.flightPlanView.extent.width);

          this.flightPlanView.goTo({
            target: flightPlanGeometry.extent.center,
            rotation: rotationAngle,
            scale: (this.flightPlanView.scale * scaleRatio)
          }).then(function () {

            console.info("========================================================");
            //console.info("ROTATION- view=", this.flightPlanView.rotation, "start-end=", angleDeg);
            console.info("OTHER- distance=", number.format(distanceMeters, { places: 0 }), "scale=", number.format(this.flightPlanView.scale, { places: 0 }));

            this.flightPlanInfoNode.innerHTML = lang.replace("Scale: {scale}<br>Rotation: {rotation}<br>Ratio: {ratio}", lang.mixin({}, {
              scale: number.format(this.flightPlanView.scale, { places: 0 }),
              rotation: number.format(this.flightPlanView.rotation, { places: 1 }),
              ratio: number.format(scaleRatio, { places: 3 })
            }, flightPlanFeature.attributes));

          }.bind(this));

        } else {
          this.flightPlanNode.innerHTML = "Can't find flight plan...";
        }
      }.bind(this));
    },

    createFOVGeometry: function (view, aoiGeometry) {

      let halfFOV = (view.camera.fov * 0.5);
      let startAzi = Math.floor(view.camera.heading - halfFOV);
      let endAzi = Math.floor(view.camera.heading + halfFOV);

      let startPoint = this._pointTo(aoiGeometry.center, aoiGeometry.radius, startAzi);
      let endPoint = this._pointTo(aoiGeometry.center, aoiGeometry.radius, endAzi);

      return {
        startRad: this._azimuthToRadians(startAzi),
        endRad: this._azimuthToRadians(endAzi),
        fovGeometry: new Polyline({
          spatialReference: view.spatialReference,
          paths: [[[startPoint.x, startPoint.y], [aoiGeometry.center.x, aoiGeometry.center.y], [endPoint.x, endPoint.y]]]
        })
      };

    },

    _azimuthToRadians: function (azimuth) {
      return (azimuth * (Math.PI / 180.0));
    },

    _pointTo: function (p, dist, azimuth) {
      // SUBTRACT 90.0 ???
      let radians = this._azimuthToRadians(azimuth - 90.0);
      return {
        x: p.x + Math.cos(radians) * dist,
        y: p.y - Math.sin(radians) * dist
      };
    },

    createNearWorkerConnection: function () {
      const local = location.href.substring(0, location.href.lastIndexOf('/'));
      const nearWorkerUrl = local + "/js/application/NearUtils.js";
      return workers.open(this, nearWorkerUrl);
    },

    _calcNear: function (view) {

      // POSITION //
      let position = view.camera.position;

      this.overview.graphics.remove(this.viewPositionGraphic);
      this.viewPositionGraphic = this.viewPositionGraphic.clone();
      this.viewPositionGraphic.geometry = Point.fromJSON(position.toJSON());
      this.overview.graphics.add(this.viewPositionGraphic);

      // CUTOFF IN KILOMETERS //
      const cutoffKms = +this.cutoffInput.value;

      // UPDATE NEAR AOI //
      this.updateNearAOI(position, cutoffKms, true);

      // SET START TIME //
      let startTime = new Date();

      // VIEW POSITION IN GEOGRAPHIC COORDINATES //
      let locationGeo = { longitude: position.longitude, latitude: position.latitude };

      // CALL NEAR CALCULATIONS FOR GRAPHICS WITHIN THE CUTOFF DISTANCE //
      let nearCalculations = this.airportLocationsList.filter(function (locationsInfo) {
        // IS GROUP OF GRAPHICS WITHIN THE CUTOFF DISTANCE //
        return (geometryEngine.distance(locationsInfo.extent, position, "kilometers") < cutoffKms);
      }.bind(this)).map(function (locationsInfo) {
        // NEAR CALCULATIONS //
        return this.nearWorkerConnection.invoke("calculateNear", {
          location: locationGeo,
          featureInfos: locationsInfo.featureInfos,
          cutoffMeters: (cutoffKms * 1000)
        });
      }.bind(this));

      // NO EXTENT FILTER BEFORE INVOKING WORKERS //
      /* let nearCalculations = this.airportLocationsList.map(function (locationsInfo) {
       // NEAR CALCULATIONS //
       return connection.invoke("calculateNear", {
       location: locationGeo,
       geometries: locationsInfo.geometries,
       cutoffMeters: (cutoffKms * 1000)
       });
       }.bind(this));*/
      //console.info(this.airportLocationsList.length, nearCalculations.length);

      // ALL NEAR CALCULATIONS ARE COMPLETE //
      all(nearCalculations).then(function (nearCalculationsResults) {
        // CALC DURATION //
        let durationMs = date.difference(startTime, new Date(), "millisecond");
        this.updateProcessingInfo(lang.replace("Processing Time: {durationMs} ms", { durationMs: durationMs }));

        // FIND AND DISPLAY NEAREST AIRPORT //
        this.displayNearestAirport(view, nearCalculationsResults);

      }.bind(this));

    },

    displayNearestAirport: function (view, nearCalculationsResults) {

      // AGGREGATE AND SORT RESULTS //
      //
      // TODO: DO WE REALLY NEED TO DO THIS ON A WORKER ????
      //
      this.nearWorkerConnection.invoke("aggregateResults", {
        allResultsInfos: nearCalculationsResults,
        sortField: "DISTANCE"
      }).then(function (data) {

        // AGGREGATED AND SORTED RESULTS //
        let aggregatedResults = data.aggregatedResults;

        // WITHIN FOV //
        if(dom.byId("within-fov-input").checked) {
          aggregatedResults = aggregatedResults.filter(function (featureInfo) {
            let fwdRad = this._azimuthToRadians(featureInfo.FWD_AZIMUTH);
            return (this.fovInfo.startRad < fwdRad) && (fwdRad < this.fovInfo.endRad);
          }.bind(this));
        }

        // SUM TOTAL AIRPORTS WITHIN CUTOFF DISTANCE //
        this.updateNearInfo(lang.replace("{totalNearByAirports}", { totalNearByAirports: number.format(aggregatedResults.length) }));

        // DO WE HAVE ANY RESULTS //
        if(aggregatedResults.length > 0) {

          //this.setNearbyAirports(aggregatedResults)

          // NEAREST AIRPORT OID //
          let nearestAirportOID = aggregatedResults[0].id;

          // UPDATE NEAREST FEATURE IF CHANGED //
          if(this.nearestAirportGraphic.attributes.id != nearestAirportOID) {
            // OBJECT ID FIELD //
            let objectIdField = this.airportsLayer.objectIdField;

            // FIND NEAREST FEATURE //
            let nearestAirportFeature = this.airportFeatures.find(function (graphic) {
              return (graphic.getAttribute(objectIdField) === nearestAirportOID);
            });
            // DISPLAY NEAREST FEATURE IN POPUP //
            view.popup.open({ features: [nearestAirportFeature] });

            // UPDATE NEAREST FEATURE GRAPHIC IN OVERVIEW //
            this.overview.graphics.remove(this.nearestAirportGraphic);
            this.nearestAirportGraphic = new Graphic({
              geometry: nearestAirportFeature.geometry.clone(),
              symbol: new SimpleMarkerSymbol({ color: Color.named.red.concat(0.7), size: "9pt", outline: { color: Color.named.white } }),//this.airportsLayer.renderer.getSymbol(nearestAirportFeature),
              attributes: { id: nearestAirportOID }
            });
            this.overview.graphics.add(this.nearestAirportGraphic);
          }
        } else {
          this.overview.graphics.remove(this.nearestAirportGraphic);
        }

      }.bind(this));

    }

  });
});
