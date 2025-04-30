'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Dispatch, ReactNode, SetStateAction } from 'react';

interface GeoFence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  coordinates: number[][];
  radius?: number;
  alerts: boolean;
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  children?: ReactNode;
  fences: GeoFence[];
  selectedFence: GeoFence | null;
  onFenceChange: Dispatch<SetStateAction<GeoFence | null>>;
}

const Map = ({ 
  center = [0, 0], 
  zoom = 2, 
  children,
  fences,
  selectedFence,
  onFenceChange 
}: MapProps) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
};

export default Map; 
