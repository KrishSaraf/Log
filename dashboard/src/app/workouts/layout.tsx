import { PageHeader } from "@/components/kit";
import { WorkoutSectionTabs } from "@/components/workouts/section-tabs";

export default function WorkoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Workouts"
        description="Sessions you've logged, and the movements you can add."
      />
      <WorkoutSectionTabs />
      {children}
    </div>
  );
}
