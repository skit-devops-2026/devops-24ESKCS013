import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  let email = '';
  let password = '';
  let name = 'System Administrator';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1].trim();
      i++;
    }
  }

  if (!email || !password) {
    console.error(
      'Usage: npm run create-admin -- --email <email> --password <password> [--name <name>]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Administrator password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role === 'admin') {
        console.log(`[Admin Setup] Administrator with email ${email} already exists.`);
      } else {
        existing.role = 'admin';
        existing.passwordHash = await User.hashPassword(password);
        await existing.save();
        console.log(`[Admin Setup] User ${email} successfully promoted to administrator.`);
      }
    } else {
      const passwordHash = await User.hashPassword(password);
      await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
      });
      console.log(`[Admin Setup] Administrator ${email} created successfully.`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Admin Setup Error] ${msg}`);
    process.exit(1);
  }
}

createAdmin();
