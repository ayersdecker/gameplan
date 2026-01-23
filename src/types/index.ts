export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  interests: string[];
  badges: Badge[];
  createdAt: Date;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  date: Date;
  creatorId: string;
  creatorName: string;
  participants: string[];
  maxParticipants?: number;
  createdAt: Date;
}

export interface Message {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  earnedAt: Date;
}

export type BadgeType = 
  | 'first_activity'
  | 'social_butterfly'
  | 'organizer'
  | 'consistent'
  | 'early_adopter';
