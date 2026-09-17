import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createMasterAdmin() {
    try {
        console.log('[AVISO] Creating master admin user...');

        const hashedPassword = await bcrypt.hash('Lau2025.', 10);

        const admin = await prisma.adminUser.upsert({
            where: { email: 'masteradmin@electroshopve.com' },
            update: {
                password: hashedPassword,
                name: 'Master Admin',
                role: 'SUPER_ADMIN',
                permissions: [
                    'MANAGE_PRODUCTS',
                    'MANAGE_ORDERS',
                    'MANAGE_USERS',
                    'MANAGE_CONTENT',
                    'MANAGE_SETTINGS',
                    'VIEW_REPORTS'
                ],
                isActive: true,
            },
            create: {
                email: 'masteradmin@electroshopve.com',
                password: hashedPassword,
                name: 'Master Admin',
                role: 'SUPER_ADMIN',
                permissions: [
                    'MANAGE_PRODUCTS',
                    'MANAGE_ORDERS',
                    'MANAGE_USERS',
                    'MANAGE_CONTENT',
                    'MANAGE_SETTINGS',
                    'VIEW_REPORTS'
                ],
                isActive: true,
            },
        });

        console.log('[OK] Master admin created successfully!');
        console.log('[AVISO] Email: masteradmin@electroshopve.com');
        console.log('[AVISO] Password: Lau2025.');
        console.log('[AVISO] Login at: http://localhost:3000/admin/login');

    } catch (error) {
        console.error('[ERROR] Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createMasterAdmin();
