const { PrismaClient, Role, MealType } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ---------------------
  // CLEAN UP
  // ---------------------
  await prisma.shoppingItem.deleteMany()
  await prisma.mealPlan.deleteMany()
  await prisma.recipeIngredient.deleteMany()
  await prisma.recipeTag.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.user.deleteMany()

  // ---------------------
  // USERS
  // ---------------------
  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      role: Role.admin
    }
  })

  const user = await prisma.user.create({
    data: {
      username: 'user',
      email: 'user@example.com',
      passwordHash,
      role: Role.user
    }
  })

  // ---------------------
  // INGREDIENTS
  // ---------------------
  const eggs = await prisma.ingredient.create({
    data: { name: 'Яйца', unit: 'шт', calories: 155, isAllergen: true }
  })

  const milk = await prisma.ingredient.create({
    data: { name: 'Молоко', unit: 'мл', calories: 42, isAllergen: true }
  })

  const cheese = await prisma.ingredient.create({
    data: { name: 'Сыр', unit: 'г', calories: 350, isAllergen: true }
  })

  const tomato = await prisma.ingredient.create({
    data: { name: 'Томаты', unit: 'г', calories: 18, isAllergen: false }
  })

  // ---------------------
  // TAGS
  // ---------------------
  const vegetarian = await prisma.tag.create({
    data: { name: 'Вегетарианское', type: 'diet' }
  })

  const breakfast = await prisma.tag.create({
    data: { name: 'Завтрак', type: 'meal_type' }
  })

  const dinner = await prisma.tag.create({
    data: { name: 'Ужин', type: 'meal_type' }
  })

  // ---------------------
  // RECIPES
  // ---------------------
  const omelet = await prisma.recipe.create({
    data: {
      title: 'Омлет с сыром',
      description: 'Простой и быстрый завтрак',
      instructions:
        '1. Взбить яйца.\n2. Добавить молоко.\n3. Добавить сыр.\n4. Обжарить.',
      prepTime: 10,
      servings: 1,
      authorId: user.id,
      ingredients: {
        create: [
          { ingredientId: eggs.id, amount: 2, unit: 'шт' },
          { ingredientId: milk.id, amount: 50, unit: 'мл' },
          { ingredientId: cheese.id, amount: 30, unit: 'г' }
        ]
      },
      tags: {
        create: [
          { tagId: vegetarian.id },
          { tagId: breakfast.id }
        ]
      }
    }
  })

  const tomatoSalad = await prisma.recipe.create({
    data: {
      title: 'Салат из томатов',
      description: 'Лёгкий ужин',
      instructions:
        '1. Нарезать томаты.\n2. Посолить.\n3. Заправить по вкусу.',
      prepTime: 5,
      servings: 1,
      authorId: user.id,
      ingredients: {
        create: [
          { ingredientId: tomato.id, amount: 200, unit: 'г' }
        ]
      },
      tags: {
        create: [
          { tagId: vegetarian.id },
          { tagId: dinner.id }
        ]
      }
    }
  })

  // ---------------------
  // MEAL PLAN
  // ---------------------
  await prisma.mealPlan.createMany({
    data: [
      {
        userId: user.id,
        recipeId: omelet.id,
        date: new Date(),
        mealType: MealType.breakfast
      },
      {
        userId: user.id,
        recipeId: tomatoSalad.id,
        date: new Date(),
        mealType: MealType.dinner
      }
    ]
  })

  // ---------------------
  // SHOPPING
  // ---------------------
  await prisma.shoppingItem.createMany({
    data: [
      { userId: user.id, ingredientId: eggs.id, amount: 4 },
      { userId: user.id, ingredientId: tomato.id, amount: 200 },
      { userId: user.id, customName: 'Соль', amount: 1 }
    ]
  })

  console.log('✅ Seeding finished')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
