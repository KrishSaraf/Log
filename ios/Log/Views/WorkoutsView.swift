import SwiftUI
import SwiftData
import PhotosUI

struct WorkoutsView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \LoggedWorkout.date, order: .reverse) private var logged: [LoggedWorkout]
    @State private var logging = false
    @State private var showCamera = false
    @State private var showLibrary = false
    @State private var photoItem: PhotosPickerItem?
    @State private var pendingJPEG: Data?
    @State private var pendingImage: UIImage?
    @State private var showPhotoSheet = false
    @State private var editing: LoggedWorkout?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Palette.Space.section) {
                    HeroActionButton(title: "Photograph a machine", systemImage: "camera.fill") {
                        Task { await openCamera() }
                    }

                    HStack(spacing: 10) {
                        Button("Log workout") { logging = true }
                            .buttonStyle(BlockButtonStyle(filled: false))
                        NavigationLink {
                            LibraryView()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "square.grid.2x2")
                                    .font(.system(size: 13, weight: .semibold))
                                Text("Library")
                                    .font(.system(size: 15, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 48)
                            .foregroundStyle(Palette.ink)
                            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous)
                                    .stroke(Palette.lineStrong, lineWidth: 1)
                            )
                        }
                        .buttonStyle(PressScaleStyle())
                    }

                    QuietStat(label: "Gym log", value: "\(logged.count)", unit: "sessions")

                    if !health.snapshot.workouts.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionLabel(text: "Watch")
                            VStack(spacing: 0) {
                                ForEach(Array(health.snapshot.workouts.enumerated()), id: \.element.id) { index, workout in
                                    WatchWorkoutRow(workout: workout)
                                        .padding(.horizontal, Palette.Space.cardPad)
                                    if index < health.snapshot.workouts.count - 1 {
                                        ListRowDivider()
                                    }
                                }
                            }
                            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                                    .stroke(Palette.line, lineWidth: 1)
                            )
                        }
                    }

                    if logged.isEmpty {
                        Text("Photograph a machine or log a session.")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                            .cardSurface()
                    } else {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionLabel(text: "Yours")
                            VStack(spacing: 0) {
                                ForEach(Array(logged.enumerated()), id: \.element.id) { index, workout in
                                    Button { editing = workout } label: {
                                        LoggedWorkoutRow(workout: workout)
                                            .padding(.horizontal, Palette.Space.cardPad)
                                    }
                                    .buttonStyle(PressScaleStyle())
                                    .contextMenu {
                                        Button("Edit") { editing = workout }
                                        Button("Delete", role: .destructive) { delete(workout) }
                                    }
                                    if index < logged.count - 1 {
                                        ListRowDivider()
                                    }
                                }
                            }
                            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                                    .stroke(Palette.line, lineWidth: 1)
                            )
                        }
                    }
                }
                .padding(Palette.Space.screen)
                .padding(.bottom, 12)
            }
            .refreshable {
                await health.refresh()
                await sync.refresh(context: context)
            }
            .modifier(Screen())
            .navigationTitle("Workouts")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $logging) { LogWorkoutSheet() }
            .sheet(item: $editing) { workout in
                LogWorkoutSheet(workout: workout)
            }
            .fullScreenCover(isPresented: $showCamera, onDismiss: {
                if pendingJPEG != nil { showPhotoSheet = true }
            }) {
                CameraPicker(
                    onImage: { image in
                        if let jpeg = MealPhotoJPEG.make(from: image),
                           let preview = UIImage(data: jpeg)
                        {
                            pendingJPEG = jpeg
                            pendingImage = preview
                        }
                        showCamera = false
                    },
                    onCancel: { showCamera = false }
                )
                .ignoresSafeArea()
            }
            .photosPicker(isPresented: $showLibrary, selection: $photoItem, matching: .images)
            .onChange(of: photoItem) { _, item in
                Task { await loadPickedPhoto(item) }
            }
            .sheet(isPresented: $showPhotoSheet, onDismiss: {
                pendingJPEG = nil
                pendingImage = nil
            }) {
                if let jpeg = pendingJPEG, let image = pendingImage {
                    WorkoutReviewSheet(jpeg: jpeg, preview: image)
                }
            }
        }
    }

    private func delete(_ workout: LoggedWorkout) {
        if let remote = workout.remoteId, !remote.isEmpty {
            context.insert(SyncTombstone(kind: "workout", remoteId: remote))
        }
        context.delete(workout)
        try? context.save()
        sync.pushQuietly(context: context)
    }

    private func openCamera() async {
        if await CameraAccess.request() {
            showCamera = true
        } else {
            showLibrary = true
        }
    }

    private func loadPickedPhoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        photoItem = nil
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let jpeg = MealPhotoJPEG.make(from: data),
                  let preview = UIImage(data: jpeg)
            else { return }
            pendingJPEG = jpeg
            pendingImage = preview
            showPhotoSheet = true
        } catch {
            return
        }
    }
}

struct WatchWorkoutRow: View {
    let workout: WatchWorkout

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(workout.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(2)
                Text("\(Formatters.day(workout.start))  \(Formatters.time(workout.start))")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text(Formatters.duration(workout.durationSeconds))
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                if let kcal = workout.activeCalories {
                    Text("\(Formatters.int(kcal)) kcal")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .padding(.vertical, Palette.Space.row)
        .frame(minHeight: 56, alignment: .leading)
    }
}

struct LoggedWorkoutRow: View {
    let workout: LoggedWorkout

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(workout.name.isEmpty ? "Session" : workout.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(2)
                Spacer()
                Text(Formatters.day(workout.date))
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            ForEach(workout.exercises.sorted(by: { $0.orderIndex < $1.orderIndex })) { exercise in
                Text(summary(exercise))
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.muted)
            }
        }
        .padding(.vertical, Palette.Space.row)
        .frame(minHeight: 56, alignment: .leading)
    }

    private func summary(_ exercise: LoggedExercise) -> String {
        let sets = exercise.sets.sorted(by: { $0.setIndex < $1.setIndex })
        let bits = sets.map { set in
            set.weightKg > 0 ? "\(set.reps)×\(Formatters.oneDecimal(set.weightKg))" : "\(set.reps)"
        }
        return bits.isEmpty ? exercise.name : "\(exercise.name)  \(bits.joined(separator: "  "))"
    }
}
