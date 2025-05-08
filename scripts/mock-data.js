const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

// Log the environment variables at startup
console.log('Starting mock data generation with:');
console.log(`POSTGRES_USER: ${process.env.POSTGRES_USER || 'not set'}`);
console.log(`POSTGRES_PASSWORD: ${process.env.POSTGRES_PASSWORD ? '******' : 'not set'}`);

// Ensure we have the database connection string
if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL not set, constructing from environment variables...');
  
  // Check if we have the credentials
  if (!process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD) {
    console.warn('WARNING: PostgreSQL credentials not properly set in environment variables');
    console.warn('Using default values (postgres/password)');
  }
  
  // Set the DATABASE_URL with the credentials we have
  process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'password'}@postgres:5432/ev_charger_system?schema=public`;
}

console.log(`Using DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

// Load ChargerStatus from src/models/charger
const ChargerStatus = {
  AVAILABLE: 'AVAILABLE',
  BLOCKED: 'BLOCKED',
  CHARGING: 'CHARGING',
  INOPERATIVE: 'INOPERATIVE',
  REMOVED: 'REMOVED',
  RESERVED: 'RESERVED',
  UNKNOWN: 'UNKNOWN'
};

// Create random status function
function getRandomStatus() {
  const statuses = [
    ChargerStatus.AVAILABLE,
    ChargerStatus.BLOCKED,
    ChargerStatus.CHARGING,
    ChargerStatus.INOPERATIVE,
    ChargerStatus.REMOVED,
    ChargerStatus.RESERVED,
    ChargerStatus.UNKNOWN
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// Create random meter value function
function getRandomMeterValue() {
  return parseFloat((Math.random() * 100).toFixed(2));
}

// Generate a random date in the last 24 hours
function getRandomDate() {
  const now = new Date();
  const randomTime = now.getTime() - Math.floor(Math.random() * 86400000);
  return new Date(randomTime).toISOString();
}

// Format SQL values for insertion
function formatPartnerValues(partner) {
  const now = new Date().toISOString();
  return `('${partner.id}', '${partner.name}', '${partner.apiKey}', '${now}', '${now}')`;
}

async function main() {
  console.log('Generating mock data...');
  console.log(`Using DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
  
  // Initialize Prisma client
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  const PARTNERS_COUNT = 10;
  const CHARGERS_PER_PARTNER = 100000;
  const BATCH_SIZE = 10000; // Larger batch size for SQL inserts
  
  try {
    // Generate all partners first
    console.log(`Preparing ${PARTNERS_COUNT} partners...`);
    
    const partners = [];
    const partnerValues = [];
    
    for (let i = 1; i <= PARTNERS_COUNT; i++) {
      const partnerId = randomUUID();
      const partnerName = `Mock Partner ${i}`;
      const apiKey = randomUUID();
      
      const partner = {
        id: partnerId,
        name: partnerName,
        apiKey: apiKey
      };
      
      partners.push(partner);
      partnerValues.push(formatPartnerValues(partner));
    }
    
    // Insert all partners in a single SQL query
    console.log('Inserting all partners in a single operation...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Partner" ("id", "name", "apiKey", "createdAt", "updatedAt")
      VALUES ${partnerValues.join(',')};
    `);
    
    console.log(`Successfully created ${partners.length} partners`);
    
    // Now create chargers for each partner using bulk inserts
    for (let p = 0; p < partners.length; p++) {
      const partner = partners[p];
      console.log(`Creating ${CHARGERS_PER_PARTNER} chargers for ${partner.name} (${p+1}/${partners.length})...`);
      
      const batches = Math.ceil(CHARGERS_PER_PARTNER / BATCH_SIZE);
      
      for (let batch = 0; batch < batches; batch++) {
        const values = [];
        const batchStart = batch * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, CHARGERS_PER_PARTNER);
        
        console.log(`Processing batch ${batch+1}/${batches} (chargers ${batchStart}-${batchEnd-1})...`);
        
        // Prepare values for this batch
        for (let i = batchStart; i < batchEnd; i++) {
          const chargerId = `charger-${p+1}-${i}`;
          const status = getRandomStatus();
          const meterValue = getRandomMeterValue();
          const now = new Date().toISOString();
          const lastUpdate = getRandomDate();
          
          values.push(`('${chargerId}', '${status}', ${meterValue}, '${lastUpdate}', '${now}', '${now}', '${partner.id}')`);
        }
        
        // Insert batch with a single SQL query
        await prisma.$executeRawUnsafe(`
          INSERT INTO "Charger" ("id", "status", "meterValue", "lastUpdate", "createdAt", "updatedAt", "partnerId")
          VALUES ${values.join(',')};
        `);
        
        console.log(`Batch ${batch+1}/${batches} completed`);
      }
      
      console.log(`Finished creating ${CHARGERS_PER_PARTNER} chargers for partner ${p+1}/${partners.length}`);
    }
    
    // Count total records to verify
    const totalChargers = await prisma.charger.count();
    const totalPartners = await prisma.partner.count();
    
    console.log('\nMock data generation completed!');
    console.log(`Total partners: ${totalPartners}`);
    console.log(`Total chargers: ${totalChargers}`);
    
  } catch (error) {
    console.error('Error generating mock data:', error);
    throw error; // Re-throw to ensure the script exits with non-zero status
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 