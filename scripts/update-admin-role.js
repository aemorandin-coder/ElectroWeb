const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Update all ADMIN users to SUPER_ADMIN role
    const result = await prisma.user.updateMany({
        where: {
            role: 'ADMIN'
        },
        data: {
            role: 'SUPER_ADMIN'
        }
    });

    console.log(`✅ Updated ${result.count} admin(s) to SUPER_ADMIN role`);

    // Show updated users
    const admins = await prisma.user.findMany({
        where: {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        },
        select: { email: true, role: true, name: true }
    });
    console.log('Admin users:', admins);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
