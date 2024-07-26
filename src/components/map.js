import { useMemo, useRef } from "react";
import { useEffect, useCallback, useState } from "react";
import Places from "./places";
import { useSelector, useDispatch } from "react-redux";
import { markers } from "./mapSlice";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import fakeData from "../data/dummygeo";
import { setMarkers } from "./mapSlice";
import { pointInCircle, pointInPolygon, pointInRectangle } from "./helper";

const Map = () => {
  const allMarkers = useSelector(markers);
  const [overlayData, setOverlayData] = useState(null);
  const [markerClusterer, setMarkerClusterer] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const allData = fakeData.features;

  const center = { lat: 16.816746183204216, lng: 96.17084648419899 };
  const dispatch = useDispatch();

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyBDJOtxDvDrnOwBGl-hp4axYEvdobwx_XY",
    libraries: ["places", "drawing"],
  });

  const [map, setMap] = useState(null);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const google = window.google;

  useEffect(() => {
    dispatch(setMarkers(fakeData.features));
  }, []);

  //////////add uniquepoint to existing allMarkers
  const combineUniqueData = (existingData, newData) => {
    const combinedData = [...existingData];

    newData.forEach((newPoint) => {
      const [newLng, newLat] = newPoint.geometry.coordinates;
      const exists = combinedData.some((existingPoint) => {
        const [lng, lat] = existingPoint.geometry.coordinates;
        return lng === newLng && lat === newLat;
      });
      if (!exists) {
        combinedData.push(newPoint);
      }
    });

    return combinedData;
  };

  ///////////

  useEffect(() => {
    if (map && allMarkers.length) {
      const googleMarkers = allMarkers.map((marker) => {
        const googleMarker = new google.maps.Marker({
          position: {
            lat: marker.geometry.coordinates[1],
            lng: marker.geometry.coordinates[0],
          },
        });

        const infoBoxContent = `
          <div>
            <p>[${marker.geometry.coordinates[1]},${marker.geometry.coordinates[0]}]</p>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoBoxContent,
        });

        googleMarker.addListener("click", () => {
          infoWindow.open(map, googleMarker);
        });

        return googleMarker;
      });
      // Clear existing clusters
      if (markerClusterer) {
        markerClusterer.clearMarkers();
      }

      const newMarkerClusterer = new MarkerClusterer({
        markers: googleMarkers,
        map,
        // Set gridSize here
        gridSize: 50,
        minimumClusterSize: 5,
      });
      setMarkerClusterer(newMarkerClusterer);
    }
  }, [map, allMarkers]);

  useEffect(() => {
    if (map) {
      // Initialize the DrawingManager
      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.MARKER,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: ["circle", "polygon", "polyline", "rectangle"],
        },
        markerOptions: {
          draggable: true,
        },
      });
      drawingManager.setMap(map);
      window.google.maps.event.addListener(
        drawingManager,
        "overlaycomplete",
        function (event) {
          const shape = event.overlay;
          const type = event.type;

          let overlayData;

          if (type === window.google.maps.drawing.OverlayType.CIRCLE) {
            const center = shape.getCenter();
            const radius = shape.getRadius();
            overlayData = {
              type: "circle",
              center: { lat: center.lat(), lng: center.lng() },
              radius,
            };
          } else if (
            type === window.google.maps.drawing.OverlayType.POLYGON ||
            type === window.google.maps.drawing.OverlayType.POLYLINE
          ) {
            const path = shape.getPath();
            const coordinates = path.getArray().map((point) => ({
              lat: point.lat(),
              lng: point.lng(),
            }));
            overlayData = {
              type: "polygon",
              coordinates,
            };
          } else if (
            type === window.google.maps.drawing.OverlayType.RECTANGLE
          ) {
            const bounds = shape.getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            overlayData = {
              type: "rectangle",
              bounds: {
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng(),
              },
            };
          } /* else if (type === window.google.maps.drawing.OverlayType.MARKER) {
            const position = shape.getPosition();
            const latitude = position.lat();
            const longitude = position.lng();
            console.log("Marker data", { longitude, latitude });
          } */

          setOverlayData(overlayData);
          console.log("overlayData", overlayData);

          setOverlays((prevOverlays) => [...prevOverlays, shape]);
          //shape.setMap(null); // remove the shape after getting coordinates
        }
      );
    }
  }, [map]);

  const confirmBox = () => {
    if (!overlays.length) return;
    if (window.confirm("Delete all overlays")) {
      removeOverlays();
    }
  };
  const removeOverlays = () => {
    dispatch(setMarkers(fakeData.features));
    overlays.forEach((overlay) => {
      overlay.setMap(null);
    });
    setOverlays([]); // Clear the overlays array
  };

  useEffect(() => {
    if (map) {
      if (!overlayData) {
        // Display all markers initially
        dispatch(setMarkers(fakeData.features));
      } else {
        dispatch(setMarkers([]));
        // Filter points based on overlay type
        let pointsWithinOverlay;
        if (overlayData.type === "circle") {
          pointsWithinOverlay = allData.filter((point) =>
            pointInCircle(
              {
                lat: point.geometry.coordinates[1],
                lng: point.geometry.coordinates[0],
              },
              overlayData.center,
              overlayData.radius
            )
          );
        } else if (overlayData.type === "polygon") {
          pointsWithinOverlay = allData.filter((point) =>
            pointInPolygon(
              {
                lat: point.geometry.coordinates[1],
                lng: point.geometry.coordinates[0],
              },
              overlayData.coordinates
            )
          );
        } else if (overlayData.type === "rectangle") {
          pointsWithinOverlay = allData.filter((point) =>
            pointInRectangle(
              {
                lat: point.geometry.coordinates[1],
                lng: point.geometry.coordinates[0],
              },
              overlayData.bounds
            )
          );
        }
        console.log("before", allMarkers);
        console.log("pointsWithOverlay", pointsWithinOverlay);

        if (overlays.length <= 1) dispatch(setMarkers(pointsWithinOverlay));
        else {
          const addPoints = combineUniqueData(allMarkers, pointsWithinOverlay);
          dispatch(setMarkers(addPoints));
        }
        console.log("after", allMarkers);
      }
    }
  }, [map, overlayData]);

  return (
    <div className="container">
      <div className="map">
        {isLoaded ? (
          <>
            <GoogleMap
              zoom={13}
              center={center}
              mapContainerClassName="map-container"
              onLoad={onLoad}
              onUnmount={onUnmount}
              onRightClick={confirmBox}
            ></GoogleMap>
          </>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};
export default Map;
