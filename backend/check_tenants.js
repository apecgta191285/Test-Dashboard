
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Users ---');
    const users = await prisma.user.findMany({ select: { id: true, email: true, tenantId: true } });
    console.table(users);

    console.log('\n--- Google Ads Accounts ---');
    const accounts = await prisma.googleAdsAccount.findMany({ select: { id: true, customerId: true, tenantId: true } });
    console.table(accounts);

    console.log('\n--- Campaigns (Top 5) ---');
    const campaigns = await prisma.campaign.findMany({ take: 5, select: { id: true, name: true, tenantId: true } });
    console.table(campaigns);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
