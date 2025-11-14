import bcrypt from 'bcrypt';
import { db } from './server/db';
import { admins } from './shared/schema';
import { eq } from 'drizzle-orm';

async function resetAdminPassword() {
  const username = 'admin';
  const password = 'casino123!';
  
  try {
    // Check if admin exists
    const [existingAdmin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);
    
    if (!existingAdmin) {
      console.log('Creating new admin user...');
      // Create new admin
      const passwordHash = await bcrypt.hash(password, 12);
      await db.insert(admins).values({
        username,
        passwordHash,
        role: 'SUPER_ADMIN'
      });
      console.log('✅ Admin user created!');
    } else {
      console.log('Updating existing admin password...');
      // Update existing admin password
      const passwordHash = await bcrypt.hash(password, 12);
      await db
        .update(admins)
        .set({ passwordHash })
        .where(eq(admins.username, username));
      console.log('✅ Admin password updated!');
    }
    
    console.log('\nAdmin credentials:');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    process.exit(1);
  }
}

resetAdminPassword();