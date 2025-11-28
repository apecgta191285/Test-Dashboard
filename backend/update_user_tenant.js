
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'aadmin@test.com';
    const targetTenantId = 'demo-tenant-001';

    console.log(`Updating user ${email} to tenant ${targetTenantId}...`);

    try {
        const user = await prisma.user.update({
            where: { email: email },
            data: { tenantId: targetTenantId },
        });
        console.log('Update successful:', user);
    } catch (error) {
        console.error('Error updating user:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
