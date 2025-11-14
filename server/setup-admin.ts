import bcrypt from 'bcrypt';
import { db } from './db';
import { admins } from '@shared/schema';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function createAdmin() {
  try {
    console.log('=== Admin User Creation ===\n');
    
    const username = await question('Enter admin username: ');
    const password = await question('Enter admin password: ');
    const role = await question('Enter admin role (super_admin/admin) [default: super_admin]: ') || 'super_admin';
    
    // Validate inputs
    if (!username || !password) {
      console.error('❌ Username and password are required');
      process.exit(1);
    }
    
    // Check if admin already exists
    const existingAdmin = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
    if (existingAdmin.length > 0) {
      console.error(`❌ Admin with username "${username}" already exists`);
      process.exit(1);
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert the admin
    const [newAdmin] = await db.insert(admins).values({
      username,
      passwordHash,
      role,
      createdAt: new Date(),
      lastLogin: null
    }).returning();
    
    console.log('\n✅ Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Role: ${role}`);
    console.log(`ID: ${newAdmin.id}`);
    console.log('\n📝 Next steps:');
    console.log('1. Set JWT_SECRET environment variable in Railway');
    console.log('2. Deploy your application');
    console.log('3. Navigate to /admin to login');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Add missing import
import { eq } from 'drizzle-orm';

createAdmin();