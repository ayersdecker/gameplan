import React from 'react';
import { Map3D } from './Map3D.web';
import { Activity } from '../types';

interface Map3DWrapperProps {
  activities: Activity[];
  nearbyActivities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  onViewActivity: (activity: Activity) => void;
  RADIUS_KM: number;
}

export const Map3DWrapper: React.FC<Map3DWrapperProps> = (props) => {
  return <Map3D {...props} />;
};

export default Map3DWrapper;
