import { PrismaClient, Role, Difficulty, ResourceType } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  // clean tables in safe order
  await prisma.refreshToken.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.step.deleteMany();
  await prisma.roadmap.deleteMany();
  await prisma.user.deleteMany();

  const [adminPassword, userPassword, user2Password] = await Promise.all([
    hashPassword('Admin123!'),
    hashPassword('User123!'),
    hashPassword('User234!')
  ]);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: Role.admin
    }
  });

  const user = await prisma.user.create({
    data: {
      username: 'jane',
      email: 'jane@example.com',
      passwordHash: userPassword,
      role: Role.user
    }
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'john',
      email: 'john@example.com',
      passwordHash: user2Password,
      role: Role.user
    }
  });

  const roadmap = await prisma.roadmap.create({
    data: {
      title: 'Frontend junior roadmap',
      description: 'HTML/CSS/JS basics leading to first PRs.',
      category: 'Frontend',
      difficulty: Difficulty.beginner,
      isPublished: true
    }
  });

  const stepBasics = await prisma.step.create({
    data: {
      roadmapId: roadmap.id,
      title: 'HTML & CSS fundamentals',
      description: 'Tags, semantic layout, flex/grid.',
      order: 1
    }
  });

  const stepJs = await prisma.step.create({
    data: {
      roadmapId: roadmap.id,
      title: 'JavaScript essentials',
      description: 'Types, functions, DOM, fetch.',
      order: 2
    }
  });

  await prisma.resource.createMany({
    data: [
      {
        stepId: stepBasics.id,
        title: 'MDN HTML guide',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
        type: ResourceType.article
      },
      {
        stepId: stepBasics.id,
        title: 'CSS Flexbox cheatsheet',
        url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
        type: ResourceType.article
      },
      {
        stepId: stepJs.id,
        title: 'JavaScript MDN basics',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
        type: ResourceType.article
      },
      {
        stepId: stepJs.id,
        title: 'Fetch API intro',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
        type: ResourceType.article
      }
    ]
  });

  await prisma.progress.create({
    data: {
      userId: user.id,
      stepId: stepBasics.id,
      completed: true,
      completedAt: new Date()
    }
  });

  console.log('Seed completed', {
    admin: { username: admin.username, password: 'Admin123!' },
    user: { username: user.username, password: 'User123!' },
    user2: { username: user2.username, password: 'User234!' },
    roadmap: roadmap.title
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
