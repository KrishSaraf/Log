import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { cadenceEnum, hub, questionTypeEnum } from "./_shared";

export type QuestionConfig = {
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  choices?: { value: string; label: string }[];
  multiple?: boolean;
  unit?: string;
  placeholder?: string;
  hint?: string;
};

export const questions = hub.table(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: questionTypeEnum("type").notNull(),
    config: jsonb("config").$type<QuestionConfig>().notNull().default({}),
    cadence: cadenceEnum("cadence").notNull().default("daily"),
    isActive: boolean("is_active").notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("questions_user_key_uq").on(t.userId, t.key),
    index("questions_user_active_order_idx").on(t.userId, t.isActive, t.orderIndex),
  ],
);

export const questionResponses = hub.table(
  "question_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    valueNumeric: numeric("value_numeric", { precision: 12, scale: 4 }),
    valueBool: boolean("value_bool"),
    valueText: text("value_text"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("question_responses_user_question_day_uq").on(
      t.userId,
      t.questionId,
      t.date,
    ),
    index("question_responses_user_date_idx").on(t.userId, t.date),
  ],
);

export const questionsRelations = relations(questions, ({ many, one }) => ({
  responses: many(questionResponses),
  user: one(users, { fields: [questions.userId], references: [users.id] }),
}));

export const questionResponsesRelations = relations(
  questionResponses,
  ({ one }) => ({
    question: one(questions, {
      fields: [questionResponses.questionId],
      references: [questions.id],
    }),
    user: one(users, {
      fields: [questionResponses.userId],
      references: [users.id],
    }),
  }),
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionResponse = typeof questionResponses.$inferSelect;
export type NewQuestionResponse = typeof questionResponses.$inferInsert;
