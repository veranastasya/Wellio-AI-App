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
}

const SECTION_TEMPLATES = [
  { heading: "Summary", content: "Brief overview of the wellness plan..." },
  { heading: "Key Goals", content: "• Goal 1\n• Goal 2\n• Goal 3" },
  { heading: "Weekly Structure", content: "Monday:\nTuesday:\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:" },
  { heading: "Movement & Activity Habits", content: "Describe recommended physical activities, frequency, duration, and intensity..." },
  { heading: "Nutrition Habits", content: "List simple, sustainable nutrition guidelines..." },
  { heading: "Sleep & Recovery", content: "Sleep duration target and recovery practices..." },
  { heading: "Stress Management & Mindset", content: "Mindfulness practices and stress reduction techniques..." },
  { heading: "Environment & Routines", content: "Daily routines and environmental optimizations..." },
  { heading: "Weekly Checkpoints & Metrics", content: "Metrics to track:\n• Metric 1\n• Metric 2\n• Metric 3" },
];

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
}: PlanBuilderContentProps) {
  const isMobile = useIsMobile();
  const isAssigned = planStatus === "ASSIGNED";

  const [isCanvasDrawerOpen, setIsCanvasDrawerOpen] = useState(false);
  
  if (isMobile) {
    const hasCanvasContent = planContent.trim().length > 0;
    const contentWordCount = planContent.trim().split(/\s+/).filter(Boolean).length;
    
    return (
      <div className="flex flex-col h-full gap-3">
        {/* Canvas button bar at top */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={hasCanvasContent ? "default" : "outline"}
            onClick={() => setIsCanvasDrawerOpen(true)}
            className="flex-1"
            data-testid="button-open-canvas-mobile"
          >
            <PenLine className="w-4 h-4 mr-2" />
            {hasCanvasContent ? `Canvas (${contentWordCount} words)` : "Open Canvas"}
          </Button>
          {isAssigned && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-9 px-3">
              <CheckCircle className="w-4 h-4 mr-1" />
              Assigned
            </Badge>
          )}
        </div>
        
        {/* Mobile Canvas Drawer */}
        <Drawer open={isCanvasDrawerOpen} onOpenChange={setIsCanvasDrawerOpen}>
          <DrawerContent className="h-[90vh] max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Plan Canvas
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 flex flex-col px-4 pb-4 min-h-0 overflow-hidden">
              {/* Plan name and section template */}
              <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
                <Input
                  type="text"
                  placeholder="Plan filename"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="text-sm min-h-10"
                  data-testid="input-canvas-filename-mobile"
                />
                <Select onValueChange={(value) => {
                  const template = SECTION_TEMPLATES.find(t => t.heading === value);
                  if (template) handleAddSection(template);
                }}>
                  <SelectTrigger className="min-h-10 text-sm">
                    <SelectValue placeholder="Add section template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TEMPLATES.map((template) => (
                      <SelectItem key={template.heading} value={template.heading}>
                        {template.heading}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Canvas textarea */}
              <div className="flex-1 min-h-0 mb-3">
                {!planContent.trim() ? (
                  <div className="text-center text-muted-foreground py-8 h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-sm">Your plan canvas is empty</p>
                    <p className="text-xs mt-2">Tap "Add to Canvas" on AI messages</p>
                    <p className="text-xs mt-1">Or use section templates above</p>
                  </div>
                ) : (
                  <Textarea
                    value={planContent}
                    onChange={(e) => setPlanContent(e.target.value)}
                    className="h-full text-sm resize-none font-mono leading-relaxed"
                    placeholder="Your plan content will appear here..."
                    data-testid="textarea-plan-canvas-mobile"
                  />
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleSavePlan}
                  disabled={isSaving || !planContent.trim() || !planName.trim()}
                  className="flex-1"
                  data-testid="button-download-pdf-mobile"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isSaving ? "Generating..." : "PDF"}
                </Button>
                {isAssigned ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-9 px-4 flex items-center justify-center flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assigned
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
                    {isAssigning ? "Assigning..." : "Assign"}
                  </Button>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        
        {/* Chat Card */}
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4" />
              AI Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 pb-4">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-3 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-sm">Chat with AI to generate plan content</p>
                    <p className="text-xs mt-2">Ask questions, request sections, or get suggestions</p>
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
                    {/* Add to Canvas button for AI messages on mobile */}
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
                          Add to Canvas
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
                placeholder="Ask AI to create plan sections..."
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
              AI Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-3 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Chat with AI to generate plan content</p>
                    <p className="text-sm mt-2">Ask questions, request sections, or get suggestions</p>
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
                          Add to Canvas
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
                placeholder="Ask AI to create plan sections..."
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
                  Plan Canvas
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
                  placeholder="Plan filename"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="text-sm min-h-8 w-full sm:w-48 flex-shrink-0"
                  data-testid="input-canvas-filename"
                />
                <Select onValueChange={(value) => {
                  const template = SECTION_TEMPLATES.find(t => t.heading === value);
                  if (template) handleAddSection(template);
                }}>
                  <SelectTrigger className="w-full sm:w-40 min-h-8 text-sm">
                    <SelectValue placeholder="Add section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TEMPLATES.map((template) => (
                      <SelectItem key={template.heading} value={template.heading}>
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
                    <span className="hidden sm:inline">{isSaving ? "Generating..." : "Download PDF"}</span>
                    <span className="sm:hidden">{isSaving ? "..." : "PDF"}</span>
                  </Button>
                  {isAssigned ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600 min-h-8 px-2 sm:px-3 text-xs sm:text-sm">
                      <CheckCircle className="w-3 h-3 sm:mr-1" />
                      <span className="hidden sm:inline">Plan Assigned</span>
                      <span className="sm:hidden">Done</span>
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
                      <span className="hidden sm:inline">{isAssigning ? "Assigning..." : "Assign to Client"}</span>
                      <span className="sm:hidden">{isAssigning ? "..." : "Assign"}</span>
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
                <p className="font-medium">Your plan canvas is empty</p>
                <p className="text-sm mt-2">Chat with AI and click "Add to Canvas" to start building</p>
                <p className="text-sm mt-1">Or use the dropdown above to add pre-structured sections</p>
              </div>
            ) : (
              <Textarea
                ref={canvasTextareaRef}
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
                className={`flex-1 text-sm resize-none border focus-visible:ring-1 font-mono leading-relaxed ${
                  isCanvasExpanded ? 'min-h-[calc(100vh-200px)]' : 'min-h-[400px]'
                }`}
                placeholder="Your plan content will appear here..."
                data-testid="textarea-plan-canvas"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
