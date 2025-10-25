import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const username = process.argv[2] || 'admin';
    const email = process.argv[3] || 'admin@example.com';
    const password = process.argv[4] || 'admin123';

    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'admin'
      }
    });

    console.log('Admin user created successfully!');
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can now login to the admin panel at /admin/login');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
