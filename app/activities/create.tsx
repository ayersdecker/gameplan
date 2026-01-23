import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { awardBadge } from '../../src/utils/badges';

const CATEGORIES = ['Outdoor', 'Sports', 'Fitness', 'Social', 'Learning', 'Arts', 'Other'];

export default function CreateActivity() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outdoor');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user) return;

    if (!title.trim() || !description.trim() || !date.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const activityData = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim() || null,
        date: new Date(date),
        creatorId: user.id,
        creatorName: user.displayName,
        participants: [user.id],
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'activities'), activityData);
      
      // Award "Organizer" badge for creating first activity
      await awardBadge(user.id, 'organizer');

      Alert.alert('Success', 'Activity created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating activity:', error);
      Alert.alert('Error', 'Failed to create activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Activity</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
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

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Central Park, New York"
          />

          <Text style={styles.label}>Date & Time *</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD HH:MM (e.g., 2024-12-25 09:00)"
          />

          <Text style={styles.label}>Max Participants</Text>
          <TextInput
            style={styles.input}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="Leave empty for unlimited"
            keyboardType="number-pad"
          />

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
      </ScrollView>
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
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
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
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
