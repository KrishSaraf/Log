import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";
import { useCreateExercise, useUpdateExercise } from "@/hooks/use-exercises";
import { Button, Field, Input } from "@/components/primitives";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  bodyPart: z.string().min(1, "Body part is required"),
  equipment: z.string().min(1, "Equipment is required"),
  target: z.string().min(1, "Target is required"),
  gifUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  level: z.enum(["beginner", "intermediate", "expert"]),
});

type Values = z.infer<typeof schema>;

export function ExerciseForm({
  open,
  onClose,
  exercise,
}: {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise | null;
}) {
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const editing = !!exercise;
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      bodyPart: "",
      equipment: "",
      target: "",
      gifUrl: "",
      level: "beginner",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      exercise
        ? {
            name: exercise.name,
            bodyPart: exercise.bodyPart,
            equipment: exercise.equipment,
            target: exercise.target,
            gifUrl: exercise.gifUrl || "",
            level: (["beginner", "intermediate", "expert"].includes(exercise.level)
              ? exercise.level
              : "beginner") as Values["level"],
          }
        : {
            name: "",
            bodyPart: "",
            equipment: "",
            target: "",
            gifUrl: "",
            level: "beginner",
          },
    );
  }, [open, exercise, reset]);

  const onSubmit = (data: Values) => {
    const payload = {
      ...data,
      secondaryMuscles: exercise?.secondaryMuscles ?? [],
      instructions: exercise?.instructions ?? [],
      images: data.gifUrl ? [data.gifUrl] : exercise?.images ?? [],
    };

    if (editing && exercise) {
      update.mutate(
        { id: exercise.id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      create.mutate({ data: payload }, { onSuccess: () => onClose() });
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[111] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto w-full max-w-lg max-h-[90dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-elevated shadow-[var(--kw-shadow)] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-xl font-bold">
                  {editing ? "Edit exercise" : "Add exercise"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="tap-target flex items-center justify-center rounded-full text-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form
                id="exercise-form"
                onSubmit={handleSubmit(onSubmit)}
                className="overflow-y-auto space-y-4 p-5"
              >
                <Field label="Name" error={errors.name?.message}>
                  <Input {...register("name")} placeholder="Barbell Bench Press" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Body part" error={errors.bodyPart?.message}>
                    <Input {...register("bodyPart")} placeholder="chest" />
                  </Field>
                  <Field label="Target" error={errors.target?.message}>
                    <Input {...register("target")} placeholder="pectorals" />
                  </Field>
                </div>
                <Field label="Equipment" error={errors.equipment?.message}>
                  <Input {...register("equipment")} placeholder="barbell" />
                </Field>
                <Field label="Level" error={errors.level?.message}>
                  <select
                    {...register("level")}
                    className="w-full rounded-lg border border-border bg-elevated px-4 py-3 text-foreground outline-none focus:border-accent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                </Field>
                <Field label="Demo image URL (optional)" error={errors.gifUrl?.message}>
                  <Input {...register("gifUrl")} placeholder="https://…" />
                </Field>
              </form>

              <div className="flex justify-end gap-2 border-t border-border bg-surface/40 px-5 py-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" form="exercise-form" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {editing ? "Save" : "Create"}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
