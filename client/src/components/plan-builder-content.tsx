import { useState } from "react";
import { Activity, FileText, Send, Loader2, Download, Minimize2, Maximize2, ArrowLeft, UserPlus, CheckCircle, Monitor, Plus, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import type { SupportedLanguage } from "@shared/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlanBuilderContentProps {
  messages: Message[];
  input: string;
  planName: string;
  planContent: string;
  planStatus?: string;
  isSaving: boolean;
  isAssigning: boolean;
  isCanvasExpanded: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  canvasTextareaRef: React.RefObject<HTMLTextAreaElement>;
  chatMutation: any;
  setInput: (value: string) => void;
  setPlanName: (value: string) => void;
  setPlanContent: (value: string) => void;
  setIsCanvasExpanded: (value: boolean) => void;
  handleSendMessage: () => void;
  handleAddToCanvas: (content: string) => void;
  handleAddSection: (template: { heading: string; content: string }) => void;
  handleSavePlan: () => Promise<void>;
  handleAssignToClient: () => Promise<void>;
  lang?: SupportedLanguage;
}

const pbT = {
  aiChat: { en: "AI Chat", ru: "ИИ-чат", es: "Chat IA" },
  chatWithAI: { en: "Chat with AI to generate plan content", ru: "Общайтесь с ИИ для создания плана", es: "Chatea con la IA para generar contenido del plan" },
  askQuestions: { en: "Ask questions, request sections, or get suggestions", ru: "Задавайте вопросы, запрашивайте разделы или получайте советы", es: "Haz preguntas, solicita secciones u obtén sugerencias" },
  addToCanvas: { en: "Add to Canvas", ru: "Добавить в план", es: "Agregar al lienzo" },
  askAIPlaceholder: { en: "Ask AI to create plan sections...", ru: "Попросите ИИ создать разделы плана...", es: "Pide a la IA que cree secciones del plan..." },
  planCanvas: { en: "Plan Canvas", ru: "Редактор плана", es: "Lienzo del plan" },
  planFilename: { en: "Plan filename", ru: "Название плана", es: "Nombre del plan" },
  addSection: { en: "Add section...", ru: "Добавить раздел...", es: "Agregar sección..." },
  generating: { en: "Generating...", ru: "Генерация...", es: "Generando..." },
  downloadPdf: { en: "Download PDF", ru: "Скачать PDF", es: "Descargar PDF" },
  pdf: { en: "PDF", ru: "PDF", es: "PDF" },
  planAssigned: { en: "Plan Assigned", ru: "План назначен", es: "Plan asignado" },
  done: { en: "Done", ru: "Готово", es: "Listo" },
  assigning: { en: "Assigning...", ru: "Назначение...", es: "Asignando..." },
  assignToClient: { en: "Assign to Client", ru: "Назначить клиенту", es: "Asignar al cliente" },
  assign: { en: "Assign", ru: "Назначить", es: "Asignar" },
  assigned: { en: "Assigned", ru: "Назначен", es: "Asignado" },
  canvasEmpty: { en: "Your plan canvas is empty", ru: "Редактор плана пуст", es: "El lienzo del plan está vacío" },
  tapAddToCanvas: { en: "Tap \"Add to Canvas\" on AI messages", ru: "Нажмите \"Добавить в план\" на сообщениях ИИ", es: "Toca \"Agregar al lienzo\" en los mensajes de IA" },
  clickAddToCanvas: { en: "Chat with AI and click \"Add to Canvas\" to start building", ru: "Общайтесь с ИИ и нажмите \"Добавить в план\"", es: "Chatea con la IA y haz clic en \"Agregar al lienzo\"" },
  orUseSections: { en: "Or use section templates above", ru: "Или используйте шаблоны разделов выше", es: "O usa las plantillas de secciones de arriba" },
  orUseDropdown: { en: "Or use the dropdown above to add pre-structured sections", ru: "Или используйте выпадающее меню для добавления готовых разделов", es: "O usa el menú desplegable para agregar secciones estructuradas" },
  planContentPlaceholder: { en: "Your plan content will appear here...", ru: "Содержание плана появится здесь...", es: "El contenido del plan aparecerá aquí..." },
  openCanvas: { en: "Open Canvas", ru: "Открыть редактор", es: "Abrir lienzo" },
  canvasWords: { en: "Canvas", ru: "Редактор", es: "Lienzo" },
  words: { en: "words", ru: "слов", es: "palabras" },
  editPlan: { en: "Edit Plan", ru: "Редактировать план", es: "Editar plan" },
} as const;

const SECTION_TEMPLATES: Record<string, { heading: Record<string, string>; content: Record<string, string> }> = {
  summary: {
    heading: { en: "Summary", ru: "Резюме", es: "Resumen" },
    content: { en: "Brief overview of the wellness plan...", ru: "Краткий обзор плана оздоровления...", es: "Breve descripción del plan de bienestar..." },
  },
  goals: {
    heading: { en: "Key Goals", ru: "Ключевые цели", es: "Objetivos clave" },
    content: { en: "• Goal 1\n• Goal 2\n• Goal 3", ru: "• Цель 1\n• Цель 2\n• Цель 3", es: "• Objetivo 1\n• Objetivo 2\n• Objetivo 3" },
  },
  weekly: {
    heading: { en: "Weekly Structure", ru: "Структура недели", es: "Estructura semanal" },
    content: {
      en: "Monday:\nTuesday:\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:",
      ru: "Понедельник:\nВторник:\nСреда:\nЧетверг:\nПятница:\nСуббота:\nВоскресенье:",
      es: "Lunes:\nMartes:\nMiércoles:\nJueves:\nViernes:\nSábado:\nDomingo:",
    },
  },
  movement: {
    heading: { en: "Movement & Activity Habits", ru: "Движение и физическая активность", es: "Movimiento y hábitos de actividad" },
    content: { en: "Describe recommended physical activities, frequency, duration, and intensity...", ru: "Опишите рекомендуемые физические нагрузки, частоту, длительность и интенсивность...", es: "Describe las actividades físicas recomendadas, frecuencia, duración e intensidad..." },
  },
  nutrition: {
    heading: { en: "Nutrition Habits", ru: "Привычки питания", es: "Hábitos nutricionales" },
    content: { en: "List simple, sustainable nutrition guidelines...", ru: "Перечислите простые и устойчивые рекомендации по питанию...", es: "Lista de pautas nutricionales simples y sostenibles..." },
  },
  sleep: {
    heading: { en: "Sleep & Recovery", ru: "Сон и восстановление", es: "Sueño y recuperación" },
    content: { en: "Sleep duration target and recovery practices...", ru: "Целевая продолжительность сна и практики восстановления...", es: "Objetivo de duración del sueño y prácticas de recuperación..." },
  },
  stress: {
    heading: { en: "Stress Management & Mindset", ru: "Управление стрессом и мышление", es: "Gestión del estrés y mentalidad" },
    content: { en: "Mindfulness practices and stress reduction techniques...", ru: "Практики осознанности и техники снижения стресса...", es: "Prácticas de mindfulness y técnicas de reducción de estrés..." },
  },
  environment: {
    heading: { en: "Environment & Routines", ru: "Окружение и распорядок", es: "Entorno y rutinas" },
    content: { en: "Daily routines and environmental optimizations...", ru: "Ежедневные привычки и оптимизация окружения...", es: "Rutinas diarias y optimizaciones del entorno..." },
  },
  checkpoints: {
    heading: { en: "Weekly Checkpoints & Metrics", ru: "Еженедельные контрольные точки и метрики", es: "Puntos de control y métricas semanales" },
    content: { en: "Metrics to track:\n• Metric 1\n• Metric 2\n• Metric 3", ru: "Метрики для отслеживания:\n• Метрика 1\n• Метрика 2\n• Метрика 3", es: "Métricas a seguir:\n• Métrica 1\n• Métrica 2\n• Métrica 3" },
  },
};

function getSectionTemplates(lang: string) {
  return Object.entries(SECTION_TEMPLATES).map(([key, t]) => ({
    key,
    heading: t.heading[lang] || t.heading.en,
    content: t.content[lang] || t.content.en,
  }));
}

export function PlanBuilderContent({
  messages,
  input,
  planName,
  planContent,
  planStatus = "IN_PROGRESS",
  isSaving,
  isAssigning,
  isCanvasExpanded,
  messagesEndRef,
  canvasTextareaRef,
  chatMutation,
  setInput,
  setPlanName,
  setPlanContent,
  setIsCanvasExpanded,
  handleSendMessage,
  handleAddToCanvas,
  handleAddSection,
  handleSavePlan,
  handleAssignToClient,
  lang = "en",
}: PlanBuilderContentProps) {
  const isMobile = useIsMobile();
  const isAssigned = planStatus === "ASSIGNED";

  const [isCanvasDrawerOpen, setIsCanvasDrawerOpen] = useState(false);
  
  if (isMobile) {
    const hasCanvasContent = planContent.trim().length > 0;
    const contentWordCount = planContent.trim().split(/\s+/).filter(Boolean).length;
    
    return (
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={hasCanvasContent ? "default" : "outline"}
            onClick={() => setIsCanvasDrawerOpen(true)}
            className="flex-1"
            data-testid="button-open-canvas-mobile"
          >
            <PenLine className="w-4 h-4 mr-2" />
            {hasCanvasContent ? `${pbT.canvasWords[lang]} (${contentWordCount} ${pbT.words[lang]})` : pbT.openCanvas[lang]}
          </Button>
          {isAssigned && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-9 px-3">
              <CheckCircle className="w-4 h-4 mr-1" />
              {pbT.assigned[lang]}
            </Badge>
          )}
        </div>
        
        <Drawer open={isCanvasDrawerOpen} onOpenChange={setIsCanvasDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {pbT.editPlan[lang]}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 flex flex-col flex-1 min-h-0 overflow-auto">
              <div className="flex gap-2 mb-3 flex-shrink-0">
                <Input
                  type="text"
                  placeholder={pbT.planFilename[lang]}
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="text-sm min-h-9 flex-1"
                  data-testid="input-canvas-filename-mobile"
                />
                <Select onValueChange={(value) => {
                  const templates = getSectionTemplates(lang);
                  const template = templates.find(t => t.key === value);
                  if (template) handleAddSection({ heading: template.heading, content: template.content });
                }}>
                  <SelectTrigger className="w-32 min-h-9 text-sm">
                    <SelectValue placeholder={pbT.addSection[lang]} />
                  </SelectTrigger>
                  <SelectContent>
                    {getSectionTemplates(lang).map((template) => (
                      <SelectItem key={template.key} value={template.key}>
                        {template.heading}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-h-0 mb-3">
                {!planContent.trim() ? (
                  <div className="text-center text-muted-foreground py-8 h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-sm">{pbT.canvasEmpty[lang]}</p>
                    <p className="text-xs mt-2">{pbT.tapAddToCanvas[lang]}</p>
                    <p className="text-xs mt-1">{pbT.orUseSections[lang]}</p>
                  </div>
                ) : (
                  <Textarea
                    value={planContent}
                    onChange={(e) => setPlanContent(e.target.value)}
                    className="h-full text-sm resize-none font-mono leading-relaxed"
                    placeholder={pbT.planContentPlaceholder[lang]}
                    data-testid="textarea-plan-canvas-mobile"
                  />
                )}
              </div>
              
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleSavePlan}
                  disabled={isSaving || !planContent.trim() || !planName.trim()}
                  className="flex-1"
                  data-testid="button-download-pdf-mobile"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isSaving ? pbT.generating[lang] : pbT.pdf[lang]}
                </Button>
                {isAssigned ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-9 px-4 flex items-center justify-center flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {pbT.assigned[lang]}
                  </Badge>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleAssignToClient();
                      setIsCanvasDrawerOpen(false);
                    }}
                    disabled={isAssigning || !planContent.trim() || !planName.trim()}
                    className="flex-1"
                    data-testid="button-assign-to-client-mobile"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isAssigning ? pbT.assigning[lang] : pbT.assign[lang]}
                  </Button>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4" />
              {pbT.aiChat[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 pb-4">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-3 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-sm">{pbT.chatWithAI[lang]}</p>
                    <p className="text-xs mt-2">{pbT.askQuestions[lang]}</p>
                  </div>
                )}
                {messages.map((message, idx) => (
                  <div key={idx} className="space-y-2">
                    <div
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`message-${message.role}-${idx}`}
                      >
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                    {message.role === "assistant" && (
                      <div className="flex justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleAddToCanvas(message.content);
                            setIsCanvasDrawerOpen(true);
                          }}
                          className="ml-2 min-h-8"
                          data-testid={`button-add-to-canvas-mobile-${idx}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {pbT.addToCanvas[lang]}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={pbT.askAIPlaceholder[lang]}
                className="flex-1 min-h-10 text-base"
                rows={2}
                data-testid="input-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={chatMutation.isPending || !input.trim()}
                size="icon"
                className="h-auto min-h-10 self-end"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4">
      <div className="flex flex-col lg:flex-row flex-1 gap-3 sm:gap-4 min-h-0">
        <Card className="flex-1 lg:flex-[0.8] flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4" />
              {pbT.aiChat[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-3 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">{pbT.chatWithAI[lang]}</p>
                    <p className="text-sm mt-2">{pbT.askQuestions[lang]}</p>
                  </div>
                )}
                {messages.map((message, idx) => (
                  <div key={idx} className="space-y-2">
                    <div
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`message-${message.role}-${idx}`}
                      >
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                    {message.role === "assistant" && (
                      <div className="flex justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddToCanvas(message.content)}
                          className="ml-2 min-h-8"
                          data-testid={`button-add-to-canvas-${idx}`}
                        >
                          <ArrowLeft className="w-3 h-3 mr-1 rotate-180" />
                          {pbT.addToCanvas[lang]}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={pbT.askAIPlaceholder[lang]}
                className="flex-1 min-h-10"
                rows={2}
                data-testid="input-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={chatMutation.isPending || !input.trim()}
                size="icon"
                className="h-auto min-h-10 self-end"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`flex-1 lg:flex-[1.2] flex flex-col ${isCanvasExpanded ? 'fixed inset-4 z-50' : ''}`}>
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  {pbT.planCanvas[lang]}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCanvasExpanded(!isCanvasExpanded)}
                  data-testid="button-toggle-canvas-expand"
                >
                  {isCanvasExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="text"
                  placeholder={pbT.planFilename[lang]}
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="text-sm min-h-8 w-full sm:w-48 flex-shrink-0"
                  data-testid="input-canvas-filename"
                />
                <Select onValueChange={(value) => {
                  const templates = getSectionTemplates(lang);
                  const template = templates.find(t => t.key === value);
                  if (template) handleAddSection({ heading: template.heading, content: template.content });
                }}>
                  <SelectTrigger className="w-full sm:w-40 min-h-8 text-sm">
                    <SelectValue placeholder={pbT.addSection[lang]} />
                  </SelectTrigger>
                  <SelectContent>
                    {getSectionTemplates(lang).map((template) => (
                      <SelectItem key={template.key} value={template.key}>
                        {template.heading}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSavePlan}
                    disabled={isSaving || !planContent.trim() || !planName.trim()}
                    className="min-h-8 text-xs sm:text-sm"
                    data-testid="button-download-pdf"
                  >
                    <Download className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{isSaving ? pbT.generating[lang] : pbT.downloadPdf[lang]}</span>
                    <span className="sm:hidden">{isSaving ? "..." : pbT.pdf[lang]}</span>
                  </Button>
                  {isAssigned ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-8 px-2 sm:px-3 text-xs sm:text-sm">
                      <CheckCircle className="w-3 h-3 sm:mr-1" />
                      <span className="hidden sm:inline">{pbT.planAssigned[lang]}</span>
                      <span className="sm:hidden">{pbT.done[lang]}</span>
                    </Badge>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAssignToClient}
                      disabled={isAssigning || !planContent.trim() || !planName.trim()}
                      className="min-h-8 text-xs sm:text-sm"
                      data-testid="button-assign-to-client"
                    >
                      <UserPlus className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{isAssigning ? pbT.assigning[lang] : pbT.assignToClient[lang]}</span>
                      <span className="sm:hidden">{isAssigning ? "..." : pbT.assign[lang]}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col">
            {!planContent.trim() ? (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{pbT.canvasEmpty[lang]}</p>
                <p className="text-sm mt-2">{pbT.clickAddToCanvas[lang]}</p>
                <p className="text-sm mt-1">{pbT.orUseDropdown[lang]}</p>
              </div>
            ) : (
              <Textarea
                ref={canvasTextareaRef}
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
                className={`flex-1 text-sm resize-none border focus-visible:ring-1 font-mono leading-relaxed ${
                  isCanvasExpanded ? 'min-h-[calc(100vh-200px)]' : 'min-h-[400px]'
                }`}
                placeholder={pbT.planContentPlaceholder[lang]}
                data-testid="textarea-plan-canvas"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
