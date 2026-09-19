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

import { cadenceEnum, hub, questionTypeEnum } from "./_shared";

/** Shape of `questions.config`, discriminated by the question's `type`. */
export type QuestionConfig = {
  /** rating: inclusive bounds of the scale, defaults to 1 and 5. */
  min?: number;
  max?: number;
  step?: number;
  /** rating: labels for the low and high ends. */
  minLabel?: string;
  maxLabel?: string;
  /** multiple_choice: the selectable options. */
  choices?: { value: string; label: string }[];
  /** multiple_choice: allow more than one selection. */
  multiple?: boolean;
  /** number: rendered after the input, for example "mg" or "cups". */
  unit?: string;
  /** text: placeholder shown in the textarea. */
  placeholder?: string;
  /** Optional helper copy shown under the label. */
  hint?: string;
};

/** A self-tracking prompt Krish answers on a schedule. */
export const questions = hub.table(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable slug used by importers. Never shown in the UI. */
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
    uniqueIndex("questions_key_uq").on(t.key),
    index("questions_active_order_idx").on(t.isActive, t.orderIndex),
  ],
);

/**
 * One answer per question per day. Which value column is used follows the
 * question type: rating and number write `valueNumeric`, boolean writes
 * `valueBool`, text and multiple_choice write `valueText`.
 */
export const questionResponses = hub.table(
  "question_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    valueNumeric: numeric("value_numeric", { precision: 12, scale: 4 }),
    valueBool: boolean("value_bool"),
    valueText: text("value_text"),
    /** How the habit was satisfied, e.g. "Bath" or "Tennis". */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("question_responses_question_day_uq").on(t.questionId, t.date),
    index("question_responses_date_idx").on(t.date),
  ],
);

export const questionsRelations = relations(questions, ({ many }) => ({
  responses: many(questionResponses),
}));

export const questionResponsesRelations = relations(
  questionResponses,
  ({ one }) => ({
    question: one(questions, {
      fields: [questionResponses.questionId],
      references: [questions.id],
    }),
  }),
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionResponse = typeof questionResponses.$inferSelect;
export type NewQuestionResponse = typeof questionResponses.$inferInsert;
