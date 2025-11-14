import { db } from './db';
import { generateServerSeed, hashServerSeed, generateClientSeed } from './games/provably-fair';
import { storage } from './storage';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create initial server seed
    const serverSeed = generateServerSeed();
    const hash = hashServerSeed(serverSeed);
    
    await storage.createServerSeed({
      hash,
      revealedSeed: serverSeed,
      active: true
    });

    console.log('✅ Initial server seed created');

    // Create demo user for development
    if (process.env.NODE_ENV === 'development') {
      try {
        const demoUser = await storage.createUser({
          telegramId: 123456789,
          username: 'demo_user',
          firstName: 'Demo',
          lastName: 'User'
        });

        console.log('✅ Demo user created:', demoUser.id);

        // Create client seed for demo user
        await storage.createClientSeed({
          userId: demoUser.id,
          seed: generateClientSeed()
        });

        console.log('✅ Demo client seed created');
      } catch (error) {
        console.log('ℹ️ Demo user already exists, skipping...');
      }
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed };
