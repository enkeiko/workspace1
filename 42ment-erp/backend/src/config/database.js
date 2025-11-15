const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error']
});

// Test connection
prisma.$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => console.error('❌ Database connection failed:', err));

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
});

module.exports = prisma;
