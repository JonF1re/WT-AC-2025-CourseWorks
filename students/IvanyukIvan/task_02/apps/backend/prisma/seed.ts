import { prisma } from '../src/lib/prisma';
import { Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

async function main() {
	// Очистка данных в корректном порядке связей
	await prisma.refreshToken.deleteMany();
	await prisma.progressEntry.deleteMany();
	await prisma.goal.deleteMany();
	await prisma.topic.deleteMany();
	await prisma.user.deleteMany();

	// Пользователи
	const adminPassword = await hashPassword('Admin123!');
	const user1Password = await hashPassword('User123!');
	const user2Password = await hashPassword('User456!');

	const admin = await prisma.user.create({
		data: {
			username: 'admin',
			email: 'admin@example.com',
			passwordHash: adminPassword,
			role: Role.admin
		}
	});

	const ivan = await prisma.user.create({
		data: {
			username: 'ivan',
			email: 'ivan@example.com',
			passwordHash: user1Password,
			role: Role.user
		}
	});

	const maria = await prisma.user.create({
		data: {
			username: 'maria',
			email: 'maria@example.com',
			passwordHash: user2Password,
			role: Role.user
		}
	});

	// Темы
	const math = await prisma.topic.create({
		data: {
			name: 'Математика',
			description: 'Подготовка к сессии по математике'
		}
	});

	const physics = await prisma.topic.create({
		data: {
			name: 'Физика',
			description: 'Основы механики и электродинамики'
		}
	});

	// Цели
	const goalIvan = await prisma.goal.create({
		data: {
			topicId: math.id,
			userId: ivan.id,
			name: 'Решить 100 задач',
			description: 'Подготовка к экзамену: задачи 1-100',
			targetValue: 100,
			deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 дней
		}
	});

	const goalMaria = await prisma.goal.create({
		data: {
			topicId: physics.id,
			userId: maria.id,
			name: 'Пройти 10 тем',
			description: 'Видео + конспекты по 10 темам',
			targetValue: 10,
			deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // +20 дней
		}
	});

	// Прогресс
	await prisma.progressEntry.createMany({
		data: [
			{
				goalId: goalIvan.id,
				value: 10,
				comment: 'Решены задачи 1-10'
			},
			{
				goalId: goalIvan.id,
				value: 15,
				comment: 'Решены задачи 11-25'
			},
			{
				goalId: goalMaria.id,
				value: 3,
				comment: 'Пройдены темы 1-3'
			}
		]
	});

	console.log('Seed completed:', {
		admin: { email: admin.email, password: 'Admin123!' },
		user1: { email: ivan.email, password: 'User123!' },
		user2: { email: maria.email, password: 'User456!' }
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
