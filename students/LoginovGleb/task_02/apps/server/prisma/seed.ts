import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const ids = {
  admin: "00000000-0000-0000-0000-000000000001",
  moderator: "00000000-0000-0000-0000-000000000002",
  user: "00000000-0000-0000-0000-000000000003",
  extraUser: "00000000-0000-0000-0000-000000000004",
  extraUser2: "00000000-0000-0000-0000-000000000005",
  extraUser3: "00000000-0000-0000-0000-000000000006",
  formMain: "10000000-0000-0000-0000-000000000001",
  formFeedback: "10000000-0000-0000-0000-000000000002",
  appDraft: "20000000-0000-0000-0000-000000000001",
  appPending: "20000000-0000-0000-0000-000000000002",
  appApproved: "20000000-0000-0000-0000-000000000003",
  appRejected: "20000000-0000-0000-0000-000000000004",
  appWithdrawn: "20000000-0000-0000-0000-000000000005",
  attachmentProof: "30000000-0000-0000-0000-000000000001",
  statusDraft: "40000000-0000-0000-0000-000000000001",
  statusPending: "40000000-0000-0000-0000-000000000002",
  statusApproved: "40000000-0000-0000-0000-000000000003",
  statusRejected: "40000000-0000-0000-0000-000000000004",
  statusWithdrawn: "40000000-0000-0000-0000-000000000005"
};

const statusSeeds = [
  { id: ids.statusDraft, name: "draft", description: "Черновик, созданный пользователем", color: "#9CA3AF", order: 1, isFinal: false },
  { id: ids.statusPending, name: "pending", description: "Отправлена и ожидает рассмотрения", color: "#3B82F6", order: 2, isFinal: false },
  { id: ids.statusApproved, name: "approved", description: "Одобрена модератором/админом", color: "#10B981", order: 3, isFinal: true },
  { id: ids.statusRejected, name: "rejected", description: "Отклонена модератором/админом", color: "#EF4444", order: 4, isFinal: true },
  { id: ids.statusWithdrawn, name: "withdrawn", description: "Отозвана заявителем", color: "#F59E0B", order: 5, isFinal: true }
];

const hashPassword = (password: string) => bcrypt.hash(password, 10);

const seedUsers = async () => {
  const [adminHash, moderatorHash, userHash, extraUserHash, extraUser2Hash, extraUser3Hash] = await Promise.all([
    hashPassword("admin123!"),
    hashPassword("moderator123!"),
    hashPassword("user123!"),
    hashPassword("demo123!"),
    hashPassword("student123!"),
    hashPassword("author123!")
  ]);

  const admin = await prisma.user.create({
    data: {
      id: ids.admin,
      username: "админ",
      email: "admin@example.com",
      passwordHash: adminHash,
      role: Role.admin
    }
  });

  const moderator = await prisma.user.create({
    data: {
      id: ids.moderator,
      username: "модератор",
      email: "moderator@example.com",
      passwordHash: moderatorHash,
      role: Role.moderator
    }
  });

  const user = await prisma.user.create({
    data: {
      id: ids.user,
      username: "пользователь",
      email: "user@example.com",
      passwordHash: userHash,
      role: Role.user
    }
  });

  const extraUser = await prisma.user.create({
    data: {
      id: ids.extraUser,
      username: "демо",
      email: "demo@example.com",
      passwordHash: extraUserHash,
      role: Role.user
    }
  });

  const extraUser2 = await prisma.user.create({
    data: {
      id: ids.extraUser2,
      username: "анна.данные",
      email: "analytics@example.com",
      passwordHash: extraUser2Hash,
      role: Role.user
    }
  });

  const extraUser3 = await prisma.user.create({
    data: {
      id: ids.extraUser3,
      username: "иван.контент",
      email: "content@example.com",
      passwordHash: extraUser3Hash,
      role: Role.user
    }
  });

  return { admin, moderator, user, extraUser, extraUser2, extraUser3 };
};

const seedStatuses = async () => {
  const statuses = await Promise.all(
    statusSeeds.map((s) =>
      prisma.status.upsert({
        where: { name: s.name },
        update: {
          description: s.description,
          color: s.color,
          order: s.order,
          isFinal: s.isFinal
        },
        create: s
      })
    )
  );
  return Object.fromEntries(statuses.map((status) => [status.name, status]));
};

const seedForms = async (adminId: string, _moderatorId: string) => {
  const mainForm = await prisma.form.create({
    data: {
      id: ids.formMain,
      name: "Участие в событии",
      description: "Базовая форма для подачи заявки «Да, я в деле»",
      fields: [
        { name: "fullName", label: "ФИО", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Телефон", type: "text", required: false, placeholder: "+7 (999) 123-45-67" },
        { name: "city", label: "Город", type: "text", required: false },
        { name: "motivation", label: "Мотивация участия", type: "textarea", required: true },
        { name: "experience", label: "Опыт участия или роль", type: "text", required: false },
        { name: "format", label: "Формат участия", type: "select", options: ["Онлайн", "Офлайн", "Гибрид"], required: true }
      ],
      isActive: true,
      createdById: adminId
    }
  });

  const feedbackForm = await prisma.form.create({
    data: {
      id: ids.formFeedback,
      name: "Обратная связь после события",
      description: "Внутренняя форма для сбора отзывов после мероприятия",
      fields: [
        { name: "rating", label: "Оценка (1-5)", type: "number", required: true },
        { name: "comment", label: "Комментарий", type: "textarea", required: false }
      ],
      isActive: false,
      // В бэке формы может создавать только admin (forms.router.ts)
      createdById: adminId
    }
  });

  return { mainForm, feedbackForm };
};

const createDraftApplication = async (
  userId: string,
  formId: string,
  statusId: string
) => {
  const app = await prisma.application.create({
    data: {
      id: ids.appDraft,
      formId,
      userId,
      statusId,
      data: {
        fullName: "Черновик — Мария Смирнова",
        email: "maria.draft@example.com",
        city: "Тверь",
        motivation: "Планирую присоединиться к оргкоманде и хочу уточнить детали.",
        experience: "Помогала на локальных ивентах",
        phone: "+7 (910) 555-44-22",
        format: "Гибрид"
      },
      comment: "Черновик, можно редактировать"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: null,
      toStatusId: statusId,
      changedById: userId,
      comment: "создан черновик"
    }
  });

  return app;
};

const createPendingApplication = async (
  userId: string,
  formId: string,
  draftStatusId: string,
  pendingStatusId: string
) => {
  const app = await prisma.application.create({
    data: {
      id: ids.appPending,
      formId,
      userId,
      statusId: draftStatusId,
      data: {
        fullName: "В ожидании — Алексей Новиков",
        email: "alex.pending@example.com",
        city: "Казань",
        motivation: "Хочу стать наставником по продуктовой аналитике.",
        experience: "2 хакатона, менторство студентов",
        phone: "+7 (843) 500-10-10",
        format: "Офлайн"
      },
      comment: "Отправлена на проверку"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: null,
      toStatusId: draftStatusId,
      changedById: userId,
      comment: "создан черновик"
    }
  });

  const submitted = await prisma.application.update({
    where: { id: app.id },
    data: { statusId: pendingStatusId, submittedAt: new Date() }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: draftStatusId,
      toStatusId: pendingStatusId,
      changedById: userId,
      comment: "отправлена"
    }
  });

  return submitted;
};

const createApprovedApplication = async (
  userId: string,
  moderatorId: string,
  formId: string,
  draftStatusId: string,
  pendingStatusId: string,
  approvedStatusId: string
) => {
  const app = await prisma.application.create({
    data: {
      id: ids.appApproved,
      formId,
      userId,
      statusId: draftStatusId,
      data: {
        fullName: "Одобрена — Светлана Петрова",
        email: "svetlana.approved@example.com",
        city: "Новосибирск",
        motivation: "Могу вести блок по коммуникациям и PR.",
        experience: "5 крупных событий, пресс-релизы",
        phone: "+7 (383) 200-19-99",
        format: "Онлайн"
      },
      comment: "Ожидает решения"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: null,
      toStatusId: draftStatusId,
      changedById: userId,
      comment: "создан черновик"
    }
  });

  // В бэке пользователь может добавлять вложения только к draft-заявкам
  await prisma.attachment.create({
    data: {
      id: ids.attachmentProof,
      applicationId: app.id,
      filename: "резюме-портфолио.pdf",
      filePath: `uploads/${app.id}/seed-резюме-портфолио.pdf`,
      fileSize: 24576,
      mimeType: "application/pdf",
      uploadedById: userId
    }
  });

  const submitted = await prisma.application.update({
    where: { id: app.id },
    data: { statusId: pendingStatusId, submittedAt: new Date() }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: draftStatusId,
      toStatusId: pendingStatusId,
      changedById: userId,
      comment: "отправлена"
    }
  });

  const approved = await prisma.application.update({
    where: { id: app.id },
    data: { statusId: approvedStatusId }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: pendingStatusId,
      toStatusId: approvedStatusId,
      changedById: moderatorId,
      comment: "одобрена"
    }
  });

  return approved;
};

const createRejectedApplication = async (
  userId: string,
  moderatorId: string,
  formId: string,
  draftStatusId: string,
  pendingStatusId: string,
  rejectedStatusId: string
) => {
  const app = await prisma.application.create({
    data: {
      id: ids.appRejected,
      formId,
      userId,
      statusId: draftStatusId,
      data: {
        fullName: "Даниил Орлов",
        email: "dan.orlov@example.com",
        city: "Ростов-на-Дону",
        motivation: "Хочу попробовать себя в координации волонтёров.",
        experience: "1 городской фестиваль",
        phone: "+7 (863) 320-10-77",
        format: "Офлайн"
      },
      comment: "Заявка на волонтёрство"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: null,
      toStatusId: draftStatusId,
      changedById: userId,
      comment: "создан черновик"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: draftStatusId,
      toStatusId: pendingStatusId,
      changedById: userId,
      comment: "отправлена на проверку"
    }
  });

  await prisma.application.update({
    where: { id: app.id },
    data: { statusId: pendingStatusId, submittedAt: new Date() }
  });

  const rejected = await prisma.application.update({
    where: { id: app.id },
    data: { statusId: rejectedStatusId }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: pendingStatusId,
      toStatusId: rejectedStatusId,
      changedById: moderatorId,
      comment: "отклонена (не хватает опыта)"
    }
  });

  return rejected;
};

const createWithdrawnApplication = async (
  userId: string,
  formId: string,
  draftStatusId: string,
  pendingStatusId: string,
  withdrawnStatusId: string
) => {
  const app = await prisma.application.create({
    data: {
      id: ids.appWithdrawn,
      formId,
      userId,
      statusId: draftStatusId,
      data: {
        fullName: "Отозвана — Полина Ким",
        email: "polina.kim@example.com",
        city: "Екатеринбург",
        motivation: "Хотела быть редактором контента.",
        experience: "4 года коммерческого копирайтинга",
        phone: "+7 (343) 300-55-88",
        format: "Гибрид"
      },
      comment: "Передумала по времени"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: null,
      toStatusId: draftStatusId,
      changedById: userId,
      comment: "создан черновик"
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: draftStatusId,
      toStatusId: pendingStatusId,
      changedById: userId,
      comment: "отправлена на проверку"
    }
  });

  await prisma.application.update({
    where: { id: app.id },
    data: { statusId: pendingStatusId, submittedAt: new Date() }
  });

  const withdrawn = await prisma.application.update({
    where: { id: app.id },
    data: { statusId: withdrawnStatusId }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: pendingStatusId,
      toStatusId: withdrawnStatusId,
      changedById: userId,
      comment: "отозвана пользователем"
    }
  });

  return withdrawn;
};

async function main() {
  console.log("Clearing existing data...");
  await prisma.$transaction([
    prisma.statusHistory.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.application.deleteMany(),
    prisma.form.deleteMany(),
    prisma.status.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany()
  ]);

  console.log("Seeding users...");
  const { admin, moderator, user, extraUser, extraUser2, extraUser3 } = await seedUsers();

  console.log("Seeding statuses...");
  const statusMap = await seedStatuses();

  console.log("Seeding forms...");
  const { mainForm } = await seedForms(admin.id, moderator.id);

  console.log("Seeding applications...");
  await createDraftApplication(user.id, mainForm.id, statusMap.draft.id);
  await createPendingApplication(extraUser.id, mainForm.id, statusMap.draft.id, statusMap.pending.id);
  await createApprovedApplication(user.id, moderator.id, mainForm.id, statusMap.draft.id, statusMap.pending.id, statusMap.approved.id);
  await createRejectedApplication(extraUser2.id, moderator.id, mainForm.id, statusMap.draft.id, statusMap.pending.id, statusMap.rejected.id);
  await createWithdrawnApplication(extraUser3.id, mainForm.id, statusMap.draft.id, statusMap.pending.id, statusMap.withdrawn.id);

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
