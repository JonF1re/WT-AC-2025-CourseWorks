import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Очистка существующих данных
  await prisma.like.deleteMany();
  await prisma.report.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Old data cleared');

  // =====================
  // USERS (Админ + 3 пользователя)
  // =====================

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@twitter.com',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

  const alice = await prisma.user.create({
    data: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: userPassword,
      role: 'user',
    },
  });

  const bob = await prisma.user.create({
    data: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: userPassword,
      role: 'user',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: userPassword,
      role: 'user',
    },
  });

  console.log('✅ Users created (admin, alice, bob, charlie)');
  console.log('   🔑 Passwords: admin123 / user123');

  // =====================
  // POSTS
  // =====================

  const posts = await Promise.all([
    prisma.post.create({
      data: {
        text: 'Привет! Я администратор этого микро-твиттера 👋',
        authorId: admin.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Первый пост от Alice! Мысли вслух работают? 🤔',
        authorId: alice.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Bob здесь! Отличная платформа для коротких мыслей 💭',
        authorId: bob.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Charlie пишет: TypeScript + NestJS = ❤️',
        authorId: charlie.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Только что попробовал Prisma ORM. Впечатляет! 🚀',
        authorId: alice.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Кто-нибудь использует React Query? Очень удобная штука!',
        authorId: bob.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Zustand для state management - минимализм и эффективность 🎯',
        authorId: charlie.id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Напоминаю: будьте вежливы в комментариях 🙏',
        authorId: admin.id,
      },
    }),
  ]);

  console.log(`✅ ${posts.length} posts created`);

  // =====================
  // REPLIES (это тоже Post, но с replyToPostId)
  // =====================

  const replies = await Promise.all([
    prisma.post.create({
      data: {
        text: 'Спасибо за создание платформы! 🙌',
        authorId: alice.id,
        replyToPostId: posts[0].id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Согласен, Prisma действительно удобная!',
        authorId: bob.id,
        replyToPostId: posts[4].id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Да, использую! Отлично работает с SSR 🔥',
        authorId: charlie.id,
        replyToPostId: posts[5].id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Поддерживаю! Zustand намного проще Redux',
        authorId: alice.id,
        replyToPostId: posts[6].id,
      },
    }),
    prisma.post.create({
      data: {
        text: 'Обязательно буду! 👍',
        authorId: bob.id,
        replyToPostId: posts[7].id,
      },
    }),
  ]);

  console.log(`✅ ${replies.length} replies created`);

  // =====================
  // FOLLOWS (Подписки)
  // =====================

  const follows = await Promise.all([
    // Alice подписывается на всех
    prisma.follow.create({
      data: { followerId: alice.id, targetId: admin.id },
    }),
    prisma.follow.create({
      data: { followerId: alice.id, targetId: bob.id },
    }),
    prisma.follow.create({
      data: { followerId: alice.id, targetId: charlie.id },
    }),
    
    // Bob подписывается на Alice и Charlie
    prisma.follow.create({
      data: { followerId: bob.id, targetId: alice.id },
    }),
    prisma.follow.create({
      data: { followerId: bob.id, targetId: charlie.id },
    }),
    
    // Charlie подписывается на Alice и Admin
    prisma.follow.create({
      data: { followerId: charlie.id, targetId: alice.id },
    }),
    prisma.follow.create({
      data: { followerId: charlie.id, targetId: admin.id },
    }),
    
    // Admin подписывается на всех
    prisma.follow.create({
      data: { followerId: admin.id, targetId: alice.id },
    }),
    prisma.follow.create({
      data: { followerId: admin.id, targetId: bob.id },
    }),
  ]);

  console.log(`✅ ${follows.length} follows created`);

  // =====================
  // LIKES (Лайки)
  // =====================

  const likes = await Promise.all([
    prisma.like.create({ data: { userId: alice.id, postId: posts[0].id } }),
    prisma.like.create({ data: { userId: alice.id, postId: posts[2].id } }),
    prisma.like.create({ data: { userId: bob.id, postId: posts[1].id } }),
    prisma.like.create({ data: { userId: bob.id, postId: posts[4].id } }),
    prisma.like.create({ data: { userId: charlie.id, postId: posts[3].id } }),
    prisma.like.create({ data: { userId: charlie.id, postId: posts[5].id } }),
    prisma.like.create({ data: { userId: admin.id, postId: posts[6].id } }),
  ]);

  console.log(`✅ ${likes.length} likes created`);

  // =====================
  // REPORTS (Жалобы)
  // =====================

  const reports = await Promise.all([
    prisma.report.create({
      data: {
        reason: 'Спам или нежелательный контент',
        status: 'open',
        reportedBy: bob.id,
        postId: posts[4].id,
      },
    }),
    prisma.report.create({
      data: {
        reason: 'Проверка системы жалоб',
        status: 'reviewed',
        reportedBy: charlie.id,
        postId: posts[2].id,
      },
    }),
  ]);

  console.log(`✅ ${reports.length} reports created`);

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('📝 Test accounts:');
  console.log('   Admin: admin / admin123');
  console.log('   Users: alice, bob, charlie / user123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

