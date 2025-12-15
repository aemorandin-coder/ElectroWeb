const { PrismaClient } = require('@prisma/client');

async function resetAdminBalance() {
    const prisma = new PrismaClient();

    try {
        const result = await prisma.userBalance.updateMany({
            where: {
                user: {
                    role: { in: ['ADMIN', 'SUPER_ADMIN'] }
                }
            },
            data: {
                balance: 0
            }
        });

        console.log(`✅ Saldo de ${result.count} admin(s) reseteado a $0.00`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminBalance();
