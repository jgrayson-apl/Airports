/**
 *
 * NearUtils
 *  - Calculate near operations
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/10/2017 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "esri/core/promiseUtils"
], function (declare, lang, promiseUtils) {


  Number.prototype.toRad = function () {
    return (this * Math.PI / 180.0);
  };

  // JG: RETURN AZIMUTH AS 0-360 //
  Number.prototype.toDeg = function () {
    let deg = (this * 180.0 / Math.PI);
    if(deg < 0.0) {
      deg += 360.0;
    }
    return deg;
  };


  // CLASS //
  const NearUtils = declare(null, {

    /**
     *
     * @param data
     * @returns {Promise.<{data: {success: boolean, results: Array}}>}
     */
    calculateNear: function (data) {

      let location = data.location;
      let featureInfos = data.featureInfos;
      let cutoffMeters = +data.cutoffMeters;

      let nearResults = [];
      featureInfos.forEach(function (featureInfo) {
        let nearInfo = this._distVincenty(location.latitude, location.longitude, featureInfo.latitude, featureInfo.longitude);
        if(nearInfo && (nearInfo.DISTANCE < cutoffMeters)) {
          nearResults.push(lang.mixin({}, featureInfo, nearInfo));
        }
      }.bind(this));

      return promiseUtils.resolve({ data: { success: true, results: nearResults } });
    },

    /**
     *
     * @param data
     * @returns {Promise.<{data: {success: boolean, aggregatedResults: Array}}>}
     */
    aggregateResults: function (data) {

      let allResultsInfos = data.allResultsInfos;
      let sortField = data.sortField;

      let aggregatedResults = [];
      allResultsInfos.forEach(function (resultInfo) {
        aggregatedResults = aggregatedResults.concat(resultInfo.results);
      }.bind(this));

      if(sortField != null) {
        aggregatedResults.sort(function (a1, a2) {
          return (a1[sortField] - a2[sortField]);
        });
      }

      return promiseUtils.resolve({ data: { success: true, aggregatedResults: aggregatedResults } });
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
    /* Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2012             */
    /*                                                                                                */
    /* from: Vincenty inverse formula - T Vincenty, "Direct and Inverse Solutions of Geodesics on the */
    /*       Ellipsoid with application of nested equations", Survey Review, vol XXII no 176, 1975    */
    /*       http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf                                             */
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

    /**
     * Calculates geodetic distance between two points specified by latitude/longitude using
     * Vincenty inverse formula for ellipsoids
     *
     * @param   {Number} lat1 lat of first point in decimal degrees
     * @param   {Number} lon1 lon of first point in decimal degrees
     * @param   {Number} lat2 lat of second point in decimal degrees
     * @param   {Number} lon2 lon of second point in decimal degrees
     * @returns {*} distance in metres between points
     */
    _distVincenty: function (lat1, lon1, lat2, lon2) {
      let a = 6378137, b = 6356752.314245, f = 1 / 298.257223563;  // WGS-84 ellipsoid params
      let L = (lon2 - lon1).toRad();
      let U1 = Math.atan((1 - f) * Math.tan(lat1.toRad()));
      let U2 = Math.atan((1 - f) * Math.tan(lat2.toRad()));
      let sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
      let sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

      let lambda = L, lambdaP, iterLimit = 100;
      let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM;
      do {
        sinLambda = Math.sin(lambda);
        cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        // co-incident points
        if(sinSigma === 0) {
          return { DISTANCE: 0 }
        }
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
        if(isNaN(cos2SigmaM)) cos2SigmaM = 0;  // equatorial line: cosSqAlpha=0 (§6)
        let C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
      } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

      if(iterLimit == 0) return null;  // formula failed to converge

      let uSq = cosSqAlpha * (a * a - b * b) / (b * b);
      let A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
      let B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
      let deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
      let dist = b * A * (sigma - deltaSigma);

      // note: to return initial/final bearings in addition to distance, use something like:
      let fwdBearing = Math.atan2(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
      let revBearing = Math.atan2(cosU1 * sinLambda, -sinU1 * cosU2 + cosU1 * sinU2 * cosLambda);

      return {
        DISTANCE: dist,
        FWD_AZIMUTH: fwdBearing.toDeg(),
        REV_AZIMUTH: revBearing.toDeg()
      };
    }
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */


  });

  // VERSION //
  NearUtils.version = "0.0.1";

  // RETURN CLASS //
  return NearUtils;
});