import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Activity } from '../types';

export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

export async function addActivityToCalendar(activity: Activity): Promise<boolean> {
  try {
    const hasPermission = await requestCalendarPermissions();
    
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please enable calendar access in your settings.');
      return false;
    }

    // Get the default calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(
      (cal) => cal.allowsModifications && (Platform.OS === 'ios' ? cal.source.name === 'Default' : true)
    ) || calendars[0];

    if (!defaultCalendar) {
      Alert.alert('Error', 'No calendar available.');
      return false;
    }

    // Create event
    const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
      title: activity.title,
      startDate: activity.date,
      endDate: new Date(activity.date.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
      location: activity.location || '',
      notes: activity.description,
    });

    if (eventId) {
      Alert.alert('Success', 'Activity added to your calendar!');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error adding to calendar:', error);
    Alert.alert('Error', 'Failed to add activity to calendar.');
    return false;
  }
}
