import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const existingUsers = await prisma.user.findMany();
  
  if (existingUsers.length > 0) {
    console.log('Database already seeded. Skipping...');
    return;
  }

  const demoUser = await prisma.user.create({
    data: {
      username: 'demo',
      password_hash: 'demo_password',
      role: 'user',
    },
  });

  const demoDevice = await prisma.device.create({
    data: {
      name: 'Домашняя метеостанция',
      description: 'Метеостанция для мониторинга климата в квартире',
      location: 'Гостиная',
      type: 'sensor',
      owner_id: demoUser.id,
    },
  });

  const demoMetric = await prisma.metric.create({
    data: {
      device_id: demoDevice.id,
      name: 'Температура',
      unit: '°C',
    },
  });

  await prisma.alertRule.createMany({
    data: [
      {
        metric_id: demoMetric.id,
        condition: '>=',
        threshold: 28,
        level: 'warning',
        message_template: 'Температура превысила {threshold}°C',
      },
      {
        metric_id: demoMetric.id,
        condition: '<=',
        threshold: 18,
        level: 'warning',
        message_template: 'Температура опустилась ниже {threshold}°C',
      },
      {
        metric_id: demoMetric.id,
        condition: '>=',
        threshold: 35,
        level: 'critical',
        message_template: 'КРИТИЧЕСКАЯ ТЕМПЕРАТУРА: {value}°C',
      },
    ],
  });

  const now = new Date();
  const readings = [];
  
  for (let i = 47; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000);
    
    const hour = timestamp.getHours();
    let baseTemp = 22;
    let variation = 0;
    
    if (hour >= 6 && hour < 10) {
      variation = (hour - 6) * 0.5;
    } else if (hour >= 10 && hour < 15) {
      variation = 2 + Math.sin((hour - 10) * 0.5) * 1.5;
    } else if (hour >= 15 && hour < 20) {
      variation = 2 - (hour - 15) * 0.4;
    } else if (hour >= 20 || hour < 6) {
      variation = -1 + Math.sin(hour * 0.3) * 0.5;
    }
    
    const random = (Math.random() - 0.5) * 1.2;
    const value = parseFloat((baseTemp + variation + random).toFixed(1));
    
    readings.push({
      metric_id: demoMetric.id,
      timestamp,
      value,
    });
  }

  readings.push(
    {
      metric_id: demoMetric.id,
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      value: 28.5,
    },
    {
      metric_id: demoMetric.id,
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      value: 17.8,
    },
    {
      metric_id: demoMetric.id,
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      value: 36.2,
    }
  );

  for (const reading of readings) {
    await prisma.reading.create({
      data: reading,
    });
  }

  const users = [
    {
      username: 'admin',
      password_hash: 'admin_password',
      role: 'admin' as const,
    },
    { 
      username: 'user1', 
      password_hash: 'user1_password', 
      role: 'user' as const 
    },
    { 
      username: 'user2', 
      password_hash: 'user2_password', 
      role: 'user' as const 
    },
  ];

  const createdUsers = [];
  for (const user of users) {
    const created = await prisma.user.create({ data: user });
    createdUsers.push(created);
  }

  const devices = [
    {
      name: 'Smart Thermometer',
      description: 'Temperature sensor',
      location: 'Living Room',
      type: 'sensor',
      owner_id: createdUsers[1].id,
    },
    {
      name: 'Humidity Meter',
      description: 'Humidity sensor',
      location: 'Kitchen',
      type: 'sensor',
      owner_id: createdUsers[2].id,
    },
    {
      name: 'Light Switch',
      description: 'Smart light control',
      location: 'Bedroom',
      type: 'actuator',
      owner_id: createdUsers[0].id,
    },
  ];

  const createdDevices = [];
  for (const device of devices) {
    const created = await prisma.device.create({ data: device });
    createdDevices.push(created);
  }

  console.log('Database seeded successfully!');
  console.log('\nAvailable users:');
  console.log('1. demo / demo_password (user)');
  console.log('2. admin / admin_password (admin)');
  console.log('3. user1 / user1_password (user)');
  console.log('4. user2 / user2_password (user)');
  console.log('\nDemo device: Домашняя метеостанция (Temperature metric with 48 data points)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Error seeding database:', error);
    await prisma.$disconnect();
    process.exit(1);
  });