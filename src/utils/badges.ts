import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Badge, BadgeType } from '../types';

const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, 'id' | 'earnedAt'>> = {
  first_activity: {
    name: 'First Steps',
    description: 'Joined your first activity',
    iconName: '🎯',
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Joined 5 different activities',
    iconName: '🦋',
  },
  organizer: {
    name: 'Organizer',
    description: 'Created your first activity',
    iconName: '📋',
  },
  consistent: {
    name: 'Consistent',
    description: 'Joined activities 3 weeks in a row',
    iconName: '🔥',
  },
  early_adopter: {
    name: 'Early Adopter',
    description: 'One of the first users',
    iconName: '⭐',
  },
};

export async function awardBadge(userId: string, badgeType: BadgeType) {
  try {
    const badgeDef = BADGE_DEFINITIONS[badgeType];
    
    // Check if user already has this badge
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingBadges = userData.badges || [];
      
      // Check if badge already exists
      if (existingBadges.some((badge: Badge) => badge.id === badgeType)) {
        return null; // Badge already awarded
      }
    }
    
    const badge: Badge = {
      id: badgeType,
      ...badgeDef,
      earnedAt: new Date(),
    };

    await updateDoc(doc(db, 'users', userId), {
      badges: arrayUnion(badge),
    });

    return badge;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return null;
  }
}

export function getBadgeDefinition(badgeType: BadgeType) {
  return BADGE_DEFINITIONS[badgeType];
}
