import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { useLocation } from '../../src/hooks/useLocation';
import { awardBadge } from '../../src/utils/badges';
import { LocationSelector } from '../../src/components/LocationSelector';
import { MapPickerModal } from '../../src/components/MapPickerModal';

const CATEGORIES = ['Outdoor', 'Sports', 'Fitness', 'Social', 'Learning', 'Arts', 'Other'];

export default function CreateActivity() {
  const { user } = useAuth();
  const { getCurrentLocation } = useLocation();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outdoor');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('12:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [userCurrentLocation, setUserCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Fetch user's current location on mount
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      try {
        const locationData = await getCurrentLocation();
        if (locationData) {
          setUserCurrentLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          });
        }
      } catch (error) {
        console.log('Could not get current location');
      }
    };
    
    fetchCurrentLocation();
  }, [getCurrentLocation]);

  const handleCreate = async () => {
    if (!user) {
      console.log('No user found');
      return;
    }

    console.log('Attempting to create activity with:', { title, description, date });

    if (!title.trim() || !description.trim() || !date) {
      Alert.alert('Error', 'Please fill in all required fields:\n- Title\n- Description\n- Date');
      return;
    }

    // Parse time (HH:MM format)
    const timeParts = time.split(':');
    if (timeParts.length !== 2) {
      Alert.alert('Error', 'Invalid time format. Use HH:MM (e.g., 14:30)');
      return;
    }

    const [hours, minutes] = timeParts.map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
      Alert.alert('Error', 'Invalid time. Hours: 0-23, Minutes: 0-59');
      return;
    }

    const activityDate = new Date(date);
    activityDate.setHours(hours, minutes, 0, 0);

    if (activityDate < new Date()) {
      Alert.alert('Error', 'Activity date must be in the future');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating activity with date:', activityDate);
      
      const activityData: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim() || null,
        date: activityDate,
        creatorId: user.id,
        creatorName: user.displayName,
        participants: [user.id],
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        createdAt: serverTimestamp(),
      };

      // Add coordinates if available
      if (latitude !== null && longitude !== null) {
        activityData.latitude = latitude;
        activityData.longitude = longitude;
      }

      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log('Activity created with ID:', docRef.id);
      
      // Award "Organizer" badge for creating first activity
      await awardBadge(user.id, 'organizer');

      console.log('Activity created successfully, navigating back');
      router.push('/(tabs)/activities');
    } catch (error) {
      console.error('Error creating activity:', error);
      Alert.alert('Error', `Failed to create activity: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const locationData = await getCurrentLocation();
      if (locationData) {
        setLatitude(locationData.latitude);
        setLongitude(locationData.longitude);
        if (locationData.address) {
          setLocation(locationData.address);
        }
      }
    } catch (error) {
      Alert.alert('Error', `Failed to get location: ${error}`);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleDateSelect = (selectedDate: Date) => {
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  const generateDateDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  return (
    <View style={styles.container}>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Morning hike at sunrise"
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the activity..."
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[styles.categoryText, category === cat && styles.categoryTextSelected]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <LocationSelector
            onLocationSelect={(selectedLocation) => {
              setLocation(selectedLocation.address);
              setLatitude(selectedLocation.latitude);
              setLongitude(selectedLocation.longitude);
            }}
            onMapOpen={() => setShowMapPicker(true)}
            currentLocation={userCurrentLocation}
          />
          {latitude !== null && longitude !== null && (
            <Text style={styles.coordsText}>
              📌 Location set ({latitude.toFixed(4)}, {longitude.toFixed(4)})
            </Text>
          )}

          <MapPickerModal
            visible={showMapPicker}
            onClose={() => setShowMapPicker(false)}
            onLocationSelect={(selectedLocation) => {
              setLocation(selectedLocation.address);
              setLatitude(selectedLocation.latitude);
              setLongitude(selectedLocation.longitude);
              setShowMapPicker(false);
            }}
            initialLocation={userCurrentLocation || { latitude: 40.7128, longitude: -74.006 }}
          />

          <Text style={styles.label}>Date & Time *</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerButtonText}>
              {date ? date.toLocaleDateString() : 'Select Date'}
            </Text>
          </TouchableOpacity>

          {date && (
            <View style={styles.timeInputContainer}>
              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
              />
            </View>
          )}

          <Text style={styles.label}>Max Participants</Text>
          <TextInput
            style={styles.input}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="Leave empty for unlimited"
            keyboardType="number-pad"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Activity'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Date</Text>
              <View style={{ width: 30 }} />
            </View>
            
            <ScrollView style={styles.dateGrid}>
              {generateDateDays().map((d, index) => {
                const isSelected = date && d.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                    onPress={() => handleDateSelect(d)}
                  >
                    <Text style={[styles.dateItemText, isSelected && styles.dateItemTextSelected]}>
                      {d.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  datePickerButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  timeInputContainer: {
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  locationButtonLoading: {
    opacity: 0.6,
  },
  locationButtonText: {
    fontSize: 18,
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
    width: 30,
  },
  dateGrid: {
    padding: 16,
  },
  dateItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  dateItemSelected: {
    backgroundColor: '#007AFF',
  },
  dateItemText: {
    fontSize: 16,
    color: '#333',
  },
  dateItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
