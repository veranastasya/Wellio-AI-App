import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Supported languages for AI responses and UI translations - defined early so it can be used by other constants
export const SUPPORTED_LANGUAGES = ["en", "ru", "es"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const GOAL_TYPES = [
  "lose_weight",
  "gain_muscle_strength",
  "improve_body_composition",
  "maintain_weight",
  "improve_health",
  "eat_healthier",
  "increase_energy",
  "improve_fitness_endurance",
  "reduce_stress_improve_balance",
  "improve_sleep_recovery",
  "prepare_event",
  "other",
] as const;

export type GoalType = typeof GOAL_TYPES[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lose_weight: "Lose weight",
  gain_muscle_strength: "Gain muscle / strength",
  improve_body_composition: "Improve body composition",
  maintain_weight: "Maintain current weight",
  improve_health: "Improve overall health",
  eat_healthier: "Eat healthier",
  increase_energy: "Increase energy",
  improve_fitness_endurance: "Improve fitness / endurance",
  reduce_stress_improve_balance: "Reduce stress & improve balance",
  improve_sleep_recovery: "Improve sleep & recovery",
  prepare_event: "Prepare for an event",
  other: "Other",
};

// Translated goal type labels
export const GOAL_TYPE_LABELS_TRANSLATED: Record<SupportedLanguage, Record<GoalType, string>> = {
  en: GOAL_TYPE_LABELS,
  ru: {
    lose_weight: "Сбросить вес",
    gain_muscle_strength: "Набрать мышечную массу / силу",
    improve_body_composition: "Улучшить состав тела",
    maintain_weight: "Поддерживать текущий вес",
    improve_health: "Улучшить общее здоровье",
    eat_healthier: "Питаться здоровее",
    increase_energy: "Повысить энергию",
    improve_fitness_endurance: "Улучшить форму / выносливость",
    reduce_stress_improve_balance: "Снизить стресс и улучшить баланс",
    improve_sleep_recovery: "Улучшить сон и восстановление",
    prepare_event: "Подготовиться к мероприятию",
    other: "Другое",
  },
  es: {
    lose_weight: "Perder peso",
    gain_muscle_strength: "Ganar músculo / fuerza",
    improve_body_composition: "Mejorar composición corporal",
    maintain_weight: "Mantener peso actual",
    improve_health: "Mejorar salud general",
    eat_healthier: "Comer más saludable",
    increase_energy: "Aumentar energía",
    improve_fitness_endurance: "Mejorar condición / resistencia",
    reduce_stress_improve_balance: "Reducir estrés y mejorar equilibrio",
    improve_sleep_recovery: "Mejorar sueño y recuperación",
    prepare_event: "Prepararse para un evento",
    other: "Otro",
  },
};

export function getGoalTypeLabel(goalType: string | null | undefined, goalDescription?: string | null): string {
  if (!goalType) return "Not set";
  
  if (goalType === "other" && goalDescription) {
    return goalDescription;
  }
  
  if (goalType in GOAL_TYPE_LABELS) {
    return GOAL_TYPE_LABELS[goalType as GoalType];
  }
  
  return goalDescription || goalType;
}

export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
] as const;

export type ActivityLevel = typeof ACTIVITY_LEVELS[number];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little to no exercise)",
  lightly_active: "Lightly Active (light exercise 1-3 days/week)",
  moderately_active: "Moderately Active (moderate exercise 3-5 days/week)",
  very_active: "Very Active (hard exercise 6-7 days/week)",
  extra_active: "Extremely Active (hard exercise & work in a physical job)",
};

// Translated activity level labels
export const ACTIVITY_LEVEL_LABELS_TRANSLATED: Record<SupportedLanguage, Record<ActivityLevel, string>> = {
  en: ACTIVITY_LEVEL_LABELS,
  ru: {
    sedentary: "Сидячий образ жизни (мало или нет упражнений)",
    lightly_active: "Низкая активность (лёгкие упражнения 1-3 дня/неделю)",
    moderately_active: "Умеренная активность (упражнения 3-5 дней/неделю)",
    very_active: "Высокая активность (интенсивные упражнения 6-7 дней/неделю)",
    extra_active: "Очень высокая активность (тяжёлые тренировки + физическая работа)",
  },
  es: {
    sedentary: "Sedentario (poco o sin ejercicio)",
    lightly_active: "Ligeramente activo (ejercicio ligero 1-3 días/semana)",
    moderately_active: "Moderadamente activo (ejercicio moderado 3-5 días/semana)",
    very_active: "Muy activo (ejercicio intenso 6-7 días/semana)",
    extra_active: "Extremadamente activo (ejercicio intenso + trabajo físico)",
  },
};

export const ACTIVITY_LEVEL_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  ru: "Русский (Russian)",
  es: "Español (Spanish)",
};

export const LANGUAGE_NATIVE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
};

// Client portal navigation translations
export const CLIENT_NAV_TRANSLATIONS = {
  dashboard: { en: "Dashboard", ru: "Главная", es: "Panel" },
  myProgress: { en: "My Progress", ru: "Мой прогресс", es: "Mi Progreso" },
  myPlan: { en: "My Plan", ru: "Мой план", es: "Mi Plan" },
  coachChat: { en: "Coach Chat", ru: "Чат с тренером", es: "Chat con Entrenador" },
  aiTracker: { en: "AI Tracker", ru: "AI Трекер", es: "Seguimiento IA" },
  profile: { en: "Profile", ru: "Профиль", es: "Perfil" },
  logOut: { en: "Log Out", ru: "Выйти", es: "Cerrar sesión" },
  newPlanBadge: { en: "New", ru: "Новый", es: "Nuevo" },
} as const;

// AI Tracker UI translations - these are shown to users in the AI Tracker interface
export const AI_TRACKER_TRANSLATIONS = {
  // Page level
  pageTitle: {
    en: "AI Progress Tracker",
    ru: "AI Трекер прогресса",
    es: "Seguimiento de Progreso IA",
  },
  pageSubtitle: {
    en: "Track your achievements",
    ru: "Отслеживайте свои достижения",
    es: "Registra tus logros",
  },
  quickActions: {
    en: "Quick actions:",
    ru: "Быстрые действия:",
    es: "Acciones rápidas:",
  },
  // Quick action buttons
  quickActionLabels: {
    workout: { en: "Workout", ru: "Тренировка", es: "Ejercicio" },
    meal: { en: "Meal", ru: "Еда", es: "Comida" },
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    sleep: { en: "Sleep", ru: "Сон", es: "Sueño" },
    water: { en: "Water", ru: "Вода", es: "Agua" },
    mood: { en: "Mood", ru: "Настроение", es: "Ánimo" },
  },
  // Quick action prompts - default (English/Spanish don't have gendered forms, Russian defaults to masculine)
  quickActionPrompts: {
    workout: { en: "I did a workout: ", ru: "Я провёл тренировку: ", es: "Hice un ejercicio: " },
    meal: { en: "I had a meal: ", ru: "Я поел: ", es: "Comí: " },
    weight: { en: "My weight today is ", ru: "Мой вес сегодня ", es: "Mi peso hoy es " },
    sleep: { en: "I slept ", ru: "Я спал ", es: "Dormí " },
    water: { en: "I drank ", ru: "Я выпил ", es: "Bebí " },
    mood: { en: "Feeling ", ru: "Чувствую себя ", es: "Me siento " },
  },
  // Gender-aware Russian prompts (feminine forms)
  quickActionPromptsFeminine: {
    workout: "Я провела тренировку: ",
    meal: "Я поела: ",
    weight: "Мой вес сегодня ", // No gender change needed
    sleep: "Я спала ",
    water: "Я выпила ",
    mood: "Чувствую себя ", // No gender change needed
  },
  greeting: {
    en: "Hi! I'm your AI assistant for tracking progress. I'll help you log workouts, nutrition, weight, sleep, and other metrics.",
    ru: "Привет! Я твой AI-помощник для отслеживания прогресса. Я помогу тебе записывать тренировки, питание, вес, сон и другие показатели.",
    es: "¡Hola! Soy tu asistente de IA para seguir tu progreso. Te ayudaré a registrar entrenamientos, nutrición, peso, sueño y otras métricas.",
  },
  greetingSecondary: {
    en: "You can type a description or attach photos of your meals, workouts, or progress!",
    ru: "Ты можешь написать описание или прикрепить фотографии своих блюд, тренировок или прогресса!",
    es: "¡Puedes escribir una descripción o adjuntar fotos de tus comidas, entrenamientos o progreso!",
  },
  gotIt: {
    en: "Got it! I detected:",
    ru: "Понял! Я обнаружил:",
    es: "¡Entendido! Detecté:",
  },
  analyzing: {
    en: "Analyzing...",
    ru: "Анализирую...",
    es: "Analizando...",
  },
  placeholder: {
    en: "Describe your progress...",
    ru: "Опиши свой прогресс...",
    es: "Describe tu progreso...",
  },
  logged: {
    en: "Logged!",
    ru: "Записано!",
    es: "¡Registrado!",
  },
  loggedDescription: {
    en: "Your entry is being processed by AI",
    ru: "Твоя запись обрабатывается AI",
    es: "Tu entrada está siendo procesada por IA",
  },
  // Event type labels
  eventLabels: {
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    nutrition: { en: "Nutrition", ru: "Питание", es: "Nutrición" },
    workout: { en: "Workout", ru: "Тренировка", es: "Ejercicio" },
    sleep: { en: "Sleep", ru: "Сон", es: "Sueño" },
    checkin_mood: { en: "Mood", ru: "Настроение", es: "Estado de ánimo" },
    default: { en: "Log", ru: "Запись", es: "Registro" },
  },
  // Nutrition display labels
  nutritionLabels: {
    calories: { en: "Calories", ru: "Калории", es: "Calorías" },
    protein: { en: "Protein", ru: "Белки", es: "Proteína" },
    carbs: { en: "Carbs", ru: "Углеводы", es: "Carbohidratos" },
    fat: { en: "Fat", ru: "Жиры", es: "Grasas" },
    estimated: { en: "Estimated based on description", ru: "Оценка на основе описания", es: "Estimado según la descripción" },
  },
  // Workout display labels
  workoutLabels: {
    duration: { en: "Duration", ru: "Длительность", es: "Duración" },
    intensity: { en: "Intensity", ru: "Интенсивность", es: "Intensidad" },
    type: { en: "Type", ru: "Тип", es: "Tipo" },
  },
  // Sleep display labels
  sleepLabels: {
    hours: { en: "hours", ru: "часов", es: "horas" },
    quality: { en: "Quality", ru: "Качество", es: "Calidad" },
  },
  // Mood display labels
  moodLabels: {
    rating: { en: "Rating", ru: "Оценка", es: "Calificación" },
  },
  // Weight display labels
  weightLabels: {
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
  },
  // Common labels
  min: { en: "min", ru: "мин", es: "min" },
  confidence: {
    high: { en: "high confidence", ru: "высокая точность", es: "alta confianza" },
    medium: { en: "medium confidence", ru: "средняя точность", es: "confianza media" },
    low: { en: "low confidence", ru: "низкая точность", es: "baja confianza" },
  },
} as const;

// Helper function to get translated string
export function getAITrackerTranslation(
  key: keyof typeof AI_TRACKER_TRANSLATIONS, 
  lang: SupportedLanguage = "en"
): string {
  const translation = AI_TRACKER_TRANSLATIONS[key];
  if (typeof translation === "object" && "en" in translation) {
    return (translation as Record<SupportedLanguage, string>)[lang] || (translation as Record<SupportedLanguage, string>).en;
  }
  return String(translation);
}

// Comprehensive UI translations for all client-facing pages
export const CLIENT_UI_TRANSLATIONS = {
  // Dashboard - AI Insights section
  aiInsights: {
    title: { en: "Your AI Insights", ru: "Ваши AI-инсайты", es: "Tus Insights de IA" },
    subtitle: { en: "Based on your tracking data", ru: "На основе ваших данных", es: "Basado en tus datos" },
    dataPoints: { en: "Data Points", ru: "Записей", es: "Datos" },
    consistency: { en: "Consistency", ru: "Регулярность", es: "Consistencia" },
    trend: { en: "Trend", ru: "Тренд", es: "Tendencia" },
    detectedTrends: { en: "Detected Trends", ru: "Обнаруженные тренды", es: "Tendencias Detectadas" },
    yourStrength: { en: "Your Strength", ru: "Ваша сила", es: "Tu Fortaleza" },
    opportunity: { en: "Opportunity", ru: "Зона роста", es: "Oportunidad" },
    improving: { en: "Improving", ru: "Рост", es: "Mejorando" },
    declining: { en: "Declining", ru: "Спад", es: "Bajando" },
    stable: { en: "Stable", ru: "Стабильно", es: "Estable" },
    plateau: { en: "Plateau", ru: "Плато", es: "Meseta" },
    noData: { en: "Start logging to get personalized AI insights", ru: "Начните вести записи для получения персонализированных AI-инсайтов", es: "Comienza a registrar para obtener insights personalizados de IA" },
  },
  // Dashboard - Stats
  stats: {
    workoutsWeek: { en: "Workouts/week", ru: "Тренировок/нед", es: "Entrenos/sem" },
    caloriesDay: { en: "Calories/day", ru: "Калорий/день", es: "Calorías/día" },
    dayStreak: { en: "Day streak", ru: "Дней подряд", es: "Días seguidos" },
    achievements: { en: "Achievements", ru: "Достижения", es: "Logros" },
  },
  // Dashboard - Recent Activity
  recentActivity: {
    title: { en: "Recent Activity", ru: "Недавняя активность", es: "Actividad Reciente" },
    noActivity: { en: "No recent activity", ru: "Нет недавней активности", es: "Sin actividad reciente" },
    justNow: { en: "Just now", ru: "Только что", es: "Ahora mismo" },
    hoursAgo: { en: "hours ago", ru: "часов назад", es: "horas atrás" },
    yesterday: { en: "Yesterday", ru: "Вчера", es: "Ayer" },
    daysAgo: { en: "days ago", ru: "дней назад", es: "días atrás" },
  },
  // Dashboard - Upcoming
  upcoming: {
    title: { en: "Upcoming", ru: "Предстоящее", es: "Próximo" },
    noUpcoming: { en: "No upcoming items", ru: "Нет предстоящих задач", es: "No hay elementos próximos" },
    today: { en: "Today", ru: "Сегодня", es: "Hoy" },
    tomorrow: { en: "Tomorrow", ru: "Завтра", es: "Mañana" },
  },
  // Dashboard - Goals
  goals: {
    title: { en: "Your Goals", ru: "Ваши цели", es: "Tus Metas" },
    myGoals: { en: "My Goals", ru: "Мои цели", es: "Mis Metas" },
    activeGoals: { en: "Active Goals", ru: "Активные цели", es: "Metas Activas" },
    noGoals: { en: "No goals set yet", ru: "Пока нет целей", es: "Aún no hay metas" },
    progress: { en: "Progress", ru: "Прогресс", es: "Progreso" },
  },
  // Profile page
  profile: {
    title: { en: "Profile", ru: "Профиль", es: "Perfil" },
    contactInfo: { en: "Contact Information", ru: "Контактная информация", es: "Información de Contacto" },
    email: { en: "Email", ru: "Email", es: "Correo" },
    phone: { en: "Phone", ru: "Телефон", es: "Teléfono" },
    physicalStats: { en: "Physical Stats", ru: "Физические показатели", es: "Estadísticas Físicas" },
    age: { en: "Age", ru: "Возраст", es: "Edad" },
    height: { en: "Height", ru: "Рост", es: "Altura" },
    currentWeight: { en: "Current weight", ru: "Текущий вес", es: "Peso actual" },
    targetWeight: { en: "Target weight", ru: "Целевой вес", es: "Peso objetivo" },
    goalsPreferences: { en: "Goals & Preferences", ru: "Цели и предпочтения", es: "Metas y Preferencias" },
    memberSince: { en: "Member since", ru: "Участник с", es: "Miembro desde" },
    language: { en: "Language", ru: "Язык", es: "Idioma" },
    notifications: { en: "Notifications", ru: "Уведомления", es: "Notificaciones" },
    enableNotifications: { en: "Enable Notifications", ru: "Включить уведомления", es: "Activar Notificaciones" },
    notificationsEnabled: { en: "Notifications enabled", ru: "Уведомления включены", es: "Notificaciones activadas" },
    years: { en: "years", ru: "лет", es: "años" },
    cm: { en: "cm", ru: "см", es: "cm" },
    kg: { en: "kg", ru: "кг", es: "kg" },
  },
  // Coach Chat page
  coachChat: {
    title: { en: "Coach Chat", ru: "Чат с тренером", es: "Chat con Entrenador" },
    yourCoach: { en: "Your Coach", ru: "Ваш тренер", es: "Tu Entrenador" },
    messagePlaceholder: { en: "Type a message...", ru: "Напишите сообщение...", es: "Escribe un mensaje..." },
    send: { en: "Send", ru: "Отправить", es: "Enviar" },
    noMessages: { en: "No messages yet. Start a conversation with your coach!", ru: "Пока нет сообщений. Начните разговор с тренером!", es: "Aún no hay mensajes. ¡Inicia una conversación con tu entrenador!" },
    attachFile: { en: "Attach file", ru: "Прикрепить файл", es: "Adjuntar archivo" },
  },
  // My Plan page
  myPlan: {
    title: { en: "My Plan", ru: "Мой план", es: "Mi Plan" },
    currentPlan: { en: "Current Plan", ru: "Текущий план", es: "Plan Actual" },
    weeklyPlan: { en: "Weekly Plan", ru: "Недельный план", es: "Plan Semanal" },
    noPlan: { en: "No plan assigned yet", ru: "План ещё не назначен", es: "Aún no hay plan asignado" },
    noPlanDescription: { en: "Your coach will share your wellness plan here", ru: "Ваш тренер разместит здесь план", es: "Tu entrenador compartirá tu plan aquí" },
    thisWeeksPlan: { en: "This Week's Plan", ru: "План на эту неделю", es: "Plan de Esta Semana" },
    pastWeeks: { en: "Past Weeks", ru: "Прошлые недели", es: "Semanas Anteriores" },
    yourProgress: { en: "Your Progress", ru: "Ваш прогресс", es: "Tu Progreso" },
    overallProgress: { en: "Overall Progress", ru: "Общий прогресс", es: "Progreso General" },
    status: { en: "Status", ru: "Статус", es: "Estado" },
    workouts: { en: "Workouts", ru: "Тренировки", es: "Entrenamientos" },
    nutrition: { en: "Nutrition", ru: "Питание", es: "Nutrición" },
    exercises: { en: "exercises", ru: "упражнений", es: "ejercicios" },
    sets: { en: "sets", ru: "подходов", es: "series" },
    reps: { en: "reps", ru: "повторений", es: "repeticiones" },
    downloadPdf: { en: "Download PDF", ru: "Скачать PDF", es: "Descargar PDF" },
    week: { en: "Week", ru: "Неделя", es: "Semana" },
    keepUpGreatWork: { en: "Keep up the great work!", ru: "Так держать!", es: "¡Sigue así!" },
  },
  // Progress Photos page
  progressPhotos: {
    title: { en: "Progress Photos", ru: "Фото прогресса", es: "Fotos de Progreso" },
    subtitle: { en: "Track your transformation journey with progress photos", ru: "Отслеживайте свой прогресс с помощью фотографий", es: "Sigue tu transformación con fotos de progreso" },
    sharedWithCoach: { en: "Shared with Coach", ru: "Поделился с тренером", es: "Compartido con Entrenador" },
    private: { en: "Private", ru: "Приватно", es: "Privado" },
    uploadNewPhoto: { en: "Upload New Photo", ru: "Загрузить фото", es: "Subir Nueva Foto" },
    uploadProgressPhoto: { en: "Upload Progress Photo", ru: "Загрузить фото прогресса", es: "Subir Foto de Progreso" },
    photo: { en: "Photo", ru: "Фото", es: "Foto" },
    caption: { en: "Caption (optional)", ru: "Подпись (необязательно)", es: "Descripción (opcional)" },
    captionPlaceholder: { en: "e.g., Week 4 progress", ru: "напр., Прогресс недели 4", es: "ej., Progreso semana 4" },
    shareWithCoach: { en: "Share with Coach", ru: "Поделиться с тренером", es: "Compartir con Entrenador" },
    uploadPhoto: { en: "Upload Photo", ru: "Загрузить", es: "Subir Foto" },
    uploading: { en: "Uploading...", ru: "Загрузка...", es: "Subiendo..." },
    noPhotos: { en: "No progress photos yet", ru: "Пока нет фотографий прогресса", es: "Aún no hay fotos de progreso" },
    noPhotosDescription: { en: "Upload your first progress photo to track your journey", ru: "Загрузите первое фото для отслеживания прогресса", es: "Sube tu primera foto para seguir tu progreso" },
    photoUploaded: { en: "Photo uploaded!", ru: "Фото загружено!", es: "¡Foto subida!" },
    photoUploadedDescription: { en: "Your progress photo has been saved.", ru: "Ваше фото прогресса сохранено.", es: "Tu foto de progreso ha sido guardada." },
    uploadFailed: { en: "Upload failed", ru: "Ошибка загрузки", es: "Error al subir" },
    tryAgain: { en: "Please try again.", ru: "Попробуйте снова.", es: "Por favor, inténtalo de nuevo." },
    photoDeleted: { en: "Photo deleted", ru: "Фото удалено", es: "Foto eliminada" },
    fileTooLarge: { en: "File too large", ru: "Файл слишком большой", es: "Archivo muy grande" },
    maxSize: { en: "Max 10MB allowed", ru: "Максимум 10МБ", es: "Máximo 10MB permitido" },
  },
  // My Progress page
  myProgress: {
    title: { en: "My Progress", ru: "Мой прогресс", es: "Mi Progreso" },
    subtitle: { en: "Track your transformation journey", ru: "Отслеживайте свой путь преобразования", es: "Sigue tu viaje de transformación" },
    weightLost: { en: "Weight Lost", ru: "Потеря веса", es: "Peso Perdido" },
    workoutsThisWeek: { en: "Workouts This Week", ru: "Тренировок на этой неделе", es: "Entrenamientos Esta Semana" },
    avgDailyCalories: { en: "Avg. Daily Calories", ru: "Сред. калорий в день", es: "Calorías Diarias Prom." },
    habitCompletion: { en: "Habit Completion", ru: "Выполнение привычек", es: "Cumplimiento de Hábitos" },
    fromLastWeek: { en: "from last week", ru: "с прошлой недели", es: "desde la semana pasada" },
    onTrack: { en: "On track", ru: "В норме", es: "En camino" },
    steadyProgress: { en: "Steady progress", ru: "Стабильный прогресс", es: "Progreso constante" },
    weightProgress: { en: "Weight Progress", ru: "Прогресс веса", es: "Progreso de Peso" },
    trackedViaAI: { en: "Tracked via AI chat logs", ru: "Отслеживается через AI-чат", es: "Seguimiento vía chat de IA" },
    weeklyActivity: { en: "Weekly Activity", ru: "Недельная активность", es: "Actividad Semanal" },
    workoutDurationByDay: { en: "Workout duration by day", ru: "Продолжительность тренировок по дням", es: "Duración del entrenamiento por día" },
    nutritionOverview: { en: "Nutrition Overview", ru: "Обзор питания", es: "Resumen de Nutrición" },
    dailyCalorieIntake: { en: "Daily calorie intake", ru: "Дневное потребление калорий", es: "Ingesta diaria de calorías" },
    kgTotal: { en: "kg total", ru: "кг всего", es: "kg en total" },
    toGo: { en: "to go", ru: "осталось", es: "por alcanzar" },
    duration: { en: "Duration", ru: "Длительность", es: "Duración" },
    calories: { en: "Calories", ru: "Калории", es: "Calorías" },
    min: { en: "min", ru: "мин", es: "min" },
    cal: { en: "cal", ru: "ккал", es: "cal" },
    week: { en: "Week", ru: "Неделя", es: "Semana" },
  },
  // Dashboard page
  dashboard: {
    welcomeBack: { en: "Welcome back", ru: "С возвращением", es: "Bienvenido de vuelta" },
    progressFor7Days: { en: "Here's your progress for the last 7 days", ru: "Ваш прогресс за последние 7 дней", es: "Tu progreso de los últimos 7 días" },
  },
  // Common UI elements
  common: {
    loading: { en: "Loading...", ru: "Загрузка...", es: "Cargando..." },
    error: { en: "Error", ru: "Ошибка", es: "Error" },
    save: { en: "Save", ru: "Сохранить", es: "Guardar" },
    cancel: { en: "Cancel", ru: "Отмена", es: "Cancelar" },
    edit: { en: "Edit", ru: "Редактировать", es: "Editar" },
    delete: { en: "Delete", ru: "Удалить", es: "Eliminar" },
    back: { en: "Back", ru: "Назад", es: "Atrás" },
    next: { en: "Next", ru: "Далее", es: "Siguiente" },
    previous: { en: "Previous", ru: "Назад", es: "Anterior" },
    viewAll: { en: "View all", ru: "Смотреть все", es: "Ver todo" },
    seeMore: { en: "See more", ru: "Показать ещё", es: "Ver más" },
    noData: { en: "No data available", ru: "Нет данных", es: "Sin datos" },
  },
  // Categories/Event types
  categories: {
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    nutrition: { en: "Nutrition", ru: "Питание", es: "Nutrición" },
    workout: { en: "Workout", ru: "Тренировка", es: "Ejercicio" },
    activity: { en: "Activity", ru: "Активность", es: "Actividad" },
    sleep: { en: "Sleep", ru: "Сон", es: "Sueño" },
    mood: { en: "Mood", ru: "Настроение", es: "Estado de ánimo" },
    water: { en: "Water", ru: "Вода", es: "Agua" },
    steps: { en: "Steps", ru: "Шаги", es: "Pasos" },
  },
} as const;

// Helper function to get UI translation
export function getUITranslation(
  section: keyof typeof CLIENT_UI_TRANSLATIONS,
  key: string,
  lang: SupportedLanguage = "en"
): string {
  const sectionData = CLIENT_UI_TRANSLATIONS[section] as Record<string, Record<SupportedLanguage, string>>;
  if (sectionData && sectionData[key]) {
    return sectionData[key][lang] || sectionData[key].en;
  }
  return key;
}

// Coach UI translations for all coach-facing pages
export const COACH_UI_TRANSLATIONS = {
  // Sidebar navigation
  nav: {
    navigation: { en: "Navigation", ru: "Навигация", es: "Navegación" },
    dashboard: { en: "Dashboard", ru: "Главная", es: "Panel" },
    clientManagement: { en: "Client Management", ru: "Управление клиентами", es: "Gestión de Clientes" },
    questionnaires: { en: "Questionnaires", ru: "Анкеты", es: "Cuestionarios" },
    progressAnalytics: { en: "Progress Analytics", ru: "Аналитика прогресса", es: "Análisis de Progreso" },
    calendar: { en: "Calendar", ru: "Календарь", es: "Calendario" },
    chat: { en: "Chat", ru: "Чат", es: "Chat" },
    engagement: { en: "Engagement", ru: "Вовлечённость", es: "Participación" },
    aiInsights: { en: "AI Insights", ru: "AI-инсайты", es: "Insights de IA" },
    clientDataLogs: { en: "Client Data Logs", ru: "Журналы данных", es: "Registros de Datos" },
    predictiveAnalytics: { en: "Predictive Analytics", ru: "Предиктивная аналитика", es: "Análisis Predictivo" },
    settings: { en: "Settings", ru: "Настройки", es: "Configuración" },
    comingSoon: { en: "Coming soon", ru: "Скоро", es: "Próximamente" },
  },
  // Dashboard page
  dashboard: {
    welcomeBack: { en: "Welcome back, Coach!", ru: "С возвращением, Коуч!", es: "¡Bienvenido de vuelta, Coach!" },
    subtitle: { en: "Here's what's happening with your clients today", ru: "Что происходит с вашими клиентами сегодня", es: "Esto es lo que está pasando con tus clientes hoy" },
    totalClients: { en: "Total Clients", ru: "Всего клиентов", es: "Clientes Totales" },
    activePrograms: { en: "Active Programs", ru: "Активные программы", es: "Programas Activos" },
    thisWeekSessions: { en: "This Week Sessions", ru: "Сессий на этой неделе", es: "Sesiones Esta Semana" },
    unreadMessages: { en: "Unread Messages", ru: "Непрочитанные сообщения", es: "Mensajes Sin Leer" },
    avgClientProgress: { en: "Avg. Client Progress", ru: "Средний прогресс клиентов", es: "Progreso Promedio" },
    completionRate: { en: "Completion Rate", ru: "Коэффициент завершения", es: "Tasa de Finalización" },
    recentClientActivity: { en: "Recent Client Activity", ru: "Недавняя активность клиентов", es: "Actividad Reciente" },
    upcomingSessions: { en: "Upcoming Sessions", ru: "Предстоящие сессии", es: "Próximas Sesiones" },
    viewAll: { en: "View All", ru: "Смотреть все", es: "Ver Todo" },
    viewCalendar: { en: "View Calendar", ru: "Открыть календарь", es: "Ver Calendario" },
    noClientsYet: { en: "No clients yet. Add your first client to get started.", ru: "Пока нет клиентов. Добавьте первого клиента.", es: "Aún no hay clientes. Añade tu primer cliente." },
    noUpcomingSessions: { en: "No upcoming sessions scheduled.", ru: "Нет запланированных сессий.", es: "No hay sesiones programadas." },
    scheduleNewSession: { en: "Schedule New Session", ru: "Запланировать сессию", es: "Programar Nueva Sesión" },
    quickActions: { en: "Quick Actions", ru: "Быстрые действия", es: "Acciones Rápidas" },
    manageClients: { en: "Manage Clients", ru: "Управление клиентами", es: "Gestionar Clientes" },
    createQuestionnaire: { en: "Create Questionnaire", ru: "Создать анкету", es: "Crear Cuestionario" },
    messageClients: { en: "Message Clients", ru: "Написать клиентам", es: "Mensajear Clientes" },
    viewAIInsights: { en: "View AI Insights", ru: "Смотреть AI-инсайты", es: "Ver Insights de IA" },
    // Status labels
    excellent: { en: "Excellent", ru: "Отлично", es: "Excelente" },
    onTrack: { en: "On Track", ru: "В норме", es: "En Camino" },
    needsAttention: { en: "Needs Attention", ru: "Требует внимания", es: "Requiere Atención" },
    gettingStarted: { en: "Getting Started", ru: "Начинает", es: "Comenzando" },
    new: { en: "New", ru: "Новый", es: "Nuevo" },
    // Time labels
    today: { en: "Today", ru: "Сегодня", es: "Hoy" },
    tomorrow: { en: "Tomorrow", ru: "Завтра", es: "Mañana" },
    justNow: { en: "Just now", ru: "Только что", es: "Ahora mismo" },
    minAgo: { en: "min ago", ru: "мин назад", es: "min antes" },
    hourAgo: { en: "hour ago", ru: "час назад", es: "hora antes" },
    hoursAgo: { en: "hours ago", ru: "часов назад", es: "horas antes" },
    dayAgo: { en: "day ago", ru: "день назад", es: "día antes" },
    daysAgo: { en: "days ago", ru: "дней назад", es: "días antes" },
    never: { en: "Never", ru: "Никогда", es: "Nunca" },
    active: { en: "Active", ru: "Активен", es: "Activo" },
    // Session types
    videoCall: { en: "Video Call", ru: "Видеозвонок", es: "Videollamada" },
    inPerson: { en: "In-Person", ru: "Очно", es: "Presencial" },
    followUp: { en: "Follow-up", ru: "Повторный", es: "Seguimiento" },
    initialConsultation: { en: "Initial Consultation", ru: "Первичная консультация", es: "Consulta Inicial" },
    checkIn: { en: "Check-in", ru: "Проверка", es: "Verificación" },
    assessment: { en: "Assessment", ru: "Оценка", es: "Evaluación" },
    coaching: { en: "Coaching", ru: "Коучинг", es: "Coaching" },
    session: { en: "Session", ru: "Сессия", es: "Sesión" },
  },
  // Clients page
  clients: {
    title: { en: "Client Management", ru: "Управление клиентами", es: "Gestión de Clientes" },
    subtitle: { en: "Manage your coaching clients and track their progress", ru: "Управляйте клиентами и отслеживайте их прогресс", es: "Gestione sus clientes y siga su progreso" },
    searchPlaceholder: { en: "Search clients...", ru: "Поиск клиентов...", es: "Buscar clientes..." },
    addClient: { en: "Add Client", ru: "Добавить клиента", es: "Añadir Cliente" },
    newClient: { en: "New Client", ru: "Новый клиент", es: "Nuevo Cliente" },
    inviteClient: { en: "Invite Client", ru: "Пригласить клиента", es: "Invitar Cliente" },
    sendClientInvite: { en: "Send Client Invite", ru: "Отправить приглашение клиенту", es: "Enviar Invitación al Cliente" },
    inviteDescription: { en: "Create a personalized invite link for your client to complete their onboarding", ru: "Создайте персональную ссылку-приглашение для регистрации клиента", es: "Cree un enlace de invitación personalizado para que su cliente complete su registro" },
    new: { en: "New", ru: "Новый", es: "Nuevo" },
    editClient: { en: "Edit Client", ru: "Редактировать клиента", es: "Editar Cliente" },
    deleteClient: { en: "Delete Client", ru: "Удалить клиента", es: "Eliminar Cliente" },
    viewProfile: { en: "View Profile", ru: "Смотреть профиль", es: "Ver Perfil" },
    sendMessage: { en: "Send Message", ru: "Отправить сообщение", es: "Enviar Mensaje" },
    // Filters
    all: { en: "All", ru: "Все", es: "Todos" },
    activeClients: { en: "Active", ru: "Активные", es: "Activos" },
    ended: { en: "Ended", ru: "Завершённые", es: "Terminados" },
    sortBy: { en: "Sort by", ru: "Сортировать по", es: "Ordenar por" },
    dateAdded: { en: "Date Added", ru: "Дата добавления", es: "Fecha de Añadido" },
    name: { en: "Name", ru: "Имя", es: "Nombre" },
    endDate: { en: "End Date", ru: "Дата окончания", es: "Fecha de Fin" },
    // Form fields
    email: { en: "Email", ru: "Email", es: "Correo Electrónico" },
    phone: { en: "Phone", ru: "Телефон", es: "Teléfono" },
    goals: { en: "Goals", ru: "Цели", es: "Objetivos" },
    notes: { en: "Notes", ru: "Заметки", es: "Notas" },
    status: { en: "Status", ru: "Статус", es: "Estado" },
    age: { en: "Age", ru: "Возраст", es: "Edad" },
    sex: { en: "Sex", ru: "Пол", es: "Sexo" },
    height: { en: "Height", ru: "Рост", es: "Altura" },
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    targetWeight: { en: "Target Weight", ru: "Целевой вес", es: "Peso Objetivo" },
    activityLevel: { en: "Activity Level", ru: "Уровень активности", es: "Nivel de Actividad" },
    language: { en: "Language", ru: "Язык", es: "Idioma" },
    preferredLanguage: { en: "Preferred Language", ru: "Предпочитаемый язык", es: "Idioma Preferido" },
    // Invite
    inviteLink: { en: "Invite Link", ru: "Ссылка-приглашение", es: "Enlace de Invitación" },
    copyLink: { en: "Copy Link", ru: "Скопировать ссылку", es: "Copiar Enlace" },
    copied: { en: "Copied!", ru: "Скопировано!", es: "¡Copiado!" },
    sendInvite: { en: "Send Invite", ru: "Отправить приглашение", es: "Enviar Invitación" },
    sendQuestionnaire: { en: "Send questionnaire", ru: "Отправить анкету", es: "Enviar cuestionario" },
    addClientAndInvite: { en: "Add Client & Send Invite", ru: "Добавить и отправить", es: "Añadir y Enviar" },
    resendInvite: { en: "Resend Invite", ru: "Отправить повторно", es: "Reenviar Invitación" },
    // Client card
    progress: { en: "Progress", ru: "Прогресс", es: "Progreso" },
    lastActive: { en: "Last Active", ru: "Последняя активность", es: "Última Actividad" },
    joined: { en: "Joined", ru: "Присоединился", es: "Se Unió" },
    // Messages
    clientAdded: { en: "Client added successfully", ru: "Клиент добавлен", es: "Cliente añadido" },
    clientUpdated: { en: "Client updated successfully", ru: "Клиент обновлён", es: "Cliente actualizado" },
    clientDeleted: { en: "Client deleted successfully", ru: "Клиент удалён", es: "Cliente eliminado" },
    inviteSent: { en: "Invite sent successfully", ru: "Приглашение отправлено", es: "Invitación enviada" },
    noClients: { en: "No clients found", ru: "Клиенты не найдены", es: "No se encontraron clientes" },
    wellnessPlanDetails: { en: "Wellness Plan Details", ru: "Детали плана оздоровления", es: "Detalles del Plan de Bienestar" },
    wellnessPlanHelp: { en: "This information helps create personalized AI-powered wellness plans", ru: "Эта информация помогает создать персонализированные AI-планы оздоровления", es: "Esta información ayuda a crear planes de bienestar personalizados con IA" },
    occupation: { en: "Occupation", ru: "Занятость", es: "Ocupación" },
    timeframe: { en: "Goal Timeframe", ru: "Срок достижения цели", es: "Plazo del Objetivo" },
    trainingExperience: { en: "Training Experience", ru: "Опыт тренировок", es: "Experiencia de Entrenamiento" },
    equipmentAccess: { en: "Equipment Access", ru: "Доступ к оборудованию", es: "Acceso a Equipos" },
    medicalNotes: { en: "Medical Notes / Limitations", ru: "Медицинские записи / Ограничения", es: "Notas Médicas / Limitaciones" },
    currentHabits: { en: "Current Habits", ru: "Текущие привычки", es: "Hábitos Actuales" },
    preferences: { en: "Preferences", ru: "Предпочтения", es: "Preferencias" },
    beginner: { en: "Beginner", ru: "Начинающий", es: "Principiante" },
    intermediate: { en: "Intermediate", ru: "Средний", es: "Intermedio" },
    advanced: { en: "Advanced", ru: "Продвинутый", es: "Avanzado" },
    returningAfterBreak: { en: "Returning after break", ru: "Возвращающийся после перерыва", es: "Regresando después de un descanso" },
  },
  // Client detail page
  clientDetail: {
    // Tab names
    overview: { en: "Overview", ru: "Обзор", es: "Resumen" },
    logs: { en: "Logs", ru: "Журналы", es: "Registros" },
    goalsTab: { en: "Goals", ru: "Цели", es: "Objetivos" },
    intake: { en: "Intake", ru: "Анкеты", es: "Ingreso" },
    plan: { en: "Plan", ru: "План", es: "Plan" },
    planBuilder: { en: "Plan Builder", ru: "Конструктор плана", es: "Constructor de Plan" },
    progress: { en: "Progress", ru: "Прогресс", es: "Progreso" },
    photos: { en: "Photos", ru: "Фото", es: "Fotos" },
    settingsTab: { en: "Settings", ru: "Настройки", es: "Configuración" },
    // Navigation
    clients: { en: "Clients", ru: "Клиенты", es: "Clientes" },
    backToClients: { en: "Back to Clients", ru: "Назад к клиентам", es: "Volver a Clientes" },
    clientNotFound: { en: "Client not found", ru: "Клиент не найден", es: "Cliente no encontrado" },
    // Client status
    noPortalAccess: { en: "No portal access", ru: "Нет доступа к порталу", es: "Sin acceso al portal" },
    sendPortalInvite: { en: "Send Portal Invite", ru: "Отправить приглашение", es: "Enviar Invitación al Portal" },
    // Overview section
    contactInfo: { en: "Contact Information", ru: "Контактная информация", es: "Información de Contacto" },
    goalInfo: { en: "Goal Information", ru: "Информация о цели", es: "Información del Objetivo" },
    healthMetrics: { en: "Health Metrics", ru: "Показатели здоровья", es: "Métricas de Salud" },
    physicalStats: { en: "Physical Stats", ru: "Физические данные", es: "Estadísticas Físicas" },
    goalsPreferences: { en: "Goals & Preferences", ru: "Цели и предпочтения", es: "Objetivos y Preferencias" },
    notes: { en: "Notes", ru: "Заметки", es: "Notas" },
    // Contact fields
    email: { en: "Email", ru: "Эл. почта", es: "Correo" },
    phone: { en: "Phone", ru: "Телефон", es: "Teléfono" },
    joined: { en: "Joined", ru: "Присоединился", es: "Se Unió" },
    programEndDate: { en: "Program End Date", ru: "Дата окончания программы", es: "Fecha de Fin del Programa" },
    lastSession: { en: "Last Session", ru: "Последняя сессия", es: "Última Sesión" },
    ended: { en: "(Ended)", ru: "(Завершено)", es: "(Terminado)" },
    // Goal fields
    primaryGoal: { en: "Primary Goal", ru: "Основная цель", es: "Objetivo Principal" },
    noGoalSet: { en: "No goal set", ru: "Цель не указана", es: "Sin objetivo" },
    targetWeight: { en: "Target Weight", ru: "Целевой вес", es: "Peso Objetivo" },
    targetBodyFat: { en: "Target Body Fat", ru: "Целевой % жира", es: "Grasa Corporal Objetivo" },
    memberSince: { en: "Member since", ru: "Участник с", es: "Miembro desde" },
    currentWeight: { en: "Current Weight", ru: "Текущий вес", es: "Peso Actual" },
    startWeight: { en: "Start Weight", ru: "Начальный вес", es: "Peso Inicial" },
    goalWeight: { en: "Goal Weight", ru: "Целевой вес", es: "Peso Objetivo" },
    // Health metrics fields
    sex: { en: "Sex", ru: "Пол", es: "Sexo" },
    age: { en: "Age", ru: "Возраст", es: "Edad" },
    years: { en: "years", ru: "лет", es: "años" },
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    height: { en: "Height", ru: "Рост", es: "Altura" },
    activityLevel: { en: "Activity Level", ru: "Уровень активности", es: "Nivel de Actividad" },
    bodyFat: { en: "Body Fat", ru: "% жира", es: "Grasa Corporal" },
    // Intake/Questionnaire section
    noQuestionnaireSubmissions: { en: "No questionnaire submissions yet", ru: "Ещё нет заполненных анкет", es: "Sin cuestionarios enviados" },
    clientNotSubmittedQuestionnaires: { en: "This client hasn't submitted any questionnaires", ru: "Этот клиент ещё не заполнил ни одной анкеты", es: "Este cliente no ha enviado ningún cuestionario" },
    questionnaire: { en: "Questionnaire", ru: "Анкета", es: "Cuestionario" },
    pinnedForAI: { en: "Pinned for AI", ru: "Закреплено для AI", es: "Fijado para IA" },
    submitted: { en: "Submitted", ru: "Отправлено", es: "Enviado" },
    unpin: { en: "Unpin", ru: "Открепить", es: "Desfijar" },
    pinForAI: { en: "Pin for AI", ru: "Закрепить для AI", es: "Fijar para IA" },
    viewQuestionsAnswers: { en: "View Questions & Answers", ru: "Вопросы и ответы", es: "Ver Preguntas y Respuestas" },
    // Logs section
    nutrition: { en: "Nutrition", ru: "Питание", es: "Nutrición" },
    workout: { en: "Workout", ru: "Тренировки", es: "Ejercicio" },
    checkIns: { en: "Check-ins", ru: "Отметки", es: "Registros" },
    noLogs: { en: "No logs recorded yet", ru: "Записей пока нет", es: "Sin registros todavía" },
    // Goals section
    addGoal: { en: "Add Goal", ru: "Добавить цель", es: "Añadir Objetivo" },
    editGoal: { en: "Edit Goal", ru: "Редактировать цель", es: "Editar Objetivo" },
    deleteGoal: { en: "Delete Goal", ru: "Удалить цель", es: "Eliminar Objetivo" },
    goalTitle: { en: "Goal Title", ru: "Название цели", es: "Título del Objetivo" },
    targetValue: { en: "Target Value", ru: "Целевое значение", es: "Valor Objetivo" },
    currentValue: { en: "Current Value", ru: "Текущее значение", es: "Valor Actual" },
    priority: { en: "Priority", ru: "Приоритет", es: "Prioridad" },
    high: { en: "High", ru: "Высокий", es: "Alto" },
    medium: { en: "Medium", ru: "Средний", es: "Medio" },
    low: { en: "Low", ru: "Низкий", es: "Bajo" },
    noGoals: { en: "No goals set yet", ru: "Цели ещё не заданы", es: "Sin objetivos todavía" },
    // Photos section
    progressPhotos: { en: "Progress Photos", ru: "Фото прогресса", es: "Fotos de Progreso" },
    sharedByClient: { en: "Shared by client", ru: "Поделился клиент", es: "Compartido por el cliente" },
    noPhotos: { en: "No photos shared yet", ru: "Фото ещё не добавлены", es: "Sin fotos todavía" },
    // Toast messages
    success: { en: "Success", ru: "Успешно", es: "Éxito" },
    error: { en: "Error", ru: "Ошибка", es: "Error" },
    responsePinUpdated: { en: "Response pin status updated", ru: "Статус закрепления обновлён", es: "Estado de fijación actualizado" },
    failedPinUpdate: { en: "Failed to update pin status", ru: "Не удалось обновить статус закрепления", es: "Error al actualizar el estado de fijación" },
    pdfDownloadSuccess: { en: "PDF downloaded successfully", ru: "PDF успешно загружен", es: "PDF descargado correctamente" },
    failedGeneratePdf: { en: "Failed to generate PDF", ru: "Не удалось создать PDF", es: "Error al generar PDF" },
    inviteSent: { en: "Invite Sent", ru: "Приглашение отправлено", es: "Invitación Enviada" },
    accountSetupEmailSent: { en: "Account setup email has been sent to the client", ru: "Клиенту отправлено письмо для настройки аккаунта", es: "Se ha enviado el correo de configuración al cliente" },
    failedSendInvite: { en: "Failed to send invite", ru: "Не удалось отправить приглашение", es: "Error al enviar la invitación" },
    // Common values
    yes: { en: "Yes", ru: "Да", es: "Sí" },
    no: { en: "No", ru: "Нет", es: "No" },
  },
  // Communication page
  communication: {
    title: { en: "Chat", ru: "Чат", es: "Chat" },
    subtitle: { en: "Message your clients and manage conversations", ru: "Общайтесь с клиентами и управляйте разговорами", es: "Envía mensajes a tus clientes y gestiona conversaciones" },
    messages: { en: "Messages", ru: "Сообщения", es: "Mensajes" },
    selectClient: { en: "Select a client to start messaging", ru: "Выберите клиента для начала переписки", es: "Selecciona un cliente para chatear" },
    typeMessage: { en: "Type a message...", ru: "Введите сообщение...", es: "Escribe un mensaje..." },
    send: { en: "Send", ru: "Отправить", es: "Enviar" },
    noMessages: { en: "No messages yet. Start the conversation!", ru: "Сообщений пока нет. Начните разговор!", es: "Sin mensajes todavía. ¡Inicia la conversación!" },
    startConversation: { en: "Start a conversation", ru: "Начните разговор", es: "Inicia una conversación" },
    attachment: { en: "Attachment", ru: "Вложение", es: "Adjunto" },
    addAttachment: { en: "Add attachment", ru: "Добавить вложение", es: "Añadir adjunto" },
    attachFile: { en: "Attach File", ru: "Прикрепить файл", es: "Adjuntar archivo" },
    aiSuggestions: { en: "AI Suggestions", ru: "AI-предложения", es: "Sugerencias de IA" },
    sendSuggestion: { en: "Send", ru: "Отправить", es: "Enviar" },
    editSuggestion: { en: "Edit", ru: "Редактировать", es: "Editar" },
    searchClients: { en: "Search clients...", ru: "Поиск клиентов...", es: "Buscar clientes..." },
    noClientsFound: { en: "No clients found", ru: "Клиенты не найдены", es: "No se encontraron clientes" },
    loadingConversations: { en: "Loading conversations...", ru: "Загрузка разговоров...", es: "Cargando conversaciones..." },
    failedToLoad: { en: "Failed to load conversations", ru: "Не удалось загрузить разговоры", es: "Error al cargar conversaciones" },
    refreshPage: { en: "Please try refreshing the page", ru: "Попробуйте обновить страницу", es: "Por favor, intente actualizar la página" },
    selectClientFirst: { en: "Please select a client first", ru: "Сначала выберите клиента", es: "Por favor, seleccione un cliente primero" },
    enterMessageOrFile: { en: "Please enter a message or attach a file", ru: "Введите сообщение или прикрепите файл", es: "Por favor, ingrese un mensaje o adjunte un archivo" },
    dragDropHint: { en: "Drop files here or click to attach", ru: "Перетащите файлы сюда или нажмите, чтобы прикрепить", es: "Suelta archivos aquí o haz clic para adjuntar" },
    fileAttachment: { en: "File attachment", ru: "Файл-вложение", es: "Archivo adjunto" },
  },
  // Scheduling page
  scheduling: {
    title: { en: "Smart Scheduling", ru: "Умное расписание", es: "Programación Inteligente" },
    subtitle: { en: "Manage your coaching sessions and appointments", ru: "Управляйте сессиями коучинга и встречами", es: "Gestiona tus sesiones de coaching y citas" },
    scheduleSession: { en: "Schedule Session", ru: "Запланировать сессию", es: "Programar Sesión" },
    newSession: { en: "New Session", ru: "Новая сессия", es: "Nueva Sesión" },
    bookNewSession: { en: "Book New Session", ru: "Забронировать сессию", es: "Reservar Nueva Sesión" },
    editSession: { en: "Edit Session", ru: "Редактировать сессию", es: "Editar Sesión" },
    cancelSession: { en: "Cancel Session", ru: "Отменить сессию", es: "Cancelar Sesión" },
    deleteSession: { en: "Delete Session", ru: "Удалить сессию", es: "Eliminar Sesión" },
    sessionDetails: { en: "Session Details", ru: "Детали сессии", es: "Detalles de la Sesión" },
    // Form fields
    client: { en: "Client", ru: "Клиент", es: "Cliente" },
    selectClient: { en: "Select a client", ru: "Выберите клиента", es: "Seleccionar cliente" },
    date: { en: "Date", ru: "Дата", es: "Fecha" },
    time: { en: "Time", ru: "Время", es: "Hora" },
    startTime: { en: "Start Time", ru: "Время начала", es: "Hora de Inicio" },
    selectTime: { en: "Select time", ru: "Выберите время", es: "Seleccionar hora" },
    endTime: { en: "End Time", ru: "Время окончания", es: "Hora de Fin" },
    duration: { en: "Duration", ru: "Длительность", es: "Duración" },
    durationMin: { en: "Duration (min)", ru: "Длительность (мин)", es: "Duración (min)" },
    sessionType: { en: "Session Type", ru: "Тип сессии", es: "Tipo de Sesión" },
    selectType: { en: "Select type", ru: "Выберите тип", es: "Seleccionar tipo" },
    locationType: { en: "Location Type", ru: "Тип места", es: "Tipo de Ubicación" },
    selectLocation: { en: "Select location", ru: "Выберите место", es: "Seleccionar ubicación" },
    location: { en: "Location", ru: "Место", es: "Ubicación" },
    notes: { en: "Notes", ru: "Заметки", es: "Notas" },
    notesOptional: { en: "Notes (Optional)", ru: "Заметки (необязательно)", es: "Notas (Opcional)" },
    meetingLink: { en: "Meeting Link", ru: "Ссылка на встречу", es: "Enlace de Reunión" },
    meetingLinkOptional: { en: "Meeting Link (Optional)", ru: "Ссылка на встречу (необязательно)", es: "Enlace de Reunión (Opcional)" },
    joinMeeting: { en: "Join Meeting", ru: "Присоединиться к встрече", es: "Unirse a la Reunión" },
    // Location types
    videoCall: { en: "Video Call", ru: "Видеозвонок", es: "Videollamada" },
    video: { en: "Video", ru: "Видео", es: "Video" },
    phoneCall: { en: "Phone Call", ru: "Телефонный звонок", es: "Llamada Telefónica" },
    phone: { en: "Phone", ru: "Телефон", es: "Teléfono" },
    inPerson: { en: "In-Person", ru: "Лично", es: "Presencial" },
    // Session types
    consultation: { en: "Consultation", ru: "Консультация", es: "Consulta" },
    followUp: { en: "Follow-up", ru: "Повторная сессия", es: "Seguimiento" },
    checkIn: { en: "Check-in", ru: "Чек-ин", es: "Revisión" },
    other: { en: "Other", ru: "Другое", es: "Otro" },
    // Status
    status: { en: "Status", ru: "Статус", es: "Estado" },
    scheduled: { en: "Scheduled", ru: "Запланирована", es: "Programada" },
    completed: { en: "Completed", ru: "Завершена", es: "Completada" },
    cancelled: { en: "Cancelled", ru: "Отменена", es: "Cancelada" },
    noShow: { en: "No Show", ru: "Не явился", es: "No Asistió" },
    // Messages
    success: { en: "Success", ru: "Успешно", es: "Éxito" },
    error: { en: "Error", ru: "Ошибка", es: "Error" },
    sessionCreated: { en: "Session booked successfully", ru: "Сессия успешно забронирована", es: "Sesión reservada con éxito" },
    sessionUpdated: { en: "Session updated successfully", ru: "Сессия успешно обновлена", es: "Sesión actualizada con éxito" },
    sessionDeleted: { en: "Session deleted successfully", ru: "Сессия успешно удалена", es: "Sesión eliminada con éxito" },
    failedToCreate: { en: "Failed to book session", ru: "Не удалось забронировать сессию", es: "Error al reservar la sesión" },
    failedToUpdate: { en: "Failed to update session", ru: "Не удалось обновить сессию", es: "Error al actualizar la sesión" },
    failedToDelete: { en: "Failed to delete session", ru: "Не удалось удалить сессию", es: "Error al eliminar la sesión" },
    noSessions: { en: "No sessions scheduled for this day", ru: "На этот день сессий нет", es: "Sin sesiones programadas" },
    noUpcomingSessions: { en: "No upcoming sessions", ru: "Нет предстоящих сессий", es: "Sin sesiones próximas" },
    // Calendar
    today: { en: "Today", ru: "Сегодня", es: "Hoy" },
    weekView: { en: "Week", ru: "Неделя", es: "Semana" },
    monthView: { en: "Month", ru: "Месяц", es: "Mes" },
    previousMonth: { en: "Previous month", ru: "Предыдущий месяц", es: "Mes anterior" },
    nextMonth: { en: "Next month", ru: "Следующий месяц", es: "Mes siguiente" },
    upcomingSessions: { en: "Upcoming Sessions", ru: "Предстоящие сессии", es: "Próximas Sesiones" },
    // Actions
    cancel: { en: "Cancel", ru: "Отмена", es: "Cancelar" },
    close: { en: "Close", ru: "Закрыть", es: "Cerrar" },
    edit: { en: "Edit", ru: "Редактировать", es: "Editar" },
    delete: { en: "Delete", ru: "Удалить", es: "Eliminar" },
    bookSession: { en: "Book Session", ru: "Забронировать сессию", es: "Reservar Sesión" },
    booking: { en: "Booking...", ru: "Бронирование...", es: "Reservando..." },
    saveChanges: { en: "Save Changes", ru: "Сохранить изменения", es: "Guardar Cambios" },
    saving: { en: "Saving...", ru: "Сохранение...", es: "Guardando..." },
    deleting: { en: "Deleting...", ru: "Удаление...", es: "Eliminando..." },
    loading: { en: "Loading...", ru: "Загрузка...", es: "Cargando..." },
    // Delete confirmation
    deleteConfirmTitle: { en: "Delete Session", ru: "Удалить сессию", es: "Eliminar Sesión" },
    deleteConfirmDescription: { en: "Are you sure you want to delete this session? This action cannot be undone.", ru: "Вы уверены, что хотите удалить эту сессию? Это действие нельзя отменить.", es: "¿Estás seguro de que deseas eliminar esta sesión? Esta acción no se puede deshacer." },
    // Units
    min: { en: "min", ru: "мин", es: "min" },
    more: { en: "more", ru: "ещё", es: "más" },
    // Day names
    mon: { en: "Mon", ru: "Пн", es: "Lun" },
    tue: { en: "Tue", ru: "Вт", es: "Mar" },
    wed: { en: "Wed", ru: "Ср", es: "Mié" },
    thu: { en: "Thu", ru: "Чт", es: "Jue" },
    fri: { en: "Fri", ru: "Пт", es: "Vie" },
    sat: { en: "Sat", ru: "Сб", es: "Sáb" },
    sun: { en: "Sun", ru: "Вс", es: "Dom" },
  },
  // Questionnaires page
  questionnaires: {
    title: { en: "Questionnaires", ru: "Анкеты", es: "Cuestionarios" },
    subtitle: { en: "Create and manage client intake forms", ru: "Создавайте и управляйте анкетами для клиентов", es: "Crea y gestiona formularios de admisión" },
    createNew: { en: "Create New", ru: "Создать", es: "Crear Nuevo" },
    newQuestionnaire: { en: "New Questionnaire", ru: "Новая анкета", es: "Nuevo Cuestionario" },
    editQuestionnaire: { en: "Edit Questionnaire", ru: "Редактировать анкету", es: "Editar Cuestionario" },
    deleteQuestionnaire: { en: "Delete Questionnaire", ru: "Удалить анкету", es: "Eliminar Cuestionario" },
    duplicateQuestionnaire: { en: "Duplicate", ru: "Дублировать", es: "Duplicar" },
    preview: { en: "Preview", ru: "Предпросмотр", es: "Vista Previa" },
    edit: { en: "Edit", ru: "Редактировать", es: "Editar" },
    restore: { en: "Restore", ru: "Восстановить", es: "Restaurar" },
    deletePermanently: { en: "Delete Permanently", ru: "Удалить навсегда", es: "Eliminar Permanentemente" },
    // Status
    draft: { en: "Draft", ru: "Черновик", es: "Borrador" },
    published: { en: "Published", ru: "Опубликована", es: "Publicado" },
    archived: { en: "Archived", ru: "В архиве", es: "Archivado" },
    active: { en: "Active", ru: "Активные", es: "Activos" },
    all: { en: "All", ru: "Все", es: "Todos" },
    // Table headers
    name: { en: "Name", ru: "Название", es: "Nombre" },
    status: { en: "Status", ru: "Статус", es: "Estado" },
    sentTo: { en: "Sent To", ru: "Отправлено", es: "Enviado a" },
    lastUpdated: { en: "Last Updated", ru: "Обновлено", es: "Última Actualización" },
    archivedAt: { en: "Archived At", ru: "Архивировано", es: "Archivado" },
    actions: { en: "Actions", ru: "Действия", es: "Acciones" },
    filterByStatus: { en: "Filter by status", ru: "Фильтр по статусу", es: "Filtrar por estado" },
    activeQuestionnaires: { en: "Active Questionnaires", ru: "Активные анкеты", es: "Cuestionarios Activos" },
    archivedQuestionnaires: { en: "Archived Questionnaires", ru: "Архивные анкеты", es: "Cuestionarios Archivados" },
    noActiveQuestionnaires: { en: "No active questionnaires found", ru: "Активные анкеты не найдены", es: "No se encontraron cuestionarios activos" },
    noArchivedQuestionnaires: { en: "No archived questionnaires", ru: "Нет архивных анкет", es: "Sin cuestionarios archivados" },
    noDraftQuestionnaires: { en: "No draft questionnaires found", ru: "Черновики не найдены", es: "No se encontraron borradores" },
    noPublishedQuestionnaires: { en: "No published questionnaires found", ru: "Опубликованные анкеты не найдены", es: "No se encontraron cuestionarios publicados" },
    createFirstQuestionnaire: { en: "Create your first intake form to onboard clients faster.", ru: "Создайте первую анкету для быстрой регистрации клиентов.", es: "Crea tu primer formulario para incorporar clientes más rápido." },
    createQuestionnaire: { en: "Create Questionnaire", ru: "Создать анкету", es: "Crear Cuestionario" },
    // Delete/Archive dialogs
    deleteConfirmTitle: { en: "Delete Questionnaire", ru: "Удалить анкету", es: "Eliminar Cuestionario" },
    deleteConfirmUsed: { en: "This questionnaire has been sent to {count} client(s). It will be archived instead of deleted to preserve client responses.", ru: "Эта анкета была отправлена {count} клиенту(ам). Она будет архивирована для сохранения ответов клиентов.", es: "Este cuestionario se ha enviado a {count} cliente(s). Se archivará en lugar de eliminarse para preservar las respuestas." },
    deleteConfirmUnused: { en: "Are you sure you want to delete \"{name}\"? This action cannot be undone.", ru: "Вы уверены, что хотите удалить \"{name}\"? Это действие нельзя отменить.", es: "¿Estás seguro de que deseas eliminar \"{name}\"? Esta acción no se puede deshacer." },
    archiveConfirmTitle: { en: "Archive Questionnaire", ru: "Архивировать анкету", es: "Archivar Cuestionario" },
    archiveConfirmDescription: { en: "Are you sure you want to archive \"{name}\"? It will be hidden from the active list but can be restored later.", ru: "Вы уверены, что хотите архивировать \"{name}\"? Она будет скрыта из активного списка, но может быть восстановлена.", es: "¿Estás seguro de que deseas archivar \"{name}\"? Se ocultará de la lista activa pero se puede restaurar." },
    cancel: { en: "Cancel", ru: "Отмена", es: "Cancelar" },
    loading: { en: "Loading...", ru: "Загрузка...", es: "Cargando..." },
    success: { en: "Success", ru: "Успешно", es: "Éxito" },
    error: { en: "Error", ru: "Ошибка", es: "Error" },
    questionnaireArchived: { en: "Questionnaire Archived", ru: "Анкета архивирована", es: "Cuestionario Archivado" },
    archivedInsteadOfDeleted: { en: "This questionnaire was sent to clients and has been archived instead of deleted.", ru: "Эта анкета была отправлена клиентам и архивирована вместо удаления.", es: "Este cuestionario fue enviado a clientes y se archivó en lugar de eliminarse." },
    publishedSuccessfully: { en: "Questionnaire published successfully", ru: "Анкета успешно опубликована", es: "Cuestionario publicado exitosamente" },
    archivedSuccessfully: { en: "Questionnaire archived successfully", ru: "Анкета успешно архивирована", es: "Cuestionario archivado exitosamente" },
    restoredSuccessfully: { en: "Questionnaire restored successfully", ru: "Анкета успешно восстановлена", es: "Cuestionario restaurado exitosamente" },
    deletedSuccessfully: { en: "Questionnaire deleted successfully", ru: "Анкета успешно удалена", es: "Cuestionario eliminado exitosamente" },
    duplicatedSuccessfully: { en: "Questionnaire duplicated successfully", ru: "Анкета успешно продублирована", es: "Cuestionario duplicado exitosamente" },
    failedToPublish: { en: "Failed to publish questionnaire", ru: "Не удалось опубликовать анкету", es: "Error al publicar cuestionario" },
    failedToArchive: { en: "Failed to archive questionnaire", ru: "Не удалось архивировать анкету", es: "Error al archivar cuestionario" },
    failedToRestore: { en: "Failed to restore questionnaire", ru: "Не удалось восстановить анкету", es: "Error al restaurar cuestionario" },
    failedToDelete: { en: "Failed to delete questionnaire", ru: "Не удалось удалить анкету", es: "Error al eliminar cuestionario" },
    failedToDuplicate: { en: "Failed to duplicate questionnaire", ru: "Не удалось продублировать анкету", es: "Error al duplicar cuestionario" },
    // Builder
    formSettings: { en: "Form Settings", ru: "Настройки формы", es: "Configuración del Formulario" },
    configureDetails: { en: "Configure your questionnaire details", ru: "Настройте детали анкеты", es: "Configura los detalles de tu cuestionario" },
    formName: { en: "Form Name", ru: "Название формы", es: "Nombre del Formulario" },
    welcomeText: { en: "Welcome Text (Optional)", ru: "Приветственный текст (необязательно)", es: "Texto de Bienvenida (Opcional)" },
    consentText: { en: "Consent Text (Optional)", ru: "Текст согласия (необязательно)", es: "Texto de Consentimiento (Opcional)" },
    requireConsent: { en: "Require Consent", ru: "Требовать согласие", es: "Requerir Consentimiento" },
    consentDescription: { en: "Clients must agree to consent text before submitting", ru: "Клиенты должны согласиться перед отправкой", es: "Los clientes deben aceptar antes de enviar" },
    confirmationMessage: { en: "Confirmation Message", ru: "Сообщение подтверждения", es: "Mensaje de Confirmación" },
    defaultClientInfo: { en: "Default Client Information", ru: "Информация о клиенте по умолчанию", es: "Información del Cliente Predeterminada" },
    nameEmailRequired: { en: "Name and Email are required. Phone is optional.", ru: "Имя и Email обязательны. Телефон необязателен.", es: "Nombre y Email son requeridos. Teléfono es opcional." },
    clientName: { en: "Client Name", ru: "Имя клиента", es: "Nombre del Cliente" },
    email: { en: "Email", ru: "Email", es: "Correo Electrónico" },
    phone: { en: "Phone", ru: "Телефон", es: "Teléfono" },
    standardHealthMetrics: { en: "Standard Health Metrics", ru: "Стандартные показатели здоровья", es: "Métricas de Salud Estándar" },
    enableHealthFields: { en: "Enable optional health-related fields for your intake form", ru: "Включите необязательные поля здоровья для анкеты", es: "Habilita campos opcionales de salud para tu formulario" },
    sex: { en: "Sex", ru: "Пол", es: "Sexo" },
    sexDescription: { en: "Gender identification (Male, Female, Other, Prefer not to say)", ru: "Пол (Мужской, Женский, Другой, Не указывать)", es: "Identificación de género (Masculino, Femenino, Otro, Prefiero no decir)" },
    age: { en: "Age", ru: "Возраст", es: "Edad" },
    ageDescription: { en: "Client's current age in years", ru: "Текущий возраст клиента в годах", es: "Edad actual del cliente en años" },
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    weightDescription: { en: "Current weight in kg or lbs", ru: "Текущий вес в кг или фунтах", es: "Peso actual en kg o lbs" },
    height: { en: "Height", ru: "Рост", es: "Altura" },
    heightDescription: { en: "Current height in cm or ft/in", ru: "Текущий рост в см или фт/дюймах", es: "Altura actual en cm o pies/pulgadas" },
    activityLevel: { en: "Activity Level", ru: "Уровень активности", es: "Nivel de Actividad" },
    activityLevelDescription: { en: "Physical activity level (Sedentary to Extra Active)", ru: "Уровень физической активности", es: "Nivel de actividad física" },
    bodyFatPercentage: { en: "Body Fat %", ru: "Процент жира", es: "% Grasa Corporal" },
    bodyFatDescription: { en: "Body fat percentage (0-100%)", ru: "Процент жира в теле (0-100%)", es: "Porcentaje de grasa corporal (0-100%)" },
    goal: { en: "Goal", ru: "Цель", es: "Objetivo" },
    goalDescription: { en: "Client's primary fitness or wellness goal", ru: "Основная фитнес или оздоровительная цель клиента", es: "Objetivo principal de fitness o bienestar del cliente" },
    customQuestions: { en: "Custom Questions", ru: "Дополнительные вопросы", es: "Preguntas Personalizadas" },
    addQuestionsDescription: { en: "Add additional questions to your form", ru: "Добавьте дополнительные вопросы в форму", es: "Añade preguntas adicionales a tu formulario" },
    saveDraft: { en: "Save Draft", ru: "Сохранить черновик", es: "Guardar Borrador" },
    saveAsDraft: { en: "Save as Draft", ru: "Сохранить как черновик", es: "Guardar como Borrador" },
    update: { en: "Update", ru: "Обновить", es: "Actualizar" },
    questionLabel: { en: "Question Label", ru: "Текст вопроса", es: "Etiqueta de Pregunta" },
    descriptionOptional: { en: "Description (Optional)", ru: "Описание (необязательно)", es: "Descripción (Opcional)" },
    helperText: { en: "Helper text for this question", ru: "Подсказка для этого вопроса", es: "Texto de ayuda para esta pregunta" },
    enterQuestion: { en: "Enter your question", ru: "Введите ваш вопрос", es: "Ingresa tu pregunta" },
    placeholder: { en: "Placeholder Text", ru: "Текст-подсказка", es: "Texto de Marcador" },
    settings: { en: "Settings", ru: "Настройки", es: "Configuración" },
    minLength: { en: "Min Length", ru: "Мин. длина", es: "Longitud Mín" },
    maxLength: { en: "Max Length", ru: "Макс. длина", es: "Longitud Máx" },
    minSelections: { en: "Min Selections", ru: "Мин. выборов", es: "Selecciones Mín" },
    maxSelections: { en: "Max Selections", ru: "Макс. выборов", es: "Selecciones Máx" },
    allowOther: { en: "Allow \"Other\" option", ru: "Разрешить вариант \"Другое\"", es: "Permitir opción \"Otro\"" },
    unitLabel: { en: "Unit Label (e.g., kg, lbs, cm)", ru: "Единица измерения (кг, фунты, см)", es: "Etiqueta de Unidad (ej., kg, lbs, cm)" },
    min: { en: "Min", ru: "Мин", es: "Mín" },
    max: { en: "Max", ru: "Макс", es: "Máx" },
    step: { en: "Step", ru: "Шаг", es: "Paso" },
    minDate: { en: "Min Date", ru: "Мин. дата", es: "Fecha Mín" },
    maxDate: { en: "Max Date", ru: "Макс. дата", es: "Fecha Máx" },
    allowedFileTypes: { en: "Allowed File Types (comma-separated)", ru: "Разрешённые типы файлов (через запятую)", es: "Tipos de Archivo Permitidos (separados por coma)" },
    maxSize: { en: "Max Size (MB)", ru: "Макс. размер (МБ)", es: "Tamaño Máx (MB)" },
    maxFiles: { en: "Max Files", ru: "Макс. файлов", es: "Máx Archivos" },
    validationError: { en: "Validation Error", ru: "Ошибка валидации", es: "Error de Validación" },
    enterQuestionnaireName: { en: "Please enter a questionnaire name", ru: "Введите название анкеты", es: "Por favor ingresa un nombre para el cuestionario" },
    allQuestionsMustHaveLabel: { en: "All questions must have a label", ru: "Все вопросы должны иметь текст", es: "Todas las preguntas deben tener una etiqueta" },
    questionMustHaveOption: { en: "Question \"{label}\" must have at least one option", ru: "Вопрос \"{label}\" должен иметь хотя бы один вариант", es: "La pregunta \"{label}\" debe tener al menos una opción" },
    savedSuccessfully: { en: "Questionnaire saved successfully", ru: "Анкета успешно сохранена", es: "Cuestionario guardado exitosamente" },
    failedToSave: { en: "Failed to save questionnaire", ru: "Не удалось сохранить анкету", es: "Error al guardar cuestionario" },
    customIntakeForm: { en: "Create a custom intake form for your clients", ru: "Создайте индивидуальную анкету для ваших клиентов", es: "Crea un formulario de admisión personalizado para tus clientes" },
    // Question types
    questionnaireTitle: { en: "Title", ru: "Название", es: "Título" },
    questionnaireDescription: { en: "Description", ru: "Описание", es: "Descripción" },
    addQuestion: { en: "Add Question", ru: "Добавить вопрос", es: "Añadir Pregunta" },
    questionText: { en: "Question", ru: "Вопрос", es: "Pregunta" },
    questionType: { en: "Question Type", ru: "Тип вопроса", es: "Tipo de Pregunta" },
    required: { en: "Required", ru: "Обязательный", es: "Requerido" },
    optional: { en: "Optional", ru: "Необязательный", es: "Opcional" },
    options: { en: "Options", ru: "Варианты", es: "Opciones" },
    addOption: { en: "Add Option", ru: "Добавить вариант", es: "Añadir Opción" },
    saveQuestionnaire: { en: "Save Questionnaire", ru: "Сохранить анкету", es: "Guardar Cuestionario" },
    publish: { en: "Publish", ru: "Опубликовать", es: "Publicar" },
    archive: { en: "Archive", ru: "В архив", es: "Archivar" },
    shortText: { en: "Short Answer", ru: "Краткий ответ", es: "Respuesta Corta" },
    paragraph: { en: "Paragraph", ru: "Абзац", es: "Párrafo" },
    longText: { en: "Long Text", ru: "Длинный текст", es: "Texto Largo" },
    singleChoice: { en: "Single Choice", ru: "Один вариант", es: "Opción Única" },
    multipleChoice: { en: "Multiple Choice", ru: "Несколько вариантов", es: "Opción Múltiple" },
    checkboxes: { en: "Checkboxes", ru: "Флажки", es: "Casillas" },
    dropdown: { en: "Dropdown", ru: "Выпадающий список", es: "Desplegable" },
    number: { en: "Number", ru: "Число", es: "Número" },
    dateType: { en: "Date", ru: "Дата", es: "Fecha" },
    emailType: { en: "Email", ru: "Email", es: "Correo" },
    phoneType: { en: "Phone", ru: "Телефон", es: "Teléfono" },
    fileUpload: { en: "File Upload", ru: "Загрузка файла", es: "Carga de Archivo" },
    scale: { en: "Scale", ru: "Шкала", es: "Escala" },
    yesNo: { en: "Yes/No", ru: "Да/Нет", es: "Sí/No" },
    // Preview page
    previewTitle: { en: "Preview", ru: "Предпросмотр", es: "Vista Previa" },
    howClientsWillSee: { en: "This is how clients will see your form", ru: "Так клиенты увидят вашу форму", es: "Así verán los clientes tu formulario" },
    firstName: { en: "First Name", ru: "Имя", es: "Nombre" },
    lastName: { en: "Last Name", ru: "Фамилия", es: "Apellido" },
    enterFirstName: { en: "Enter your first name", ru: "Введите ваше имя", es: "Ingresa tu nombre" },
    enterLastName: { en: "Enter your last name", ru: "Введите вашу фамилию", es: "Ingresa tu apellido" },
    enterEmail: { en: "Enter your email", ru: "Введите ваш email", es: "Ingresa tu correo" },
    enterPhone: { en: "Enter your phone number", ru: "Введите ваш телефон", es: "Ingresa tu teléfono" },
    selectSex: { en: "Select sex", ru: "Выберите пол", es: "Selecciona sexo" },
    enterAge: { en: "Enter your age", ru: "Введите ваш возраст", es: "Ingresa tu edad" },
    enterWeight: { en: "Enter your weight", ru: "Введите ваш вес", es: "Ingresa tu peso" },
    enterHeight: { en: "Enter your height", ru: "Введите ваш рост", es: "Ingresa tu altura" },
    selectActivityLevel: { en: "Select activity level", ru: "Выберите уровень активности", es: "Selecciona nivel de actividad" },
    enterBodyFat: { en: "Enter your body fat percentage", ru: "Введите процент жира", es: "Ingresa tu porcentaje de grasa" },
    weightLbs: { en: "Weight (lbs)", ru: "Вес (фунты)", es: "Peso (lbs)" },
    heightInches: { en: "Height (inches)", ru: "Рост (дюймы)", es: "Altura (pulgadas)" },
    fileUploadPreview: { en: "File upload (preview only)", ru: "Загрузка файла (только просмотр)", es: "Carga de archivo (solo vista previa)" },
    accepts: { en: "Accepts", ru: "Принимает", es: "Acepta" },
    anyFiles: { en: "any files", ru: "любые файлы", es: "cualquier archivo" },
    selectAnOption: { en: "Select an option", ru: "Выберите вариант", es: "Selecciona una opción" },
    optionsLabel: { en: "Options", ru: "Варианты", es: "Opciones" },
    noneConfigured: { en: "None configured", ru: "Не настроено", es: "No configurado" },
    other: { en: "Other", ru: "Другое", es: "Otro" },
    pleaseSpecify: { en: "Please specify", ru: "Пожалуйста, уточните", es: "Por favor especifica" },
    yourAnswer: { en: "Your answer", ru: "Ваш ответ", es: "Tu respuesta" },
    enterNumber: { en: "Enter a number", ru: "Введите число", es: "Ingresa un número" },
    submitPreviewMode: { en: "Submit (Preview Mode)", ru: "Отправить (режим просмотра)", es: "Enviar (Modo Vista Previa)" },
    questionnaireNotFound: { en: "Questionnaire not found", ru: "Анкета не найдена", es: "Cuestionario no encontrado" },
    // Messages
    saved: { en: "Questionnaire saved", ru: "Анкета сохранена", es: "Cuestionario guardado" },
    publishedMsg: { en: "Questionnaire published", ru: "Анкета опубликована", es: "Cuestionario publicado" },
    deleted: { en: "Questionnaire deleted", ru: "Анкета удалена", es: "Cuestionario eliminado" },
    noQuestionnaires: { en: "No questionnaires yet", ru: "Анкет пока нет", es: "Sin cuestionarios todavía" },
    responses: { en: "responses", ru: "ответов", es: "respuestas" },
  },
  // Plan builder page
  planBuilder: {
    title: { en: "AI Plan Builder", ru: "AI Конструктор планов", es: "Creador de Planes IA" },
    aiAssistant: { en: "AI Assistant", ru: "AI-помощник", es: "Asistente de IA" },
    canvas: { en: "Canvas", ru: "Холст", es: "Lienzo" },
    planCanvas: { en: "Plan Canvas", ru: "Холст плана", es: "Lienzo del Plan" },
    aiChat: { en: "AI Chat", ru: "AI Чат", es: "Chat IA" },
    chat: { en: "Chat", ru: "Чат", es: "Chat" },
    typeMessage: { en: "Ask AI to create plan sections...", ru: "Попросите AI создать разделы плана...", es: "Pide a la IA crear secciones del plan..." },
    send: { en: "Send", ru: "Отправить", es: "Enviar" },
    clearChat: { en: "Clear Chat", ru: "Очистить чат", es: "Limpiar Chat" },
    generatePDF: { en: "Generate PDF", ru: "Создать PDF", es: "Generar PDF" },
    downloadPdf: { en: "Download PDF", ru: "Скачать PDF", es: "Descargar PDF" },
    generating: { en: "Generating...", ru: "Генерация...", es: "Generando..." },
    assignToClient: { en: "Assign to Client", ru: "Назначить клиенту", es: "Asignar a Cliente" },
    assign: { en: "Assign", ru: "Назначить", es: "Asignar" },
    assigning: { en: "Assigning...", ru: "Назначение...", es: "Asignando..." },
    selectTemplate: { en: "Select Template", ru: "Выбрать шаблон", es: "Seleccionar Plantilla" },
    clearCanvas: { en: "Clear Canvas", ru: "Очистить холст", es: "Limpiar Lienzo" },
    // Client selection
    selectClient: { en: "Select a client", ru: "Выберите клиента", es: "Selecciona un cliente" },
    // Plan status
    inProgress: { en: "In Progress", ru: "В работе", es: "En Progreso" },
    planAssignedBadge: { en: "Plan Assigned", ru: "План назначен", es: "Plan Asignado" },
    assigned: { en: "Assigned", ru: "Назначен", es: "Asignado" },
    // Plan type selection
    planType: { en: "Plan Type", ru: "Тип плана", es: "Tipo de Plan" },
    longTerm: { en: "Long-Term", ru: "Долгосрочный", es: "Largo Plazo" },
    weekly: { en: "Weekly", ru: "Недельный", es: "Semanal" },
    selectWeek: { en: "Select Week", ru: "Выбрать неделю", es: "Seleccionar Semana" },
    // Plan name
    planNamePlaceholder: { en: "Plan name (e.g., '12-Week Transformation Plan')", ru: "Название плана (например, '12-недельный план трансформации')", es: "Nombre del plan (ej., 'Plan de Transformación 12 Semanas')" },
    weeklyPlanName: { en: "Weekly plan name", ru: "Название недельного плана", es: "Nombre del plan semanal" },
    planFilename: { en: "Plan filename", ru: "Имя файла плана", es: "Nombre del archivo" },
    // Empty states
    chatWithAI: { en: "Chat with AI to generate plan content", ru: "Чат с AI для создания контента плана", es: "Chatea con IA para generar contenido del plan" },
    askQuestions: { en: "Ask questions, request sections, or get suggestions", ru: "Задавайте вопросы, запрашивайте разделы или получайте предложения", es: "Haz preguntas, solicita secciones u obtén sugerencias" },
    canvasEmpty: { en: "Your plan canvas is empty", ru: "Ваш холст плана пуст", es: "Tu lienzo de plan está vacío" },
    chatToStart: { en: "Chat with AI and click \"Add to Canvas\" to start building", ru: "Общайтесь с AI и нажмите \"Добавить на холст\" чтобы начать", es: "Chatea con IA y haz clic en \"Añadir al Lienzo\" para comenzar" },
    useDropdown: { en: "Or use the dropdown above to add pre-structured sections", ru: "Или используйте меню выше для добавления готовых разделов", es: "O usa el menú desplegable para añadir secciones pre-estructuradas" },
    planContentPlaceholder: { en: "Your plan content will appear here...", ru: "Здесь появится содержимое вашего плана...", es: "El contenido de tu plan aparecerá aquí..." },
    // Actions
    addToCanvas: { en: "Add to Canvas", ru: "Добавить на холст", es: "Añadir al Lienzo" },
    addSection: { en: "Add section...", ru: "Добавить раздел...", es: "Añadir sección..." },
    // Mobile
    mobileCanvasNotice: { en: "Canvas view is not supported on mobile yet. Please use a desktop to build or edit plans.", ru: "Режим холста пока не поддерживается на мобильных. Используйте компьютер для создания или редактирования планов.", es: "La vista del lienzo no está disponible en móvil. Por favor usa una computadora para crear o editar planes." },
    chatToGenerateFirst: { en: "Chat with AI to generate plan content first", ru: "Сначала создайте контент плана через AI чат", es: "Primero genera contenido del plan con el chat IA" },
    // Templates
    workoutPlan: { en: "Workout Plan", ru: "План тренировок", es: "Plan de Ejercicios" },
    mealPlan: { en: "Meal Plan", ru: "План питания", es: "Plan de Comidas" },
    weeklySchedule: { en: "Weekly Schedule", ru: "Недельный план", es: "Horario Semanal" },
    customPlan: { en: "Custom Plan", ru: "Свой план", es: "Plan Personalizado" },
    // Toast messages
    planSaved: { en: "Plan saved", ru: "План сохранён", es: "Plan guardado" },
    planAssigned: { en: "Plan Assigned", ru: "План назначен", es: "Plan Asignado" },
    planAssignedDesc: { en: "The plan has been assigned to the client and is now visible in their portal.", ru: "План назначен клиенту и теперь виден в его портале.", es: "El plan ha sido asignado al cliente y ahora es visible en su portal." },
    pdfGenerated: { en: "PDF generated successfully", ru: "PDF успешно создан", es: "PDF generado exitosamente" },
    addedToCanvas: { en: "Added to canvas", ru: "Добавлено на холст", es: "Añadido al lienzo" },
    contentAdded: { en: "Content added. You can now edit it.", ru: "Контент добавлен. Теперь вы можете его редактировать.", es: "Contenido añadido. Ahora puedes editarlo." },
    success: { en: "Success", ru: "Успешно", es: "Éxito" },
    planSavedSuccess: { en: "Plan saved successfully!", ru: "План успешно сохранён!", es: "¡Plan guardado exitosamente!" },
    planShared: { en: "Plan shared with client!", ru: "План отправлен клиенту!", es: "¡Plan compartido con el cliente!" },
    // Error messages
    error: { en: "Error", ru: "Ошибка", es: "Error" },
    failedAIResponse: { en: "Failed to get AI response. Please try again.", ru: "Не удалось получить ответ AI. Попробуйте снова.", es: "Error al obtener respuesta de IA. Inténtalo de nuevo." },
    enterPlanName: { en: "Please enter a plan name", ru: "Пожалуйста, введите название плана", es: "Por favor ingresa un nombre de plan" },
    addPlanContent: { en: "Please add content to your plan", ru: "Пожалуйста, добавьте контент в план", es: "Por favor añade contenido a tu plan" },
    failedToSave: { en: "Failed to save plan", ru: "Не удалось сохранить план", es: "Error al guardar el plan" },
    failedToGeneratePdf: { en: "Failed to generate PDF", ru: "Не удалось создать PDF", es: "Error al generar PDF" },
    failedToShare: { en: "Failed to share plan", ru: "Не удалось поделиться планом", es: "Error al compartir plan" },
    failedToAssign: { en: "Failed to assign plan", ru: "Не удалось назначить план", es: "Error al asignar plan" },
  },
  // Settings page
  settings: {
    title: { en: "Settings", ru: "Настройки", es: "Configuración" },
    subtitle: { en: "Manage your coach profile and account", ru: "Управляйте профилем и аккаунтом", es: "Gestiona tu perfil y cuenta" },
    profile: { en: "Profile", ru: "Профиль", es: "Perfil" },
    account: { en: "Account", ru: "Аккаунт", es: "Cuenta" },
    accountDescription: { en: "Sign out of your coach account", ru: "Выйти из аккаунта тренера", es: "Cerrar sesión de tu cuenta de entrenador" },
    notifications: { en: "Notifications", ru: "Уведомления", es: "Notificaciones" },
    preferences: { en: "Preferences", ru: "Предпочтения", es: "Preferencias" },
    // Profile fields
    profileInformation: { en: "Profile Information", ru: "Информация профиля", es: "Información del Perfil" },
    profileDescription: { en: "Update your name and contact details", ru: "Обновите имя и контактные данные", es: "Actualiza tu nombre y datos de contacto" },
    name: { en: "Name", ru: "Имя", es: "Nombre" },
    yourName: { en: "Your name", ru: "Ваше имя", es: "Tu nombre" },
    email: { en: "Email", ru: "Email", es: "Correo Electrónico" },
    phone: { en: "Phone Number", ru: "Номер телефона", es: "Número de Teléfono" },
    bio: { en: "Bio", ru: "О себе", es: "Biografía" },
    updateProfile: { en: "Update Profile", ru: "Обновить профиль", es: "Actualizar Perfil" },
    // Password
    changePassword: { en: "Change Password", ru: "Изменить пароль", es: "Cambiar Contraseña" },
    currentPassword: { en: "Current Password", ru: "Текущий пароль", es: "Contraseña Actual" },
    newPassword: { en: "New Password", ru: "Новый пароль", es: "Nueva Contraseña" },
    confirmPassword: { en: "Confirm Password", ru: "Подтвердить пароль", es: "Confirmar Contraseña" },
    // Notifications
    enableNotifications: { en: "Enable Notifications", ru: "Включить уведомления", es: "Activar Notificaciones" },
    disableNotifications: { en: "Disable Notifications", ru: "Отключить уведомления", es: "Desactivar Notificaciones" },
    testNotification: { en: "Test Notification", ru: "Тестовое уведомление", es: "Notificación de Prueba" },
    pushNotifications: { en: "Push Notifications", ru: "Push-уведомления", es: "Notificaciones Push" },
    pushDescription: { en: "Get notified when clients message you", ru: "Получайте уведомления о сообщениях клиентов", es: "Recibe notificaciones cuando los clientes te escriban" },
    emailNotifications: { en: "Email Notifications", ru: "Email-уведомления", es: "Notificaciones por Correo" },
    notSupported: { en: "Not Supported", ru: "Не поддерживается", es: "No Soportado" },
    notSupportedDescription: { en: "Push notifications are not supported on this browser or device", ru: "Push-уведомления не поддерживаются в этом браузере или устройстве", es: "Las notificaciones push no son compatibles con este navegador o dispositivo" },
    status: { en: "Status", ru: "Статус", es: "Estado" },
    enabled: { en: "Enabled", ru: "Включено", es: "Activado" },
    disabled: { en: "Disabled", ru: "Отключено", es: "Desactivado" },
    blocked: { en: "Blocked", ru: "Заблокировано", es: "Bloqueado" },
    notificationsBlocked: { en: "Notifications Blocked", ru: "Уведомления заблокированы", es: "Notificaciones Bloqueadas" },
    notificationsBlockedDescription: { en: "You have blocked notifications for this site. To enable them, click the lock icon in your browser's address bar and allow notifications.", ru: "Вы заблокировали уведомления для этого сайта. Чтобы включить их, нажмите на значок замка в адресной строке браузера и разрешите уведомления.", es: "Has bloqueado las notificaciones para este sitio. Para habilitarlas, haz clic en el icono del candado en la barra de direcciones de tu navegador y permite las notificaciones." },
    // Preferences
    preferredLanguage: { en: "Preferred Language", ru: "Предпочтительный язык", es: "Idioma Preferido" },
    selectLanguage: { en: "Select language", ru: "Выберите язык", es: "Seleccionar idioma" },
    language: { en: "Language", ru: "Язык", es: "Idioma" },
    timezone: { en: "Timezone", ru: "Часовой пояс", es: "Zona Horaria" },
    dateFormat: { en: "Date Format", ru: "Формат даты", es: "Formato de Fecha" },
    units: { en: "Units", ru: "Единицы измерения", es: "Unidades" },
    metric: { en: "Metric (kg, cm)", ru: "Метрические (кг, см)", es: "Métrico (kg, cm)" },
    imperial: { en: "Imperial (lb, in)", ru: "Имперские (фунты, дюймы)", es: "Imperial (lb, in)" },
    // Help & Settings
    helpSettings: { en: "Help & Settings", ru: "Помощь и настройки", es: "Ayuda y Configuración" },
    retakeAppTour: { en: "Retake App Tour", ru: "Пройти обзор приложения снова", es: "Repetir Tour de la App" },
    retakeDescription: { en: "Learn about features and navigation again", ru: "Узнайте о функциях и навигации снова", es: "Aprende sobre las funciones y navegación de nuevo" },
    // Messages
    saveChanges: { en: "Save Changes", ru: "Сохранить изменения", es: "Guardar Cambios" },
    profileUpdated: { en: "Profile updated", ru: "Профиль обновлён", es: "Perfil actualizado" },
    profileUpdatedDescription: { en: "Your profile has been saved successfully.", ru: "Ваш профиль успешно сохранён.", es: "Tu perfil se ha guardado exitosamente." },
    passwordChanged: { en: "Password changed successfully", ru: "Пароль изменён", es: "Contraseña cambiada" },
    settingsSaved: { en: "Settings saved", ru: "Настройки сохранены", es: "Configuración guardada" },
    // Errors
    errorTitle: { en: "Error", ru: "Ошибка", es: "Error" },
    errorUpdateProfile: { en: "Failed to update profile. Please try again.", ru: "Не удалось обновить профиль. Попробуйте снова.", es: "Error al actualizar el perfil. Inténtalo de nuevo." },
    errorLogout: { en: "Failed to log out. Please try again.", ru: "Не удалось выйти. Попробуйте снова.", es: "Error al cerrar sesión. Inténtalo de nuevo." },
    errorTour: { en: "Failed to start app tour. Please try again.", ru: "Не удалось запустить обзор приложения. Попробуйте снова.", es: "Error al iniciar el tour de la app. Inténtalo de nuevo." },
    logOut: { en: "Log Out", ru: "Выйти", es: "Cerrar Sesión" },
    logout: { en: "Logout", ru: "Выйти", es: "Cerrar Sesión" },
  },
  // AI Insights page
  aiInsights: {
    title: { en: "AI Insights", ru: "AI-инсайты", es: "Insights de IA" },
    subtitle: { en: "AI-powered analysis of your clients' progress", ru: "AI-анализ прогресса ваших клиентов", es: "Análisis impulsado por IA del progreso de tus clientes" },
    selectClient: { en: "Select Client", ru: "Выберите клиента", es: "Seleccionar Cliente" },
    allClients: { en: "All Clients", ru: "Все клиенты", es: "Todos los Clientes" },
    refreshInsights: { en: "Refresh Insights", ru: "Обновить инсайты", es: "Actualizar Insights" },
    noInsights: { en: "No insights available yet", ru: "Инсайтов пока нет", es: "Sin insights todavía" },
    needMoreData: { en: "Need more tracking data to generate insights", ru: "Нужно больше данных для анализа", es: "Se necesitan más datos para generar insights" },
    // Trend labels
    improving: { en: "Improving", ru: "Улучшается", es: "Mejorando" },
    declining: { en: "Declining", ru: "Ухудшается", es: "Declinando" },
    stable: { en: "Stable", ru: "Стабильно", es: "Estable" },
    plateau: { en: "Plateau", ru: "Плато", es: "Meseta" },
    // Goal predictions
    ahead: { en: "Ahead of schedule", ru: "Опережает график", es: "Adelantado" },
    onTrackGoal: { en: "On track", ru: "По плану", es: "En camino" },
    behind: { en: "Behind schedule", ru: "Отстаёт", es: "Atrasado" },
    atRisk: { en: "At risk", ru: "Под угрозой", es: "En riesgo" },
    recommendations: { en: "Recommendations", ru: "Рекомендации", es: "Recomendaciones" },
    strengths: { en: "Strengths", ru: "Сильные стороны", es: "Fortalezas" },
    opportunities: { en: "Opportunities", ru: "Возможности для улучшения", es: "Oportunidades" },
  },
  // Analytics page
  analytics: {
    title: { en: "Progress Analytics", ru: "Аналитика прогресса", es: "Análisis de Progreso" },
    subtitle: { en: "Comprehensive client performance insights and metrics", ru: "Комплексные показатели и аналитика прогресса клиентов", es: "Información y métricas completas del rendimiento de clientes" },
    selectClient: { en: "Select Client", ru: "Выберите клиента", es: "Seleccionar Cliente" },
    selectTimeRange: { en: "Select time range", ru: "Выберите период", es: "Seleccionar período" },
    timeRange: { en: "Time Range", ru: "Период", es: "Período" },
    last7Days: { en: "Last 7 days", ru: "Последние 7 дней", es: "Últimos 7 días" },
    last30Days: { en: "Last 30 days", ru: "Последние 30 дней", es: "Últimos 30 días" },
    last90Days: { en: "Last 90 days", ru: "Последние 90 дней", es: "Últimos 90 días" },
    lastYear: { en: "Last year", ru: "Последний год", es: "Último año" },
    allTime: { en: "All time", ru: "Всё время", es: "Todo el tiempo" },
    // Stat cards
    activeClients: { en: "Active Clients", ru: "Активные клиенты", es: "Clientes Activos" },
    totalClients: { en: "total clients", ru: "всего клиентов", es: "clientes totales" },
    averageProgress: { en: "Average Progress", ru: "Средний прогресс", es: "Progreso Promedio" },
    fromLastMonth: { en: "from last month", ru: "с прошлого месяца", es: "desde el mes pasado" },
    sessionCompletion: { en: "Session Completion", ru: "Завершение сессий", es: "Finalización de Sesiones" },
    ofSessions: { en: "of", ru: "из", es: "de" },
    sessions: { en: "sessions", ru: "сессий", es: "sesiones" },
    topPerformers: { en: "Top Performers", ru: "Лучшие результаты", es: "Mejores Resultados" },
    clientsAbove80: { en: "Clients above 80% progress", ru: "Клиенты с прогрессом выше 80%", es: "Clientes con más del 80% de progreso" },
    // Charts
    progressTrendOverTime: { en: "Progress Trend Over Time", ru: "Тренд прогресса во времени", es: "Tendencia de Progreso en el Tiempo" },
    avgClientProgressByMonth: { en: "Average client progress by month", ru: "Средний прогресс клиентов по месяцам", es: "Progreso promedio de clientes por mes" },
    avgProgress: { en: "Avg Progress (%)", ru: "Средний прогресс (%)", es: "Progreso Prom. (%)" },
    sessionsLabel: { en: "Sessions", ru: "Сессии", es: "Sesiones" },
    goalDistribution: { en: "Goal Distribution", ru: "Распределение целей", es: "Distribución de Objetivos" },
    clientGoalsBreakdown: { en: "Client goals breakdown", ru: "Распределение целей клиентов", es: "Desglose de objetivos de clientes" },
    individualClientPerformance: { en: "Individual Client Performance", ru: "Индивидуальные показатели клиентов", es: "Rendimiento Individual de Clientes" },
    currentProgressScores: { en: "Current progress scores sorted by performance", ru: "Текущие показатели прогресса по результативности", es: "Puntuaciones de progreso actuales ordenadas por rendimiento" },
    // Metrics
    weightProgress: { en: "Weight Progress", ru: "Прогресс веса", es: "Progreso de Peso" },
    workoutActivity: { en: "Workout Activity", ru: "Активность тренировок", es: "Actividad de Ejercicio" },
    nutritionTracking: { en: "Nutrition Tracking", ru: "Отслеживание питания", es: "Seguimiento de Nutrición" },
    overallProgress: { en: "Overall Progress", ru: "Общий прогресс", es: "Progreso General" },
    consistency: { en: "Consistency", ru: "Последовательность", es: "Consistencia" },
    dataPoints: { en: "Data Points", ru: "Записей", es: "Puntos de Datos" },
    bodyFat: { en: "Body Fat %", ru: "% жира", es: "% Grasa Corporal" },
    // Insights
    performanceInsights: { en: "Performance Insights", ru: "Аналитика эффективности", es: "Información de Rendimiento" },
    excellentProgress: { en: "Excellent Progress", ru: "Отличный прогресс", es: "Progreso Excelente" },
    clientsMaintaining80Plus: { en: "clients maintaining 80%+ progress scores", ru: "клиентов с прогрессом выше 80%", es: "clientes manteniendo más del 80% de progreso" },
    goalCompletionRate: { en: "Goal Completion Rate", ru: "Коэффициент выполнения целей", es: "Tasa de Cumplimiento de Objetivos" },
    sessionsCompletedSuccessfully: { en: "of scheduled sessions completed successfully", ru: "запланированных сессий успешно завершено", es: "de las sesiones programadas completadas exitosamente" },
    attentionNeeded: { en: "Attention Needed", ru: "Требуется внимание", es: "Requiere Atención" },
    clientsBelow50: { en: "clients below 50% progress - consider intervention", ru: "клиентов с прогрессом ниже 50% - рекомендуется вмешательство", es: "clientes por debajo del 50% - considere intervención" },
    // Achievement badges
    achievementBadges: { en: "Achievement Badges", ru: "Достижения", es: "Insignias de Logros" },
    recognitionMilestones: { en: "Recognition milestones reached", ru: "Достигнутые этапы признания", es: "Hitos de reconocimiento alcanzados" },
    topPerformerBadge: { en: "Top Performer", ru: "Лучший результат", es: "Mejor Rendimiento" },
    progress90Plus: { en: "90%+ Progress Score", ru: "Прогресс 90%+", es: "Puntuación de Progreso 90%+" },
    goalAchiever: { en: "Goal Achiever", ru: "Достигает целей", es: "Logrador de Objetivos" },
    progress75to89: { en: "75-89% Progress", ru: "Прогресс 75-89%", es: "Progreso 75-89%" },
    onTrack: { en: "On Track", ru: "На верном пути", es: "En Camino" },
    progress50to74: { en: "50-74% Progress", ru: "Прогресс 50-74%", es: "Progreso 50-74%" },
    clients: { en: "clients", ru: "клиентов", es: "clientes" },
    // Coach progress analytics component
    daysLogged: { en: "Days Logged", ru: "Дней записано", es: "Días Registrados" },
    weightChange: { en: "Weight Change", ru: "Изменение веса", es: "Cambio de Peso" },
    workouts: { en: "Workouts", ru: "Тренировки", es: "Entrenamientos" },
    thisWeek: { en: "This week", ru: "На этой неделе", es: "Esta semana" },
    target: { en: "target", ru: "цель", es: "objetivo" },
    avgCalories: { en: "Avg Calories", ru: "Средние калории", es: "Calorías Promedio" },
    noTargetSet: { en: "No target set", ru: "Цель не установлена", es: "Sin objetivo" },
    weightTrend: { en: "Weight Trend", ru: "Тренд веса", es: "Tendencia de Peso" },
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    calories14Days: { en: "Calories (14 Days)", ru: "Калории (14 дней)", es: "Calorías (14 Días)" },
    caloriesLabel: { en: "Calories", ru: "Калории", es: "Calorías" },
    noData: { en: "No data", ru: "Нет данных", es: "Sin datos" },
    recentSmartLogs: { en: "Recent Smart Logs", ru: "Последние записи", es: "Registros Recientes" },
    noSmartLogsYet: { en: "No smart logs yet", ru: "Записей пока нет", es: "Sin registros aún" },
    clientNoLogs: { en: "Client hasn't logged any progress entries", ru: "Клиент ещё не добавил записей", es: "El cliente no ha registrado entradas" },
    progressPhotos: { en: "Progress Photos", ru: "Фото прогресса", es: "Fotos de Progreso" },
    photosSharedByClient: { en: "Photos shared by client", ru: "Фото от клиента", es: "Fotos compartidas por el cliente" },
    noPhotosYet: { en: "No shared photos yet", ru: "Фото пока нет", es: "Sin fotos aún" },
    clientNoPhotos: { en: "Client hasn't shared any progress photos", ru: "Клиент ещё не поделился фотографиями", es: "El cliente no ha compartido fotos" },
    sleep: { en: "Sleep", ru: "Сон", es: "Sueño" },
    mood: { en: "Mood", ru: "Настроение", es: "Ánimo" },
  },
  // Common UI elements
  common: {
    loading: { en: "Loading...", ru: "Загрузка...", es: "Cargando..." },
    error: { en: "Error", ru: "Ошибка", es: "Error" },
    success: { en: "Success", ru: "Успешно", es: "Éxito" },
    save: { en: "Save", ru: "Сохранить", es: "Guardar" },
    cancel: { en: "Cancel", ru: "Отмена", es: "Cancelar" },
    close: { en: "Close", ru: "Закрыть", es: "Cerrar" },
    edit: { en: "Edit", ru: "Редактировать", es: "Editar" },
    delete: { en: "Delete", ru: "Удалить", es: "Eliminar" },
    add: { en: "Add", ru: "Добавить", es: "Añadir" },
    create: { en: "Create", ru: "Создать", es: "Crear" },
    update: { en: "Update", ru: "Обновить", es: "Actualizar" },
    confirm: { en: "Confirm", ru: "Подтвердить", es: "Confirmar" },
    back: { en: "Back", ru: "Назад", es: "Atrás" },
    next: { en: "Next", ru: "Далее", es: "Siguiente" },
    previous: { en: "Previous", ru: "Назад", es: "Anterior" },
    search: { en: "Search", ru: "Поиск", es: "Buscar" },
    filter: { en: "Filter", ru: "Фильтр", es: "Filtrar" },
    sort: { en: "Sort", ru: "Сортировать", es: "Ordenar" },
    refresh: { en: "Refresh", ru: "Обновить", es: "Actualizar" },
    download: { en: "Download", ru: "Скачать", es: "Descargar" },
    upload: { en: "Upload", ru: "Загрузить", es: "Subir" },
    viewAll: { en: "View all", ru: "Смотреть все", es: "Ver todo" },
    seeMore: { en: "See more", ru: "Показать ещё", es: "Ver más" },
    noData: { en: "No data available", ru: "Нет данных", es: "Sin datos" },
    required: { en: "Required", ru: "Обязательно", es: "Requerido" },
    optional: { en: "Optional", ru: "Необязательно", es: "Opcional" },
    yes: { en: "Yes", ru: "Да", es: "Sí" },
    no: { en: "No", ru: "Нет", es: "No" },
    or: { en: "or", ru: "или", es: "o" },
    and: { en: "and", ru: "и", es: "y" },
    notSet: { en: "Not set", ru: "Не указано", es: "No establecido" },
    male: { en: "Male", ru: "Мужской", es: "Masculino" },
    female: { en: "Female", ru: "Женский", es: "Femenino" },
    otherGender: { en: "Other", ru: "Другое", es: "Otro" },
    preferNotToSay: { en: "Prefer not to say", ru: "Предпочитаю не указывать", es: "Prefiero no decir" },
    active: { en: "Active", ru: "Активный", es: "Activo" },
    inactive: { en: "Inactive", ru: "Неактивный", es: "Inactivo" },
    pending: { en: "Pending", ru: "Ожидает", es: "Pendiente" },
    saving: { en: "Saving...", ru: "Сохранение...", es: "Guardando..." },
    sending: { en: "Sending...", ru: "Отправка...", es: "Enviando..." },
    whatHappensNext: { en: "What happens next?", ru: "Что будет дальше?", es: "¿Qué pasa después?" },
    tryRefreshing: { en: "Please try refreshing the page", ru: "Попробуйте обновить страницу", es: "Por favor intente actualizar la página" },
    confirmDelete: { en: "Are you sure you want to delete this?", ru: "Вы уверены, что хотите удалить?", es: "¿Está seguro de que desea eliminar?" },
  },
  // Notifications (push messages)
  notifications: {
    newMessage: { en: "New message from", ru: "Новое сообщение от", es: "Nuevo mensaje de" },
    sessionReminder: { en: "Session reminder", ru: "Напоминание о сессии", es: "Recordatorio de sesión" },
    clientProgress: { en: "Client progress update", ru: "Обновление прогресса клиента", es: "Actualización de progreso del cliente" },
    goalAchieved: { en: "Goal achieved!", ru: "Цель достигнута!", es: "¡Objetivo logrado!" },
    needsAttention: { en: "Client needs attention", ru: "Клиенту нужно внимание", es: "El cliente necesita atención" },
    testTitle: { en: "Test Notification", ru: "Тестовое уведомление", es: "Notificación de Prueba" },
    testBody: { en: "Push notifications are working correctly!", ru: "Push-уведомления работают правильно!", es: "¡Las notificaciones push funcionan correctamente!" },
  },
  // Client Data Logs page
  dataLogs: {
    title: { en: "Client Data Logs", ru: "Журналы данных клиентов", es: "Registros de Datos de Clientes" },
    subtitle: { en: "Track client nutrition, workouts, and check-ins", ru: "Отслеживайте питание, тренировки и отметки клиентов", es: "Rastrea nutrición, entrenamientos y registros de clientes" },
    selectClient: { en: "Select a client...", ru: "Выберите клиента...", es: "Seleccionar un cliente..." },
    nutrition: { en: "Nutrition", ru: "Питание", es: "Nutrición" },
    workout: { en: "Workout", ru: "Тренировка", es: "Ejercicio" },
    checkIn: { en: "Check-in", ru: "Отметка", es: "Registro" },
    goals: { en: "Goals", ru: "Цели", es: "Objetivos" },
    devices: { en: "Devices", ru: "Устройства", es: "Dispositivos" },
    // Nutrition form
    logNutrition: { en: "Log Nutrition", ru: "Записать питание", es: "Registrar Nutrición" },
    trackMeals: { en: "Track meals and nutrition for", ru: "Отслеживание приёмов пищи для", es: "Rastrea comidas y nutrición para" },
    date: { en: "Date", ru: "Дата", es: "Fecha" },
    calories: { en: "Calories", ru: "Калории", es: "Calorías" },
    protein: { en: "Protein (g)", ru: "Белок (г)", es: "Proteína (g)" },
    carbs: { en: "Carbs (g)", ru: "Углеводы (г)", es: "Carbohidratos (g)" },
    fats: { en: "Fats (g)", ru: "Жиры (г)", es: "Grasas (g)" },
    notes: { en: "Notes", ru: "Заметки", es: "Notas" },
    notesPlaceholder: { en: "Any additional observations...", ru: "Дополнительные наблюдения...", es: "Observaciones adicionales..." },
    saveNutrition: { en: "Save Nutrition Log", ru: "Сохранить запись питания", es: "Guardar Registro de Nutrición" },
    // Workout form
    logWorkout: { en: "Log Workout", ru: "Записать тренировку", es: "Registrar Ejercicio" },
    trackTraining: { en: "Track training sessions for", ru: "Отслеживание тренировок для", es: "Rastrea sesiones de entrenamiento para" },
    workoutType: { en: "Workout Type", ru: "Тип тренировки", es: "Tipo de Ejercicio" },
    duration: { en: "Duration (min)", ru: "Длительность (мин)", es: "Duración (min)" },
    intensity: { en: "Intensity", ru: "Интенсивность", es: "Intensidad" },
    workoutNotes: { en: "Workout Notes", ru: "Заметки о тренировке", es: "Notas del Ejercicio" },
    workoutNotesPlaceholder: { en: "Exercises performed, sets, reps, etc...", ru: "Упражнения, подходы, повторения и т.д...", es: "Ejercicios realizados, series, repeticiones, etc..." },
    saveWorkout: { en: "Save Workout Log", ru: "Сохранить запись тренировки", es: "Guardar Registro de Ejercicio" },
    // Workout types
    strength: { en: "Strength", ru: "Силовая", es: "Fuerza" },
    cardio: { en: "Cardio", ru: "Кардио", es: "Cardio" },
    hiit: { en: "HIIT", ru: "ВИИТ", es: "HIIT" },
    flexibility: { en: "Flexibility", ru: "Гибкость", es: "Flexibilidad" },
    sports: { en: "Sports", ru: "Спорт", es: "Deportes" },
    // Intensity levels
    low: { en: "Low", ru: "Низкая", es: "Baja" },
    moderate: { en: "Moderate", ru: "Умеренная", es: "Moderada" },
    high: { en: "High", ru: "Высокая", es: "Alta" },
    // Check-in form
    logCheckIn: { en: "Log Check-in", ru: "Записать отметку", es: "Registrar Check-in" },
    trackProgress: { en: "Track progress and well-being for", ru: "Отслеживание прогресса и состояния для", es: "Rastrea progreso y bienestar para" },
    weight: { en: "Weight", ru: "Вес", es: "Peso" },
    bodyFat: { en: "Body Fat %", ru: "% жира", es: "% Grasa Corporal" },
    checkInNotes: { en: "Check-in Notes", ru: "Заметки отметки", es: "Notas del Registro" },
    checkInNotesPlaceholder: { en: "Energy levels, measurements, photos, etc...", ru: "Уровень энергии, измерения, фото и т.д...", es: "Niveles de energía, medidas, fotos, etc..." },
    saveCheckIn: { en: "Save Check-in", ru: "Сохранить отметку", es: "Guardar Registro" },
    // History section
    recentLogs: { en: "Recent Logs", ru: "Недавние записи", es: "Registros Recientes" },
    noLogsYet: { en: "No logs recorded yet", ru: "Записей пока нет", es: "Sin registros aún" },
    startLogging: { en: "Start by recording nutrition, workout, or check-in data", ru: "Начните с записи питания, тренировки или отметки", es: "Comienza registrando datos de nutrición, ejercicio o check-in" },
    // Messages
    logSaved: { en: "Log saved successfully", ru: "Запись сохранена", es: "Registro guardado" },
    logDeleted: { en: "Log deleted", ru: "Запись удалена", es: "Registro eliminado" },
    failedToSave: { en: "Failed to save log", ru: "Не удалось сохранить запись", es: "Error al guardar registro" },
    saving: { en: "Saving...", ru: "Сохранение...", es: "Guardando..." },
  },
} as const;

// Helper function to get coach UI translation
export function getCoachUITranslation(
  section: keyof typeof COACH_UI_TRANSLATIONS,
  key: string,
  lang: SupportedLanguage = "en"
): string {
  const sectionData = COACH_UI_TRANSLATIONS[section] as Record<string, Record<SupportedLanguage, string>>;
  if (sectionData && sectionData[key]) {
    return sectionData[key][lang] || sectionData[key].en;
  }
  return key;
}

export function getLanguageLabel(language: string | null | undefined): string {
  if (!language) return "English";
  if (language in LANGUAGE_LABELS) {
    return LANGUAGE_LABELS[language as SupportedLanguage];
  }
  return "English";
}

export function getActivityLevelLabel(activityLevel: string | null | undefined): string {
  if (!activityLevel) return "Not set";
  if (activityLevel in ACTIVITY_LEVEL_LABELS) {
    return ACTIVITY_LEVEL_LABELS[activityLevel as ActivityLevel];
  }
  return activityLevel;
}

// Get translated activity level label
export function getActivityLevelLabelTranslated(
  activityLevel: string | null | undefined, 
  lang: SupportedLanguage = "en"
): string {
  if (!activityLevel) return lang === "ru" ? "Не указано" : lang === "es" ? "No establecido" : "Not set";
  if (activityLevel in ACTIVITY_LEVEL_LABELS) {
    return ACTIVITY_LEVEL_LABELS_TRANSLATED[lang][activityLevel as ActivityLevel];
  }
  return activityLevel;
}

// Get translated goal type label
export function getGoalTypeLabelTranslated(
  goalType: string | null | undefined, 
  lang: SupportedLanguage = "en",
  goalDescription?: string | null
): string {
  if (!goalType) return lang === "ru" ? "Не указано" : lang === "es" ? "No establecido" : "Not set";
  
  if (goalType === "other" && goalDescription) {
    return goalDescription;
  }
  
  if (goalType in GOAL_TYPE_LABELS) {
    return GOAL_TYPE_LABELS_TRANSLATED[lang][goalType as GoalType];
  }
  
  return goalDescription || goalType;
}

// Get gender-aware quick action prompt for Russian
export function getQuickActionPrompt(
  action: keyof typeof AI_TRACKER_TRANSLATIONS.quickActionPrompts,
  lang: SupportedLanguage = "en",
  sex?: string | null
): string {
  const prompts = AI_TRACKER_TRANSLATIONS.quickActionPrompts[action];
  
  // For Russian, use feminine form if client is female (case-insensitive check)
  if (lang === "ru" && sex?.toLowerCase() === "female") {
    const femininePrompts = AI_TRACKER_TRANSLATIONS.quickActionPromptsFeminine;
    return femininePrompts[action];
  }
  
  return prompts[lang] || prompts.en;
}

export function getActivityLevelMultiplier(activityLevel: string | null | undefined): number {
  if (!activityLevel || !(activityLevel in ACTIVITY_LEVEL_MULTIPLIERS)) {
    return 1.2;
  }
  return ACTIVITY_LEVEL_MULTIPLIERS[activityLevel as ActivityLevel];
}

// Week start day options for coach settings
export const WEEK_START_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type WeekStartDay = typeof WEEK_START_DAYS[number];

export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  profileImageUrl: text("profile_image_url"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  weekStartDay: text("week_start_day").notNull().default("Mon"), // Coach-defined week start day
});

export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type Coach = typeof coaches.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  // OAuth fields for social login
  oauthProvider: text("oauth_provider"), // "replit", "google", etc.
  oauthId: text("oauth_id"), // Unique ID from OAuth provider
  profileImageUrl: text("profile_image_url"),
  status: text("status").notNull().default("active"),
  goalType: text("goal_type"),
  goalDescription: text("goal_description"),
  progressScore: integer("progress_score").notNull().default(0),
  // Progress breakdown for composite score calculation
  goalProgress: integer("goal_progress").notNull().default(0), // 0-100: Long-term goal completion %
  weeklyProgress: integer("weekly_progress").notNull().default(0), // 0-100: Weekly task completion %
  activityProgress: integer("activity_progress").notNull().default(0), // 0-100: Activity consistency %
  progressUpdatedAt: text("progress_updated_at"), // Last time progress was recalculated
  joinedDate: text("joined_date").notNull(),
  lastSession: text("last_session"),
  lastLoginAt: text("last_login_at"),
  lastActiveAt: text("last_active_at"), // Tracks any client activity: messages, logs, login
  notes: text("notes"),
  intakeSource: text("intake_source"),
  questionnaireId: varchar("questionnaire_id"),
  sex: text("sex"),
  weight: real("weight"),
  age: integer("age"),
  height: real("height"),
  activityLevel: text("activity_level"),
  bodyFatPercentage: real("body_fat_percentage"),
  unitsPreference: text("units_preference").notNull().default("us"),
  targetWeight: real("target_weight"),
  targetBodyFat: real("target_body_fat"),
  goalWeight: real("goal_weight"),
  // Wellness plan fields
  occupation: text("occupation"),
  medicalNotes: text("medical_notes"),
  trainingExperience: text("training_experience"),
  equipmentAccess: text("equipment_access"),
  timeframe: text("timeframe"),
  currentHabits: json("current_habits").$type<{
    exercisePerWeek?: number;
    averageStepsPerDay?: number;
    sleepHoursPerNight?: number;
    stressLevel?: number;
    hydration?: string;
    eatingPattern?: string;
  }>(),
  preferences: json("preferences").$type<{
    likes?: string;
    dislikes?: string;
    scheduleConstraints?: string;
  }>(),
  // Onboarding status for new clients
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  // End date for coach-client collaboration
  endDate: text("end_date"),
  // Preferred language for AI responses (en, ru, es)
  preferredLanguage: text("preferred_language").notNull().default("en"),
  // Program start date (for week calculations) - defaults to joinedDate if not set
  programStartDate: text("program_start_date"),
}, (table) => ({
  coachIdIdx: index("clients_coach_id_idx").on(table.coachId),
  emailIdx: index("clients_email_idx").on(table.email),
}));

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  sessionType: text("session_type").notNull(),
  locationType: text("location_type").default("video"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  meetingLink: text("meeting_link"),
}, (table) => ({
  clientIdIdx: index("sessions_client_id_idx").on(table.clientId),
}));

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  attachments: json("attachments").$type<MessageAttachment[] | null>(),
}, (table) => ({
  clientIdIdx: index("messages_client_id_idx").on(table.clientId),
}));

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull().default("completed"),
});

export const questionnaires = pgTable("questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  questions: json("questions").notNull(),
  welcomeText: text("welcome_text"),
  consentText: text("consent_text"),
  consentRequired: boolean("consent_required").notNull().default(false),
  confirmationMessage: text("confirmation_message"),
  defaultUnitsPreference: text("default_units_preference").notNull().default("us"),
  standardFields: json("standard_fields").$type<{
    sex?: boolean;
    weight?: boolean;
    age?: boolean;
    height?: boolean;
    activityLevel?: boolean;
    bodyFatPercentage?: boolean;
    goal?: boolean;
  }>(),
  deleted: boolean("deleted").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  coachIdIdx: index("questionnaires_coach_id_idx").on(table.coachId),
}));

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionnaireId: varchar("questionnaire_id").notNull(),
  questionnaireName: text("questionnaire_name"),
  clientId: varchar("client_id"),
  clientName: text("client_name"),
  answers: json("answers").notNull(),
  submittedAt: text("submitted_at").notNull(),
  isDraft: boolean("is_draft").notNull().default(false),
  lastSavedAt: text("last_saved_at"),
  pinnedForAI: boolean("pinned_for_ai").notNull().default(false),
  pdfUrl: text("pdf_url"),
});

export const nutritionLogs = pgTable("nutrition_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fats: real("fats"),
  notes: text("notes"),
  dataSource: text("data_source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  workoutType: text("workout_type").notNull(),
  duration: integer("duration"),
  intensity: text("intensity"),
  exercises: json("exercises"),
  notes: text("notes"),
  dataSource: text("data_source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  weight: real("weight"),
  bodyFat: real("body_fat"),
  measurements: json("measurements"),
  photos: json("photos"),
  mood: text("mood"),
  energy: text("energy"),
  notes: text("notes"),
  dataSource: text("data_source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const deviceConnections = pgTable("device_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  deviceType: text("device_type").notNull(),
  status: text("status").notNull().default("connected"),
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  dataPermissions: json("data_permissions").notNull(),
  lastSyncedAt: text("last_synced_at"),
  connectedAt: text("connected_at").notNull(),
});

export const connectionRequests = pgTable("connection_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  deviceType: text("device_type").notNull(),
  status: text("status").notNull().default("pending"),
  requestedAt: text("requested_at").notNull(),
  respondedAt: text("responded_at"),
  expiresAt: text("expires_at").notNull(),
  inviteCode: text("invite_code").notNull(),
});

export const clientTokens = pgTable("client_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"),
  coachId: varchar("coach_id").notNull().default("default-coach"), // Coach who created the token
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  coachName: text("coach_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at"),
  lastUsedAt: text("last_used_at"),
});

export const clientInvites = pgTable("client_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"),
  coachId: varchar("coach_id").notNull().default("default-coach"), // Coach who sent the invite
  email: text("email").notNull(),
  name: text("name"),
  tokenId: varchar("token_id").notNull(),
  questionnaireId: varchar("questionnaire_id"),
  status: text("status").notNull().default("pending"), // pending, completed, expired, cancelled
  sentAt: text("sent_at").notNull(),
  completedAt: text("completed_at"),
  expiresAt: text("expires_at"), // Optional expiration for invites
  resendCount: integer("resend_count").notNull().default(0), // Track how many times invite was resent
  lastResendAt: text("last_resend_at"), // Last resend timestamp
  message: text("message"),
});

// Password reset tokens for both clients and coaches
export const USER_TYPES = ["client", "coach"] as const;
export type UserType = typeof USER_TYPES[number];

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  userType: text("user_type").notNull(), // "client" or "coach"
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"), // Set when token is used
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Plan types for distinguishing long-term coaching plans from weekly action plans
export const PLAN_TYPES = ["long_term", "weekly"] as const;
export type PlanType = typeof PLAN_TYPES[number];

export const clientPlans = pgTable("client_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull().default("default-coach"),
  planName: text("plan_name").notNull(),
  planContent: json("plan_content").notNull(),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("draft"),
  shared: boolean("shared").notNull().default(false),
  sessionId: varchar("session_id"), // Links to plan session for chat history
  planType: text("plan_type").notNull().default("long_term"), // "long_term" or "weekly"
  weekStartDate: text("week_start_date"), // For weekly plans: YYYY-MM-DD of week start (Monday)
  weekEndDate: text("week_end_date"), // For weekly plans: YYYY-MM-DD of week end (Sunday)
  viewedAt: text("viewed_at"), // Timestamp when client viewed this plan (null = unviewed)
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  clientIdIdx: index("client_plans_client_id_idx").on(table.clientId),
  planTypeIdx: index("client_plans_plan_type_idx").on(table.planType),
}));

// Weekly Schedule Item section types
export const SCHEDULE_SECTION_TYPES = ["training", "nutrition", "habits", "tasks"] as const;
export type ScheduleSectionType = typeof SCHEDULE_SECTION_TYPES[number];

// Weekly Schedule Items - individual tasks/activities for client's weekly plan
export const weeklyScheduleItems = pgTable("weekly_schedule_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  planId: varchar("plan_id"), // Optional link to clientPlans
  coachId: varchar("coach_id").notNull(),
  weekStartDate: text("week_start_date").notNull(), // YYYY-MM-DD (based on coach's weekStartDay)
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD for the specific day
  sectionType: text("section_type").notNull(), // training, nutrition, habits, tasks
  title: text("title").notNull(),
  description: text("description"),
  metadata: json("metadata").$type<{
    sets?: number;
    reps?: number;
    duration?: string;
    time?: string;
    calories?: number;
    notes?: string;
  }>(),
  coachNote: text("coach_note"),
  sortOrder: integer("sort_order").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  clientIdIdx: index("weekly_schedule_items_client_id_idx").on(table.clientId),
  weekStartIdx: index("weekly_schedule_items_week_start_idx").on(table.weekStartDate),
  scheduledDateIdx: index("weekly_schedule_items_date_idx").on(table.scheduledDate),
}));

export const insertWeeklyScheduleItemSchema = createInsertSchema(weeklyScheduleItems).omit({
  id: true,
}).extend({
  sectionType: z.enum(SCHEDULE_SECTION_TYPES),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertWeeklyScheduleItem = z.infer<typeof insertWeeklyScheduleItemSchema>;
export type WeeklyScheduleItem = typeof weeklyScheduleItems.$inferSelect;

// Plan Item Completions - tracks completion state for plan content items (exercises, meals, habits)
export const planItemCompletions = pgTable("plan_item_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  planId: varchar("plan_id").notNull(), // Links to clientPlans
  itemId: varchar("item_id").notNull(), // The ID of the item within plan content (exercise.id, meal.id, habit.id)
  itemType: text("item_type").notNull(), // "exercise", "meal", "habit"
  date: text("date").notNull(), // YYYY-MM-DD - the date for which this completion applies
  completed: boolean("completed").notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  clientIdIdx: index("plan_item_completions_client_id_idx").on(table.clientId),
  planIdIdx: index("plan_item_completions_plan_id_idx").on(table.planId),
  dateIdx: index("plan_item_completions_date_idx").on(table.date),
  uniqueCompletion: index("plan_item_completions_unique_idx").on(table.clientId, table.planId, table.itemId, table.date),
}));

export const insertPlanItemCompletionSchema = createInsertSchema(planItemCompletions).omit({
  id: true,
});

export type InsertPlanItemCompletion = z.infer<typeof insertPlanItemCompletionSchema>;
export type PlanItemCompletion = typeof planItemCompletions.$inferSelect;

// Plan Sessions - tracks each AI plan building session
// Plan lifecycle: NOT_STARTED -> IN_PROGRESS -> ASSIGNED
export const PLAN_SESSION_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "ASSIGNED"] as const;
export type PlanSessionStatus = typeof PLAN_SESSION_STATUSES[number];

export const planSessions = pgTable("plan_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull().default("default-coach"),
  status: text("status").notNull().default("IN_PROGRESS"), // NOT_STARTED, IN_PROGRESS, ASSIGNED
  canvasContent: text("canvas_content"), // The plan document content
  planName: text("plan_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  assignedAt: text("assigned_at"), // Set when status becomes ASSIGNED
});

// Plan Messages - persists AI chat history for each session
export const PLAN_MESSAGE_ROLES = ["system", "user", "assistant"] as const;
export type PlanMessageRole = typeof PLAN_MESSAGE_ROLES[number];

export const planMessages = pgTable("plan_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(), // system, user, assistant
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// Goal scope types for progress calculation
export const GOAL_SCOPES = ["long_term", "weekly_task"] as const;
export type GoalScope = typeof GOAL_SCOPES[number];

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  goalType: text("goal_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").notNull().default(0),
  baselineValue: real("baseline_value"), // Starting value for progress calculation
  unit: text("unit").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("medium"),
  scope: text("scope").notNull().default("long_term"), // "long_term" or "weekly_task"
  weekStartDate: text("week_start_date"), // For weekly tasks, the week they belong to
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  clientIdIdx: index("goals_client_id_idx").on(table.clientId),
}));

export const QUESTION_TYPES = [
  "short_text",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "number",
  "date",
  "email",
  "phone",
  "file_upload",
] as const;

export type QuestionType = typeof QUESTION_TYPES[number];

const shortTextSettingsSchema = z.object({
  placeholder: z.string().optional(),
  characterLimit: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
});

const paragraphSettingsSchema = z.object({
  placeholder: z.string().optional(),
  characterLimit: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

const multipleChoiceSettingsSchema = z.object({
  options: z.array(z.string()).min(1),
  allowOther: z.boolean().optional(),
  defaultValue: z.string().optional(),
});

const checkboxesSettingsSchema = z.object({
  options: z.array(z.string()).min(1),
  allowOther: z.boolean().optional(),
  minSelections: z.number().optional(),
  maxSelections: z.number().optional(),
});

const dropdownSettingsSchema = z.object({
  options: z.array(z.string()).min(1),
  defaultValue: z.string().optional(),
});

const numberSettingsSchema = z.object({
  placeholder: z.string().optional(),
  unitLabel: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

const dateSettingsSchema = z.object({
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

const emailSettingsSchema = z.object({
  placeholder: z.string().optional(),
});

const phoneSettingsSchema = z.object({
  placeholder: z.string().optional(),
  countryCode: z.string().optional(),
});

const fileUploadSettingsSchema = z.object({
  allowedTypes: z.array(z.string()).optional(),
  maxSizeMB: z.number().optional(),
  maxFiles: z.number().optional(),
});

export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("short_text"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: shortTextSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("paragraph"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: paragraphSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("multiple_choice"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: multipleChoiceSettingsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("checkboxes"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: checkboxesSettingsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("dropdown"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: dropdownSettingsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("number"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: numberSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("date"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: dateSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("email"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: emailSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("phone"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: phoneSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("file_upload"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: fileUploadSettingsSchema.optional(),
  }),
]);

export type Question = z.infer<typeof questionSchema>;

export function normalizeQuestion(q: any): Question {
  const normalized: any = {
    id: q.id,
    type: q.type || "short_text",
    label: q.label || "",
    description: q.description || "",
    required: q.isRequired ?? q.required ?? false,
    settings: q.settings || {},
  };

  if (q.options && !q.settings?.options) {
    if (normalized.type === "multiple_choice" || normalized.type === "checkboxes" || normalized.type === "dropdown") {
      normalized.settings = {
        ...normalized.settings,
        options: q.options,
      };
    }
  }

  return normalized;
}

const baseClientSchema = createInsertSchema(clients).omit({
  id: true,
}).extend({
  goalType: z.enum(GOAL_TYPES, {
    errorMap: () => ({ message: "Please select your primary goal" }),
  }).optional(),
  goalDescription: z.string().optional(),
});

export const insertClientSchema = baseClientSchema.superRefine((data, ctx) => {
  if (data.goalType === "other" && !data.goalDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please describe your goal when selecting 'Other'",
      path: ["goalDescription"],
    });
  }
});

export const updateClientSchema = baseClientSchema.partial().superRefine((data, ctx) => {
  if (data.goalType === "other" && !data.goalDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please describe your goal when selecting 'Other'",
      path: ["goalDescription"],
    });
  }
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
}).extend({
  attachments: z.custom<MessageAttachment[] | null>().optional(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
});

export const insertQuestionnaireSchema = createInsertSchema(questionnaires).omit({
  id: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
});

export const insertNutritionLogSchema = createInsertSchema(nutritionLogs).omit({
  id: true,
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({
  id: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
});

export const insertDeviceConnectionSchema = createInsertSchema(deviceConnections).omit({
  id: true,
});

export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).omit({
  id: true,
}).extend({
  requestedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  inviteCode: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
// Message attachment types
export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // in bytes
  objectPath: string; // path to object storage
  uploadedAt: string;
}

export type Message = typeof messages.$inferSelect & {
  attachments?: MessageAttachment[] | null;
};

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type Questionnaire = typeof questionnaires.$inferSelect;

export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;

export type InsertNutritionLog = z.infer<typeof insertNutritionLogSchema>;
export type NutritionLog = typeof nutritionLogs.$inferSelect;

export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;

export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

export type InsertDeviceConnection = z.infer<typeof insertDeviceConnectionSchema>;
export type DeviceConnection = typeof deviceConnections.$inferSelect;

export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;

export const insertClientTokenSchema = createInsertSchema(clientTokens).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  token: z.string().optional(),
});

export const insertClientInviteSchema = createInsertSchema(clientInvites).omit({
  id: true,
}).extend({
  sentAt: z.string().optional(),
});

export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const insertPlanSessionSchema = createInsertSchema(planSessions).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const insertPlanMessageSchema = createInsertSchema(planMessages).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertClientToken = z.infer<typeof insertClientTokenSchema>;
export type ClientToken = typeof clientTokens.$inferSelect;

export type InsertClientInvite = z.infer<typeof insertClientInviteSchema>;
export type ClientInvite = typeof clientInvites.$inferSelect;

export type InsertClientPlan = z.infer<typeof insertClientPlanSchema>;
export type ClientPlan = typeof clientPlans.$inferSelect;

export type InsertPlanSession = z.infer<typeof insertPlanSessionSchema>;
export type PlanSession = typeof planSessions.$inferSelect;

export type InsertPlanMessage = z.infer<typeof insertPlanMessageSchema>;
export type PlanMessage = typeof planMessages.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Unified Client Data Log for progress tracking
export const LOG_TYPES = ["nutrition", "workout", "checkin", "goal"] as const;
export type LogType = typeof LOG_TYPES[number];

export const LOG_SOURCES = ["client", "coach"] as const;
export type LogSource = typeof LOG_SOURCES[number];

export const WORKOUT_INTENSITIES = ["low", "medium", "high"] as const;
export type WorkoutIntensity = typeof WORKOUT_INTENSITIES[number];

// Payload type definitions for each log type
export interface NutritionPayload {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  comment?: string;
}

export interface WorkoutPayload {
  workoutType?: string;
  durationMinutes?: number;
  intensity?: WorkoutIntensity;
  comment?: string;
}

export interface CheckinPayload {
  weight?: number;
  waist?: number;
  hips?: number;
  energy?: number; // 1-10
  mood?: number; // 1-10
  sleepHours?: number;
  comment?: string;
  progressPhotoUrl?: string;
}

export interface GoalPayload {
  goalType?: string;
  goalValue?: string | number;
  goalStatus?: "active" | "paused" | "completed";
  comment?: string;
}

export type LogPayload = NutritionPayload | WorkoutPayload | CheckinPayload | GoalPayload;

export const clientDataLogs = pgTable("client_data_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  planId: varchar("plan_id"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  source: text("source").notNull(), // "client" or "coach"
  type: text("type").notNull(), // "nutrition", "workout", "checkin", "goal"
  date: text("date").notNull(), // logical date of the log (YYYY-MM-DD)
  payload: json("payload").notNull().$type<LogPayload>(),
  createdAt: text("created_at").notNull(),
});

export const insertClientDataLogSchema = createInsertSchema(clientDataLogs).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  source: z.enum(LOG_SOURCES),
  type: z.enum(LOG_TYPES),
  payload: z.union([
    z.object({
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fats: z.number().optional(),
      comment: z.string().optional(),
    }),
    z.object({
      workoutType: z.string().optional(),
      durationMinutes: z.number().optional(),
      intensity: z.enum(WORKOUT_INTENSITIES).optional(),
      comment: z.string().optional(),
    }),
    z.object({
      weight: z.number().optional(),
      waist: z.number().optional(),
      hips: z.number().optional(),
      energy: z.number().min(1).max(10).optional(),
      mood: z.number().min(1).max(10).optional(),
      sleepHours: z.number().optional(),
      comment: z.string().optional(),
      progressPhotoUrl: z.string().optional(),
    }),
    z.object({
      goalType: z.string().optional(),
      goalValue: z.union([z.string(), z.number()]).optional(),
      goalStatus: z.enum(["active", "paused", "completed"]).optional(),
      comment: z.string().optional(),
    }),
  ]),
});

export type InsertClientDataLog = z.infer<typeof insertClientDataLogSchema>;
export type ClientDataLog = typeof clientDataLogs.$inferSelect;

// ============================================
// Smart Log System (AI-Powered Progress Tracking)
// ============================================

// Smart Log author types
export const SMART_LOG_AUTHOR_TYPES = ["client", "coach", "system"] as const;
export type SmartLogAuthorType = typeof SMART_LOG_AUTHOR_TYPES[number];

// Smart Log sources
export const SMART_LOG_SOURCES = ["smart_log", "quick_action", "import", "other"] as const;
export type SmartLogSource = typeof SMART_LOG_SOURCES[number];

// Progress event types
export const PROGRESS_EVENT_TYPES = [
  "weight",
  "nutrition",
  "workout",
  "steps",
  "sleep",
  "checkin_mood",
  "note",
  "other"
] as const;
export type ProgressEventType = typeof PROGRESS_EVENT_TYPES[number];

// AI Classification result type
export interface AIClassification {
  detected_event_types: ProgressEventType[];
  has_weight: boolean;
  has_nutrition: boolean;
  has_workout: boolean;
  has_steps: boolean;
  has_sleep: boolean;
  has_mood: boolean;
  overall_confidence: number;
}

// AI Parsed data types
export interface ParsedNutrition {
  food_description?: string;
  calories?: number;
  calories_est?: number;
  protein_g?: number;
  protein_est_g?: number;
  carbs_g?: number;
  carbs_est_g?: number;
  fat_g?: number;
  fat_est_g?: number;
  source: string;
  estimated: boolean;
  confidence: number;
}

export interface ParsedWorkout {
  type: "strength" | "cardio" | "hiit" | "mobility" | "mixed" | "unknown";
  body_focus: ("upper" | "lower" | "full" | "core" | "unspecified")[];
  duration_min: number | null;
  intensity: "low" | "medium" | "high" | "unknown";
  notes?: string;
  confidence: number;
}

export interface ParsedWeight {
  value: number;
  unit: "kg" | "lbs";
  confidence: number;
}

export interface ParsedSteps {
  steps: number;
  source: string;
  confidence: number;
}

export interface ParsedSleep {
  hours: number;
  quality?: "poor" | "fair" | "good" | "excellent";
  confidence: number;
}

export interface ParsedMood {
  rating: number; // 1-10
  notes?: string;
  confidence: number;
}

export interface AIParsedData {
  nutrition?: ParsedNutrition;
  workout?: ParsedWorkout;
  weight?: ParsedWeight;
  steps?: ParsedSteps;
  sleep?: ParsedSleep;
  mood?: ParsedMood;
}

// Plan targets configuration
export interface PlanTargets {
  calories_target_per_day?: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fat_target_g?: number;
  workouts_per_week_target?: number;
  preferred_workout_types?: string[];
  steps_target_per_day?: number;
  sleep_target_hours?: number;
  notes?: string;
}

// Smart Logs table - raw entries from clients/coaches
export const smartLogs = pgTable("smart_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  authorType: text("author_type").notNull(), // "client" | "coach" | "system"
  source: text("source").notNull().default("smart_log"), // "smart_log" | "quick_action" | "import" | "other"
  rawText: text("raw_text"),
  mediaUrls: json("media_urls").$type<string[]>(),
  localDateForClient: text("local_date_for_client").notNull(), // YYYY-MM-DD
  aiClassificationJson: json("ai_classification_json").$type<AIClassification | null>(),
  aiParsedJson: json("ai_parsed_json").$type<AIParsedData | null>(),
  processingStatus: text("processing_status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed"
  processingError: text("processing_error"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  clientIdIdx: index("smart_logs_client_id_idx").on(table.clientId),
}));

export const insertSmartLogSchema = createInsertSchema(smartLogs).omit({
  id: true,
}).extend({
  authorType: z.enum(SMART_LOG_AUTHOR_TYPES),
  source: z.enum(SMART_LOG_SOURCES).optional(),
  rawText: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  localDateForClient: z.string(),
  createdAt: z.string().optional(),
});

export type InsertSmartLog = z.infer<typeof insertSmartLogSchema>;
export type SmartLog = typeof smartLogs.$inferSelect;

// Progress Events table - normalized extracted metrics
export const progressEvents = pgTable("progress_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  smartLogId: varchar("smart_log_id"), // Reference to source smart log
  eventType: text("event_type").notNull(), // weight, nutrition, workout, steps, sleep, checkin_mood, note, other
  dateForMetric: text("date_for_metric").notNull(), // YYYY-MM-DD
  dataJson: json("data_json").notNull().$type<Record<string, any>>(),
  confidence: real("confidence").notNull().default(1.0), // 0-1
  needsReview: boolean("needs_review").notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  clientIdIdx: index("progress_events_client_id_idx").on(table.clientId),
  dateIdx: index("progress_events_date_idx").on(table.dateForMetric),
}));

export const insertProgressEventSchema = createInsertSchema(progressEvents).omit({
  id: true,
}).extend({
  eventType: z.enum(PROGRESS_EVENT_TYPES),
  dateForMetric: z.string(),
  dataJson: z.record(z.any()),
  confidence: z.number().min(0).max(1).optional(),
  needsReview: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export type InsertProgressEvent = z.infer<typeof insertProgressEventSchema>;
export type ProgressEvent = typeof progressEvents.$inferSelect;

// Weekly Reports table - AI-generated summaries
export const weeklyReports = pgTable("weekly_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday)
  weekEnd: text("week_end").notNull(), // YYYY-MM-DD (Sunday)
  aggregatesJson: json("aggregates_json").$type<{
    days_with_data: number;
    avg_calories?: number;
    avg_protein_g?: number;
    days_within_calorie_target?: number;
    days_above_calorie_target?: number;
    days_below_calorie_target?: number;
    workouts_count: number;
    weight_change_kg?: number;
    avg_steps?: number;
    avg_sleep_hours?: number;
  }>(),
  flagsJson: json("flags_json").$type<{
    missing_data_days: string[];
    consistent_over_target: boolean;
    consistent_under_target: boolean;
    low_workout_adherence: boolean;
    weight_trend: "up" | "down" | "stable" | "unknown";
  }>(),
  coachReport: text("coach_report"), // AI-generated analytical summary
  clientReport: text("client_report"), // AI-generated motivational summary
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertWeeklyReportSchema = createInsertSchema(weeklyReports).omit({
  id: true,
}).extend({
  weekStart: z.string(),
  weekEnd: z.string(),
  generatedAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;
export type WeeklyReport = typeof weeklyReports.$inferSelect;

// Plan Targets table - specific targets for a client's plan
export const planTargets = pgTable("plan_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  planId: varchar("plan_id"), // Optional reference to clientPlans
  planType: text("plan_type").notNull().default("combined"), // "nutrition" | "training" | "combined"
  title: text("title").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD, nullable
  configJson: json("config_json").$type<PlanTargets>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPlanTargetsSchema = createInsertSchema(planTargets).omit({
  id: true,
}).extend({
  planType: z.enum(["nutrition", "training", "combined"]).optional(),
  configJson: z.object({
    calories_target_per_day: z.number().optional(),
    protein_target_g: z.number().optional(),
    carbs_target_g: z.number().optional(),
    fat_target_g: z.number().optional(),
    workouts_per_week_target: z.number().optional(),
    preferred_workout_types: z.array(z.string()).optional(),
    steps_target_per_day: z.number().optional(),
    sleep_target_hours: z.number().optional(),
    notes: z.string().optional(),
  }),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertPlanTargets = z.infer<typeof insertPlanTargetsSchema>;
export type PlanTargetsRecord = typeof planTargets.$inferSelect;

// Engagement System Tables

// Trigger severities and types
export const TRIGGER_SEVERITIES = ["high", "medium", "low"] as const;
export type TriggerSeverity = typeof TRIGGER_SEVERITIES[number];

export const TRIGGER_TYPES = [
  "inactivity",
  "missed_workout",
  "declining_metrics",
  "goal_at_risk",
  "nutrition_concern",
  "sleep_issue",
  "engagement_drop",
] as const;
export type TriggerType = typeof TRIGGER_TYPES[number];

// Engagement Triggers - AI-detected issues for clients
export const engagementTriggers = pgTable("engagement_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  type: text("type").notNull(), // TriggerType
  severity: text("severity").notNull(), // TriggerSeverity
  reason: text("reason").notNull(),
  recommendedAction: text("recommended_action"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: text("resolved_at"),
  detectedAt: text("detected_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertEngagementTriggerSchema = createInsertSchema(engagementTriggers).omit({
  id: true,
}).extend({
  type: z.enum(TRIGGER_TYPES),
  severity: z.enum(TRIGGER_SEVERITIES),
  createdAt: z.string().optional(),
  detectedAt: z.string().optional(),
});

export type InsertEngagementTrigger = z.infer<typeof insertEngagementTriggerSchema>;
export type EngagementTrigger = typeof engagementTriggers.$inferSelect;

// Recommendation statuses
export const RECOMMENDATION_STATUSES = ["pending", "sent", "dismissed", "failed"] as const;
export type RecommendationStatus = typeof RECOMMENDATION_STATUSES[number];

// Engagement Recommendations - AI-generated suggestions for coaches
export const engagementRecommendations = pgTable("engagement_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  triggerId: varchar("trigger_id"), // Optional link to trigger
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  message: text("message").notNull(),
  reason: text("reason").notNull(),
  priority: text("priority").notNull().default("medium"), // TriggerSeverity
  status: text("status").notNull().default("pending"), // RecommendationStatus
  sentAt: text("sent_at"),
  sentVia: text("sent_via"), // "email" | "sms" | "in_app" | comma-separated
  createdAt: text("created_at").notNull(),
});

export const insertEngagementRecommendationSchema = createInsertSchema(engagementRecommendations).omit({
  id: true,
}).extend({
  priority: z.enum(TRIGGER_SEVERITIES).optional(),
  status: z.enum(RECOMMENDATION_STATUSES).optional(),
  createdAt: z.string().optional(),
});

export type InsertEngagementRecommendation = z.infer<typeof insertEngagementRecommendationSchema>;
export type EngagementRecommendation = typeof engagementRecommendations.$inferSelect;

// Notification frequency options
export const NOTIFICATION_FREQUENCIES = ["immediate", "daily", "weekly", "none"] as const;
export type NotificationFrequency = typeof NOTIFICATION_FREQUENCIES[number];

// Engagement Notification Preferences - Per-coach settings for client notifications
export const engagementNotificationPreferences = pgTable("engagement_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  clientId: varchar("client_id"), // Null = global coach preferences
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  webPushEnabled: boolean("web_push_enabled").notNull().default(false),
  frequency: text("frequency").notNull().default("immediate"), // NotificationFrequency
  dailyLimit: integer("daily_limit").notNull().default(5),
  quietHoursStart: text("quiet_hours_start"), // "22:00"
  quietHoursEnd: text("quiet_hours_end"), // "08:00"
  updatedAt: text("updated_at").notNull(),
});

export const insertEngagementNotificationPreferencesSchema = createInsertSchema(engagementNotificationPreferences).omit({
  id: true,
}).extend({
  frequency: z.enum(NOTIFICATION_FREQUENCIES).optional(),
  updatedAt: z.string().optional(),
});

export type InsertEngagementNotificationPreferences = z.infer<typeof insertEngagementNotificationPreferencesSchema>;
export type EngagementNotificationPreferences = typeof engagementNotificationPreferences.$inferSelect;

// In-App Notifications - Stored notifications for clients
export const inAppNotifications = pgTable("in_app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("reminder"), // "reminder" | "alert" | "message" | "update"
  isRead: boolean("is_read").notNull().default(false),
  readAt: text("read_at"),
  actionUrl: text("action_url"), // Optional link
  createdAt: text("created_at").notNull(),
});

export const insertInAppNotificationSchema = createInsertSchema(inAppNotifications).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
});

export type InsertInAppNotification = z.infer<typeof insertInAppNotificationSchema>;
export type InAppNotification = typeof inAppNotifications.$inferSelect;

// Push Subscriptions - Store client push notification subscriptions for PWA
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Coach Push Subscriptions - Store coach push notification subscriptions for web push
export const coachPushSubscriptions = pgTable("coach_push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertCoachPushSubscriptionSchema = createInsertSchema(coachPushSubscriptions).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertCoachPushSubscription = z.infer<typeof insertCoachPushSubscriptionSchema>;
export type CoachPushSubscription = typeof coachPushSubscriptions.$inferSelect;

// Reminder Types for smart triggers
export const REMINDER_TYPES = [
  "goal_weight",
  "goal_workout", 
  "goal_nutrition",
  "goal_general",
  "plan_daily",
  "inactivity_meals",
  "inactivity_workouts",
  "inactivity_checkin",
  "inactivity_general",
  "daily_breakfast",
  "daily_lunch",
  "daily_dinner",
] as const;
export type ReminderType = typeof REMINDER_TYPES[number];

// Client Reminder Settings - Per-client reminder configuration
export const clientReminderSettings = pgTable("client_reminder_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().unique(),
  coachId: varchar("coach_id").notNull(),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  goalRemindersEnabled: boolean("goal_reminders_enabled").notNull().default(true),
  planRemindersEnabled: boolean("plan_reminders_enabled").notNull().default(true),
  inactivityRemindersEnabled: boolean("inactivity_reminders_enabled").notNull().default(true),
  inactivityThresholdDays: integer("inactivity_threshold_days").notNull().default(1),
  quietHoursStart: text("quiet_hours_start").notNull().default("21:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
  timezone: text("timezone").notNull().default("America/New_York"),
  maxRemindersPerDay: integer("max_reminders_per_day").notNull().default(3),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertClientReminderSettingsSchema = createInsertSchema(clientReminderSettings).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertClientReminderSettings = z.infer<typeof insertClientReminderSettingsSchema>;
export type ClientReminderSettings = typeof clientReminderSettings.$inferSelect;

// Sent Reminders - Track sent reminders to prevent duplicates
export const sentReminders = pgTable("sent_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  reminderType: text("reminder_type").notNull(), // ReminderType
  reminderCategory: text("reminder_category").notNull(), // "goal" | "plan" | "inactivity"
  title: text("title").notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").notNull(),
  sentDate: text("sent_date").notNull(), // YYYY-MM-DD for daily dedup
  deliveryStatus: text("delivery_status").notNull().default("sent"), // "sent" | "delivered" | "failed"
  relatedGoalId: varchar("related_goal_id"),
  relatedPlanId: varchar("related_plan_id"),
}, (table) => ({
  clientIdIdx: index("sent_reminders_client_id_idx").on(table.clientId),
  sentDateIdx: index("sent_reminders_sent_date_idx").on(table.sentDate),
}));

export const insertSentReminderSchema = createInsertSchema(sentReminders).omit({
  id: true,
}).extend({
  reminderType: z.enum(REMINDER_TYPES),
  reminderCategory: z.enum(["goal", "plan", "inactivity", "daily_checkin"]),
  deliveryStatus: z.enum(["sent", "delivered", "failed"]).optional(),
});

export type InsertSentReminder = z.infer<typeof insertSentReminderSchema>;
export type SentReminder = typeof sentReminders.$inferSelect;

// Progress Photos - Store client progress photos with privacy controls
export const progressPhotos = pgTable("progress_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  photoDate: text("photo_date").notNull(), // YYYY-MM-DD for the date the photo represents
  isSharedWithCoach: boolean("is_shared_with_coach").notNull().default(true),
  uploadedAt: text("uploaded_at").notNull(),
}, (table) => ({
  clientIdIdx: index("progress_photos_client_id_idx").on(table.clientId),
  coachIdIdx: index("progress_photos_coach_id_idx").on(table.coachId),
  photoDateIdx: index("progress_photos_photo_date_idx").on(table.photoDate),
}));

export const insertProgressPhotoSchema = createInsertSchema(progressPhotos).omit({
  id: true,
}).extend({
  uploadedAt: z.string().optional(),
});

export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
