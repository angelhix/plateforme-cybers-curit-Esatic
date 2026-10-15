-- CreateEnum
CREATE TYPE "CourseStepType" AS ENUM ('ARTICLE', 'QUIZ', 'CHALLENGE');

-- CreateTable
CREATE TABLE "course_steps" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "type" "CourseStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL,
    "article_body" TEXT,
    "challenge_id" TEXT,

    CONSTRAINT "course_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_step_quiz_questions" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "correct_option_id" TEXT,

    CONSTRAINT "course_step_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_step_quiz_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "course_step_quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_step_progress" (
    "user_id" INTEGER NOT NULL,
    "step_id" TEXT NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "course_step_progress_pkey" PRIMARY KEY ("user_id","step_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_steps_challenge_id_key" ON "course_steps"("challenge_id");

-- CreateIndex
CREATE INDEX "course_steps_course_id_type_idx" ON "course_steps"("course_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "course_steps_course_id_sort_order_key" ON "course_steps"("course_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "course_step_quiz_questions_correct_option_id_key" ON "course_step_quiz_questions"("correct_option_id");

-- CreateIndex
CREATE INDEX "course_step_quiz_questions_step_id_idx" ON "course_step_quiz_questions"("step_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_step_quiz_questions_step_id_sort_order_key" ON "course_step_quiz_questions"("step_id", "sort_order");

-- CreateIndex
CREATE INDEX "course_step_quiz_options_question_id_idx" ON "course_step_quiz_options"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_step_quiz_options_question_id_sort_order_key" ON "course_step_quiz_options"("question_id", "sort_order");

-- CreateIndex
CREATE INDEX "course_step_progress_step_id_completed_at_idx" ON "course_step_progress"("step_id", "completed_at");

-- AddForeignKey
ALTER TABLE "course_steps" ADD CONSTRAINT "course_steps_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_steps" ADD CONSTRAINT "course_steps_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_step_quiz_questions" ADD CONSTRAINT "course_step_quiz_questions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "course_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_step_quiz_questions" ADD CONSTRAINT "course_step_quiz_questions_correct_option_id_fkey" FOREIGN KEY ("correct_option_id") REFERENCES "course_step_quiz_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_step_quiz_options" ADD CONSTRAINT "course_step_quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "course_step_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_step_progress" ADD CONSTRAINT "course_step_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_step_progress" ADD CONSTRAINT "course_step_progress_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "course_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
