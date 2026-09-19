import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateExercise, useUpdateExercise } from "@/hooks/use-exercises";
import type { Exercise } from "@workspace/api-client-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bodyPart: z.string().min(2, "Body part is required"),
  equipment: z.string().min(2, "Equipment is required"),
  target: z.string().min(2, "Target muscle is required"),
  gifUrl: z.string().url("Must be a valid URL").or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exerciseToEdit?: Exercise | null;
}

export function ExerciseFormModal({ isOpen, onClose, exerciseToEdit }: Props) {
  const { toast } = useToast();
  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();
  
  const isEditing = !!exerciseToEdit;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", bodyPart: "", equipment: "", target: "", gifUrl: ""
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (exerciseToEdit) {
        reset({
          name: exerciseToEdit.name,
          bodyPart: exerciseToEdit.bodyPart,
          equipment: exerciseToEdit.equipment,
          target: exerciseToEdit.target,
          gifUrl: exerciseToEdit.gifUrl || "",
        });
      } else {
        reset({ name: "", bodyPart: "", equipment: "", target: "", gifUrl: "" });
      }
    }
  }, [isOpen, exerciseToEdit, reset]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      secondaryMuscles: [],
      instructions: []
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: exerciseToEdit.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Exercise updated successfully" });
            onClose();
          },
          onError: (err) => {
            toast({ title: "API Endpoint Missing", description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Success", description: "Exercise created successfully" });
          onClose();
        },
        onError: (err) => {
          toast({ title: "API Endpoint Missing", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-xl font-display font-bold">
                  {isEditing ? "Edit Exercise" : "Add Custom Exercise"}
                </h2>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="exercise-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Exercise Name</label>
                    <input 
                      {...register("name")}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/20"
                      placeholder="e.g. Barbell Bench Press"
                    />
                    {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/80">Body Part</label>
                      <input 
                        {...register("bodyPart")}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/20"
                        placeholder="e.g. Chest"
                      />
                      {errors.bodyPart && <p className="text-destructive text-sm">{errors.bodyPart.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/80">Target Muscle</label>
                      <input 
                        {...register("target")}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/20"
                        placeholder="e.g. Pectorals"
                      />
                      {errors.target && <p className="text-destructive text-sm">{errors.target.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Equipment</label>
                    <input 
                      {...register("equipment")}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/20"
                      placeholder="e.g. Barbell"
                    />
                    {errors.equipment && <p className="text-destructive text-sm">{errors.equipment.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Animation URL (optional)</label>
                    <input 
                      {...register("gifUrl")}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/20"
                      placeholder="https://..."
                    />
                    {errors.gifUrl && <p className="text-destructive text-sm">{errors.gifUrl.message}</p>}
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl font-medium text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="exercise-form"
                  disabled={isPending}
                  className="px-6 py-3 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditing ? "Save Changes" : "Create Exercise"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
