import SwiftUI
import SwiftData
import PhotosUI
import UIKit

struct NutritionView: View {
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \MealLog.createdAt, order: .reverse) private var meals: [MealLog]
    @State private var showCamera = false
    @State private var showLibrary = false
    @State private var photoItem: PhotosPickerItem?
    @State private var pendingJPEG: Data?
    @State private var pendingImage: UIImage?
    @State private var showLogSheet = false
    @State private var loggingManual = false
    @State private var editing: MealLog?

    private var today: [MealLog] { meals.filter { $0.day == DayStamp.today() } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Palette.Space.section) {
                    HStack(spacing: 10) {
                        QuietStat(label: "Calories", value: today.isEmpty ? "—" : "\(today.reduce(0) { $0 + $1.calories })", unit: "kcal")
                        QuietStat(label: "Protein", value: today.isEmpty ? "—" : "\(today.reduce(0) { $0 + $1.proteinG })", unit: "g")
                    }

                    HStack(spacing: 10) {
                        Button("Photograph") { Task { await PhotoIntake.openCamera(showCamera: $showCamera, showLibrary: $showLibrary) } }
                            .buttonStyle(BlockButtonStyle(filled: true))
                        Button("Library") { showLibrary = true }
                            .buttonStyle(BlockButtonStyle(filled: false))
                    }
                    Button("Log without a photo") { loggingManual = true }
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Palette.muted)
                        .frame(maxWidth: .infinity, minHeight: 44)

                    if meals.isEmpty {
                        Text("Photograph a plate to log it.")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                            .cardSurface()
                    } else {
                        GroupedCard(title: "Recent") {
                            ForEach(Array(meals.enumerated()), id: \.element.id) { index, meal in
                                Button { editing = meal } label: {
                                    MealRow(meal: meal).padding(.horizontal, Palette.Space.cardPad)
                                }
                                .buttonStyle(PressScaleStyle())
                                .contextMenu {
                                    Button("Edit") { editing = meal }
                                    Button("Delete", role: .destructive) { delete(meal) }
                                }
                                if index < meals.count - 1 { ListRowDivider() }
                            }
                        }
                    }
                }
                .padding(Palette.Space.screen)
            }
            .refreshable { await sync.refresh(context: context) }
            .modifier(Screen())
            .navigationTitle("Food")
            .photoIntake(
                showCamera: $showCamera,
                showLibrary: $showLibrary,
                item: $photoItem,
                jpeg: $pendingJPEG,
                preview: $pendingImage,
                showReview: $showLogSheet
            )
            .sheet(isPresented: $showLogSheet, onDismiss: {
                pendingJPEG = nil
                pendingImage = nil
            }) {
                if let jpeg = pendingJPEG, let image = pendingImage {
                    MealReviewSheet(jpeg: jpeg, preview: image)
                }
            }
            .sheet(isPresented: $loggingManual) { LogMealSheet() }
            .sheet(item: $editing) { LogMealSheet(meal: $0) }
        }
    }

    private func delete(_ meal: MealLog) {
        if let remote = meal.remoteId, !remote.isEmpty {
            context.insert(SyncTombstone(kind: "meal", remoteId: remote))
        }
        context.delete(meal)
        try? context.save()
        sync.pushQuietly(context: context)
    }
}

struct MealRow: View {
    let meal: MealLog

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 3) {
                Text(meal.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(2)
                Text("\(DayStamp.pretty(meal.day))  ·  \(meal.mealType)")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            Spacer(minLength: 8)
            Text("\(meal.calories) kcal")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
        }
        .padding(.vertical, Palette.Space.row)
        .frame(minHeight: 52)
    }
}

struct LogMealSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync

    var meal: MealLog? = nil
    var initialJPEG: Data? = nil
    var initialImage: UIImage? = nil
    var onRetake: (() -> Void)? = nil

    @State private var name = ""
    @State private var mealType = "Lunch"
    @State private var calories = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var showExtraMacros = false
    @State private var foodSummary = ""
    @State private var date = Date()
    @State private var didLoad = false
    @State private var previewImage: UIImage?
    @State private var analyzing = false
    @State private var analyzeError: String?
    @State private var showLibrary = false
    @State private var photoItem: PhotosPickerItem?
    @State private var analyzeGeneration = 0
    private let types = ["Breakfast", "Lunch", "Dinner", "Snack"]

    private var isEditing: Bool { meal != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    photoSection

                    labeled("Meal", text: $name)
                    DatePicker("Day", selection: $date, displayedComponents: .date)
                        .font(.system(size: 16))
                        .foregroundStyle(Palette.ink)
                    Picker("Type", selection: $mealType) {
                        ForEach(types, id: \.self) { Text($0) }
                    }
                    .pickerStyle(.segmented)
                    labeled("Calories", text: $calories, keyboard: .numberPad)
                    labeled("Protein (g)", text: $protein, keyboard: .numberPad)

                    if showExtraMacros {
                        extraMacros
                    }

                    PrimaryButton(title: isEditing ? "Save changes" : "Save meal") { save() }

                    if isEditing {
                        Button("Delete meal", role: .destructive) { deleteMeal() }
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Palette.muted)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(isEditing ? "Edit meal" : "Log meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted)
                }
            }
            .interactiveDismissDisabled(analyzing)
            .photosPicker(isPresented: $showLibrary, selection: $photoItem, matching: .images)
            .onChange(of: photoItem) { _, item in
                Task { await loadPickedPhoto(item) }
            }
        }
        .onAppear { loadIfNeeded() }
    }

    @ViewBuilder
    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let previewImage {
                Image(uiImage: previewImage)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 220)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .accessibilityLabel("Meal photo")
            }

            if !isEditing {
                HStack(spacing: 10) {
                    if onRetake != nil {
                        Button {
                            onRetake?()
                        } label: {
                            Label("Take photo", systemImage: "camera.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .foregroundStyle(Palette.onAccent)
                                .background(Palette.accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(analyzing)
                    }

                    Button {
                        showLibrary = true
                    } label: {
                        Label("Photo library", systemImage: "photo")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .foregroundStyle(Palette.ink)
                            .background(Palette.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(Palette.line, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(analyzing)
                }
            }

            if analyzing {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(Palette.ink)
                    Text("Reading photo…")
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.muted)
                }
            }

            if let analyzeError {
                Text(analyzeError)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.muted)
            }

            if !foodSummary.isEmpty {
                Text(foodSummary)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var extraMacros: some View {
        HStack(spacing: 16) {
            if !carbs.isEmpty {
                QuietStat(label: "Carbs", value: carbs, unit: "g")
            }
            if !fat.isEmpty {
                QuietStat(label: "Fat", value: fat, unit: "g")
            }
        }
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        if let meal {
            name = meal.name
            mealType = types.contains(meal.mealType) ? meal.mealType : meal.mealType.capitalized
            calories = meal.calories > 0 ? "\(meal.calories)" : ""
            protein = meal.proteinG > 0 ? "\(meal.proteinG)" : ""
            date = DayStamp.date(from: meal.day) ?? .now
            return
        }
        if let initialImage {
            previewImage = initialImage
        }
        if let initialJPEG {
            Task { await analyze(initialJPEG) }
        }
    }

    private func labeled(_ title: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: title.uppercased())
            TextField(title, text: text)
                .keyboardType(keyboard)
                .font(.system(size: 17))
                .foregroundStyle(Palette.ink)
                .padding(.bottom, 8)
                .overlay(alignment: .bottom) { Rectangle().fill(Palette.line).frame(height: 1) }
        }
    }

    private func loadPickedPhoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        photoItem = nil
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let jpeg = MealPhotoJPEG.make(from: data),
                  let preview = UIImage(data: jpeg)
            else {
                analyzeError = Self.photoError
                return
            }
            previewImage = preview
            await analyze(jpeg)
        } catch {
            analyzeError = Self.photoError
        }
    }

    private func analyze(_ jpeg: Data) async {
        analyzeGeneration += 1
        let generation = analyzeGeneration
        analyzing = true
        analyzeError = nil
        foodSummary = ""
        defer {
            if generation == analyzeGeneration {
                analyzing = false
            }
        }

        do {
            let draft = try await PhotoAPI.analyzeMealPhoto(jpeg)
            guard generation == analyzeGeneration else { return }
            apply(draft)
        } catch {
            guard generation == analyzeGeneration else { return }
            analyzeError = Self.photoError
        }
    }

    private func apply(_ draft: PhotoAPI.MealDraft) {
        if !draft.mealName.isEmpty {
            name = draft.mealName
        }
        if let match = types.first(where: { $0.lowercased() == draft.mealType.lowercased() }) {
            mealType = match
        }
        if draft.calories > 0 { calories = "\(draft.calories)" }
        if draft.proteinG > 0 { protein = "\(draft.proteinG)" }
        if let carbsG = draft.carbsG {
            carbs = "\(carbsG)"
            showExtraMacros = true
        }
        if let fatG = draft.fatG {
            fat = "\(fatG)"
            showExtraMacros = true
        }
        if draft.foodNames.count > 1 {
            foodSummary = draft.foodNames.joined(separator: " · ")
        }
    }

    private func save() {
        let day = DayStamp.from(date)
        let title = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if let meal {
            meal.name = title.isEmpty ? mealType : title
            meal.mealType = mealType
            meal.day = day
            meal.calories = Int(calories) ?? 0
            meal.proteinG = Int(protein) ?? 0
            meal.needsPush = true
            meal.updatedAt = .now
        } else {
            context.insert(
                MealLog(
                    day: day,
                    name: title.isEmpty ? mealType : title,
                    mealType: mealType,
                    calories: Int(calories) ?? 0,
                    proteinG: Int(protein) ?? 0,
                    needsPush: true
                )
            )
        }
        try? context.save()
        sync.pushQuietly(context: context)
        dismiss()
    }

    private func deleteMeal() {
        guard let meal else { return }
        if let remote = meal.remoteId, !remote.isEmpty {
            context.insert(SyncTombstone(kind: "meal", remoteId: remote))
        }
        context.delete(meal)
        try? context.save()
        sync.pushQuietly(context: context)
        dismiss()
    }

    private static let photoError = "Couldn't read that photo. Try another, or log it yourself."
}
