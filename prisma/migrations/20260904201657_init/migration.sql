-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PARENT', 'CHILD');

-- CreateEnum
CREATE TYPE "FamilyMode" AS ENUM ('INDIVIDUAL', 'COOPERATIVE', 'LEADERBOARD');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('ONCE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'NORMAL', 'HARD', 'EPIC');

-- CreateEnum
CREATE TYPE "RolloverPolicy" AS ENUM ('EXPIRE', 'ROLLOVER', 'PERSIST');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('PARENT', 'AUTO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstanceEventType" AS ENUM ('CREATED', 'SUBMITTED', 'UNSUBMITTED', 'APPROVED', 'RETRY_REQUESTED', 'MISSED', 'ROLLED_OVER', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TASK_APPROVED', 'TASK_REVERSAL', 'BONUS_FIRST_MISSION', 'BONUS_PERFECT_DAY', 'BONUS_STREAK_MILESTONE', 'ACHIEVEMENT', 'CHALLENGE_REWARD', 'REWARD_REDEMPTION', 'REWARD_REFUND', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('STREAK', 'GOLDEN', 'POINTS', 'MISSIONS', 'CATEGORY', 'LEVEL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "CosmeticSlot" AS ENUM ('BASE', 'SKIN', 'HAIR', 'OUTFIT', 'ACCESSORY', 'BACKGROUND', 'FRAME');

-- CreateEnum
CREATE TYPE "UnlockType" AS ENUM ('DEFAULT', 'LEVEL', 'ACHIEVEMENT', 'CHEST', 'PARENT_GRANT');

-- CreateEnum
CREATE TYPE "CelebrationType" AS ENUM ('MISSION_APPROVED', 'FIRST_MISSION_BONUS', 'PERFECT_DAY', 'LEVEL_UP', 'ACHIEVEMENT', 'STREAK_MILESTONE', 'GOLDEN_STREAK', 'REWARD_APPROVED', 'CHEST');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'FULFILLED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_SUBMITTED', 'TASK_APPROVED', 'TASK_RETRY', 'REMINDER', 'STREAK_AT_RISK', 'LEVEL_UP', 'ACHIEVEMENT_UNLOCKED', 'REWARD_REQUESTED', 'REWARD_DECIDED', 'DAILY_SUMMARY', 'WEEKLY_RECAP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED');

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "mode" "FamilyMode" NOT NULL DEFAULT 'COOPERATIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "lastClosedDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "email" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvite" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "birthYear" INTEGER,
    "avatar" JSONB NOT NULL DEFAULT '{}',
    "themeKey" TEXT NOT NULL DEFAULT 'sunrise',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "familyId" TEXT,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "categoryId" TEXT,
    "points" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'NORMAL',
    "timeOfDay" "TimeOfDay" NOT NULL DEFAULT 'ANYTIME',
    "scheduleType" "ScheduleType" NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "dueTime" TEXT,
    "rolloverPolicy" "RolloverPolicy" NOT NULL DEFAULT 'EXPIRE',
    "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'PARENT',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskInstance" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "originDate" TEXT,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "categoryId" TEXT,
    "timeOfDay" "TimeOfDay" NOT NULL,
    "approvalMode" "ApprovalMode" NOT NULL,
    "rolloverPolicy" "RolloverPolicy" NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "dueTime" TEXT,
    "status" "InstanceStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastNote" TEXT,
    "childNote" TEXT,
    "rolledOverToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskInstanceEvent" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" "InstanceEventType" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskInstanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "xpAmount" INTEGER NOT NULL DEFAULT 0,
    "localDate" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "instanceId" TEXT,
    "achievementId" TEXT,
    "redemptionId" TEXT,
    "challengeId" TEXT,
    "reversesId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProgress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "missedCount" INTEGER NOT NULL DEFAULT 0,
    "optionalDone" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "isCounted" BOOLEAN NOT NULL DEFAULT false,
    "hasActivity" BOOLEAN NOT NULL DEFAULT false,
    "isGolden" BOOLEAN NOT NULL DEFAULT false,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildStats" (
    "childId" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "currentGoldenStreak" INTEGER NOT NULL DEFAULT 0,
    "longestGoldenStreak" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalGoldenDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "streakLastCountedDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildStats_pkey" PRIMARY KEY ("childId")
);

-- CreateTable
CREATE TABLE "DayOff" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "xpRequired" INTEGER NOT NULL,
    "worldKey" TEXT NOT NULL,
    "unlocks" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Level_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "criteria" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "pointsReward" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildAchievement" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "ChildAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slot" "CosmeticSlot" NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "unlockType" "UnlockType" NOT NULL DEFAULT 'DEFAULT',
    "unlockLevel" INTEGER,
    "unlockAchievementKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CosmeticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildCosmetic" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "ChildCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Celebration" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "CelebrationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Celebration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '🎁',
    "costPoints" INTEGER NOT NULL,
    "stock" INTEGER,
    "childIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyChallenge" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '🏁',
    "targetPoints" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "rewardTitle" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Family_code_key" ON "Family"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_familyId_role_idx" ON "User"("familyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_familyId_username_key" ON "User"("familyId", "username");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInvite_tokenHash_key" ON "FamilyInvite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "Parent_familyId_idx" ON "Parent"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Child_userId_key" ON "Child"("userId");

-- CreateIndex
CREATE INDEX "Child_familyId_idx" ON "Child"("familyId");

-- CreateIndex
CREATE INDEX "Category_familyId_idx" ON "Category"("familyId");

-- CreateIndex
CREATE INDEX "Task_familyId_status_idx" ON "Task"("familyId", "status");

-- CreateIndex
CREATE INDEX "TaskAssignment_childId_idx" ON "TaskAssignment"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignment_taskId_childId_key" ON "TaskAssignment"("taskId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskInstance_rolledOverToId_key" ON "TaskInstance"("rolledOverToId");

-- CreateIndex
CREATE INDEX "TaskInstance_childId_localDate_idx" ON "TaskInstance"("childId", "localDate");

-- CreateIndex
CREATE INDEX "TaskInstance_familyId_status_idx" ON "TaskInstance"("familyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaskInstance_taskId_childId_localDate_key" ON "TaskInstance"("taskId", "childId", "localDate");

-- CreateIndex
CREATE INDEX "TaskInstanceEvent_instanceId_idx" ON "TaskInstanceEvent"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_dedupeKey_key" ON "PointTransaction"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_reversesId_key" ON "PointTransaction"("reversesId");

-- CreateIndex
CREATE INDEX "PointTransaction_childId_localDate_idx" ON "PointTransaction"("childId", "localDate");

-- CreateIndex
CREATE INDEX "PointTransaction_childId_createdAt_idx" ON "PointTransaction"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_instanceId_idx" ON "PointTransaction"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProgress_childId_localDate_key" ON "DailyProgress"("childId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "DayOff_childId_localDate_key" ON "DayOff"("childId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ChildAchievement_childId_achievementId_key" ON "ChildAchievement"("childId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticItem_key_key" ON "CosmeticItem"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ChildCosmetic_childId_itemId_key" ON "ChildCosmetic"("childId", "itemId");

-- CreateIndex
CREATE INDEX "Celebration_childId_seenAt_idx" ON "Celebration"("childId", "seenAt");

-- CreateIndex
CREATE INDEX "Reward_familyId_idx" ON "Reward"("familyId");

-- CreateIndex
CREATE INDEX "RewardRedemption_childId_idx" ON "RewardRedemption"("childId");

-- CreateIndex
CREATE INDEX "FamilyChallenge_familyId_status_idx" ON "FamilyChallenge"("familyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "Reminder_status_scheduledFor_idx" ON "Reminder"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_rolledOverToId_fkey" FOREIGN KEY ("rolledOverToId") REFERENCES "TaskInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstanceEvent" ADD CONSTRAINT "TaskInstanceEvent_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "TaskInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "TaskInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "RewardRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProgress" ADD CONSTRAINT "DailyProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildStats" ADD CONSTRAINT "ChildStats_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildStats" ADD CONSTRAINT "ChildStats_level_fkey" FOREIGN KEY ("level") REFERENCES "Level"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayOff" ADD CONSTRAINT "DayOff_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAchievement" ADD CONSTRAINT "ChildAchievement_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildAchievement" ADD CONSTRAINT "ChildAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildCosmetic" ADD CONSTRAINT "ChildCosmetic_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildCosmetic" ADD CONSTRAINT "ChildCosmetic_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CosmeticItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Celebration" ADD CONSTRAINT "Celebration_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyChallenge" ADD CONSTRAINT "FamilyChallenge_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
