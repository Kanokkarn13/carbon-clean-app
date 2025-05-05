import React from 'react';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { LocationObject } from 'expo-location';
import { StyleSheet } from 'react-native';

type MapViewComponentProps = {
  location: LocationObject | null;
};

const MapViewComponent = ({ location }: MapViewComponentProps) => {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: location?.coords.latitude || 51.5074, // Default to London
        longitude: location?.coords.longitude || -0.1278,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      region={location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      } : undefined}
    >
      {/* OpenStreetMap Tile Layer */}
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
      />
      
      {location && (
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title="Your Position"
          description={`Speed: ${(location.coords.speed || 0).toFixed(1)} m/s`}
        />
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 300,
    marginVertical: 20,
    borderRadius: 10,
  },
});

export default MapViewComponent;