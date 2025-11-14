import { User, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import miraclezLogo from '@/assets/miraclez-logo.png';

import CIRCLE_JERK from "@assets/CIRCLE JERK.png";

interface UserAvatarProps {
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface UserProfile {
  username: string;
  avatarType: string;
  avatarBackgroundColor: string;
}

const avatarIcons = {
  // Classic Avatars
  default: '👤',
  boy: '👦',
  girl: '👧',
  man: '👨',
  woman: '👩',
  
  // Gaming & Tech (2025 Trends)
  gamer: '🎮',
  robot: '🤖',
  cyborg: '👾',
  hacker: '🔥',
  esports: '🎯',
  champion: '🏆',
  
  // Cyberpunk & Futuristic
  alien: '👽',
  android: '⚡',
  neon: '💎',
  cyber: '🌟',
  matrix: '🔮',
  spacer: '🛸',
  
  // Fantasy & Mythical (Modern Twist)
  knight: '⚔️',
  wizard: '🧙‍♂️',
  ninja: '🥷',
  dragon: '🐲',
  phoenix: '🔥',
  unicorn: '🦄',
  mystic: '🎭',
  
  // Cool Animals & Creatures
  wolf: '🐺',
  fox: '🦊',
  eagle: '🦅',
  tiger: '🐅',
  shark: '🦈',
  cat: '🐱',
  dog: '🐶',
  panda: '🐼',
  lion: '🦁',
  
  // Pirates & Warriors
  pirate: '🏴‍☠️',
  warrior: '⚡',
  samurai: '🗾',
  
  // Modern Icons
  diamond: '💎',
  fire: '🔥',
  lightning: '⚡',
  star: '⭐',
  crown: '👑'
};

export function UserAvatar({ onClick, size = 'md', className = '' }: UserAvatarProps) {
  // Fetch user profile to get avatar preferences
  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    retry: false,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-12 h-12 md:w-14 md:h-14',
    lg: 'w-8 h-8'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizes = {
    sm: 'text-[8px]',
    md: 'text-xl md:text-2xl',
    lg: 'text-[10px]'
  };

  const avatarType = userProfile?.avatarType || 'default';
  const backgroundColor = userProfile?.avatarBackgroundColor || '#9333ea';
  const avatarEmoji = avatarIcons[avatarType as keyof typeof avatarIcons] || avatarIcons.default;

  if (isLoading) {
    return (
      <button
        onClick={onClick}
        className={`${sizes[size]} rounded-full bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-center hover:opacity-80 transition-opacity flex-shrink-0 touch-friendly-button ${className}`}
        data-testid="button-user-avatar"
      >
        <Loader2 className={`${iconSizeClasses[size]} text-white animate-spin`} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${sizes[size]} rounded-full flex items-center justify-center hover:opacity-90 transition-all hover:scale-110 active:scale-95 flex-shrink-0 touch-friendly-button shadow-md hover:shadow-lg overflow-hidden bg-gradient-to-br from-purple-700 to-purple-500 ${className}`}
      data-testid="button-user-avatar"
      aria-label={`User profile - ${userProfile?.username || 'Guest'}`}
    >
      <img 
        src={CIRCLE_JERK} 
        alt="Miraclez Gaming" 
        className="w-full h-full object-cover"
      />
    </button>
  );
}