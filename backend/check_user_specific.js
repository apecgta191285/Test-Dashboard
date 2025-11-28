
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Finding User aadmin@test.com ---');
    const user = await prisma.user.findUnique({
        where: { email: 'aadmin@test.com' },
        select: { id: true, email: true, tenantId: true }
    });
    console.log(user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
