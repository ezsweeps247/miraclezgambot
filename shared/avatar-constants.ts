// Shared avatar constants to ensure consistency across all components
export const avatarIcons = {
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

// Avatar options for selection (formatted for UI)
export const avatarOptions = Object.entries(avatarIcons).map(([id, icon]) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1'),
  icon
}));

// Valid avatar types for server validation
export const validAvatarTypes = Object.keys(avatarIcons);

// Default background colors
export const backgroundColors = [
  '#9333ea', '#06B6D4', '#10B981', '#F59E0B', 
  '#EF4444', '#EC4899', '#6366F1', '#84CC16'
];