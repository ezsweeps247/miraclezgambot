import { useQuery } from '@tanstack/react-query';

interface ChatUserAvatarProps {
  userId?: string;
  username: string;
  size?: 'xs' | 'sm';
}

const avatarIcons = {
  default: '👤',
  boy: '👦',
  girl: '👧',
  man: '👨',
  woman: '👩',
  gamer: '🎮',
  robot: '🤖',
  cyborg: '👾',
  hacker: '🔥',
  esports: '🎯',
  champion: '🏆',
  alien: '👽',
  android: '⚡',
  neon: '💎',
  cyber: '🌟',
  matrix: '🔮',
  spacer: '🛸',
  knight: '⚔️',
  wizard: '🧙‍♂️',
  ninja: '🥷',
  dragon: '🐲',
  phoenix: '🔥',
  unicorn: '🦄',
  mystic: '🎭',
  wolf: '🐺',
  fox: '🦊',
  eagle: '🦅',
  tiger: '🐅',
  shark: '🦈',
  cat: '🐱',
  dog: '🐶',
  panda: '🐼',
  lion: '🦁',
  pirate: '🏴‍☠️',
  warrior: '⚡',
  samurai: '🗾',
  diamond: '💎',
  fire: '🔥',
  lightning: '⚡',
  star: '⭐',
  crown: '👑'
};

interface UserProfile {
  username: string;
  avatarType?: string;
  avatarBackgroundColor?: string;
}

export function ChatUserAvatar({ userId, username, size = 'sm' }: ChatUserAvatarProps) {
  // Fetch user profile if we have a userId
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId && userId !== 'system',
    retry: false,
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  const sizes = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-5 h-5 text-[9px]'
  };

  // System messages get a special icon
  if (userId === 'system' || username === 'System') {
    return (
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0`}>
        <span className="text-[8px]">⚙️</span>
      </div>
    );
  }

  const avatarType = userProfile?.avatarType || 'default';
  const backgroundColor = userProfile?.avatarBackgroundColor || '#9333ea';
  const avatarEmoji = avatarIcons[avatarType as keyof typeof avatarIcons] || avatarIcons.default;

  return (
    <div 
      className={`${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}
      style={{ backgroundColor }}
      title={username}
    >
      <span className={size === 'xs' ? 'text-[8px]' : 'text-[9px]'}>{avatarEmoji}</span>
    </div>
  );
}
