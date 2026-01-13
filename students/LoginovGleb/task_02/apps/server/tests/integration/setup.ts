import { beforeAll, beforeEach, afterAll } from "vitest";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/prisma.js";
import { buildApp } from "../../src/app.js";
import { Role } from "@prisma/client";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", "..", ".env.test");
loadEnv({ path: envPath });

export const TEST_PASSWORDS = {
  admin: "Admin123!",
  user: "User123!",
  userTwo: "User456!"
};

let baseData: {
  admin: { id: string; email: string };
  user: { id: string; email: string };
  statuses: Record<string, { id: string }>;
  form: { id: string };
};

export const resetDatabase = async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.application.deleteMany();
  await prisma.form.deleteMany();
  await prisma.user.deleteMany();
  await prisma.status.deleteMany();
};

const ensureBaseStatuses = async () => {
  const names = ["draft", "pending", "approved", "rejected", "withdrawn"] as const;
  const created = await Promise.all(
    names.map((name, idx) =>
      prisma.status.create({
        data: {
          name,
          description: `${name} status`,
          order: idx + 1,
          isFinal: name === "approved" || name === "rejected" || name === "withdrawn"
        }
      })
    )
  );
  return Object.fromEntries(created.map((s) => [s.name, { id: s.id }]));
};

const seedUsersAndForm = async (statuses: Record<string, { id: string }>) => {
  const [adminHash, userHash, userTwoHash] = await Promise.all([
    bcrypt.hash(TEST_PASSWORDS.admin, 4),
    bcrypt.hash(TEST_PASSWORDS.user, 4),
    bcrypt.hash(TEST_PASSWORDS.userTwo, 4)
  ]);

  const admin = await prisma.user.create({
    data: {
      email: "admin@test.local",
      username: "admin",
      passwordHash: adminHash,
      role: Role.admin
    }
  });

  const user = await prisma.user.create({
    data: {
      email: "user@test.local",
      username: "user",
      passwordHash: userHash,
      role: Role.user
    }
  });

  await prisma.user.create({
    data: {
      email: "user2@test.local",
      username: "user2",
      passwordHash: userTwoHash,
      role: Role.user
    }
  });

  const form = await prisma.form.create({
    data: {
      name: "Test Form",
      description: "For integration tests",
      fields: [{ name: "field", label: "Field", type: "text", required: true }],
      isActive: true,
      createdById: admin.id
    }
  });

  return { admin, user, form };
};

export const reseed = async () => {
  const statuses = await ensureBaseStatuses();
  const { admin, user, form } = await seedUsersAndForm(statuses);
  baseData = {
    admin: { id: admin.id, email: admin.email },
    user: { id: user.id, email: user.email },
    statuses,
    form: { id: form.id }
  };
  return baseData;
};

export const getBaseData = () => baseData;

export const createTestApp = () => buildApp();

beforeAll(async () => {
  // Ensure env is loaded and database connection works
  await prisma.$queryRaw`SELECT 1`;
});

beforeEach(async () => {
  await resetDatabase();
  await reseed();
});

afterAll(async () => {
  await prisma.$disconnect();
});
