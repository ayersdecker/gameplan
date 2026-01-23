import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuth } from '../../src/hooks/useAuth';

const INTEREST_OPTIONS = [
  'Hiking', 'Running', 'Cycling', 'Swimming', 'Yoga',
  'Basketball', 'Soccer', 'Tennis', 'Climbing', 'Fitness',
  'Dancing', 'Photography', 'Cooking', 'Reading', 'Music',
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.id), {
        displayName,
        interests: selectedInterests,
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/signin');
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
            />
          ) : (
            <Text style={styles.name}>{user.displayName}</Text>
          )}
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          {isEditing ? (
            <View style={styles.interestsGrid}>
              {INTEREST_OPTIONS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestChip,
                    selectedInterests.includes(interest) && styles.interestChipSelected,
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.interestText,
                      selectedInterests.includes(interest) && styles.interestTextSelected,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : user.interests.length > 0 ? (
            <View style={styles.interestsGrid}>
              {user.interests.map((interest) => (
                <View key={interest} style={styles.interestChipSelected}>
                  <Text style={styles.interestTextSelected}>{interest}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noInterests}>No interests added yet</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges ({user.badges.length})</Text>
          {user.badges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {user.badges.map((badge, index) => (
                <View key={index} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{badge.iconName}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noBadges}>No badges earned yet. Join activities to earn badges!</Text>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  interestChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  interestText: {
    fontSize: 14,
    color: '#666',
  },
  interestTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  noInterests: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noBadges: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
