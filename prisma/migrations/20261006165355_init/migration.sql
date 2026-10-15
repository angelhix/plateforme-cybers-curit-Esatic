-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourseDocumentKind" AS ENUM ('PREPARATORY', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "CourseDocumentFormat" AS ENUM ('PDF', 'HTML');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "handle" VARCHAR(20) NOT NULL,
    "initials" VARCHAR(2) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "token_hash" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "categories" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category_code" VARCHAR(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_documents" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "kind" "CourseDocumentKind" NOT NULL,
    "format" "CourseDocumentFormat" NOT NULL,
    "title" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "course_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category_code" VARCHAR(3) NOT NULL,
    "level" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "cmd" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "flag_hash" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "course_id" TEXT,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solves" (
    "user_id" INTEGER NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "solved_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "solves_pkey" PRIMARY KEY ("user_id","challenge_id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "courses_category_code_level_idx" ON "courses"("category_code", "level");

-- CreateIndex
CREATE UNIQUE INDEX "courses_level_position_key" ON "courses"("level", "position");

-- CreateIndex
CREATE INDEX "course_documents_course_id_sort_order_idx" ON "course_documents"("course_id", "sort_order");

-- CreateIndex
CREATE INDEX "challenges_published_level_category_code_idx" ON "challenges"("published", "level", "category_code");

-- CreateIndex
CREATE INDEX "challenges_course_id_idx" ON "challenges"("course_id");

-- CreateIndex
CREATE INDEX "solves_challenge_id_solved_at_idx" ON "solves"("challenge_id", "solved_at");

-- CreateIndex
CREATE INDEX "attempts_user_id_created_at_idx" ON "attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "attempts_challenge_id_created_at_idx" ON "attempts"("challenge_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_documents" ADD CONSTRAINT "course_documents_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solves" ADD CONSTRAINT "solves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solves" ADD CONSTRAINT "solves_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
