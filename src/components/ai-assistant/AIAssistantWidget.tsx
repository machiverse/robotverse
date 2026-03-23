import React, { useState } from "react";
import { Bot, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AIAssistantChat from "./AIAssistantChat";

const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group"
          aria-label="Open RobotVerse AI Assistant"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-background" />
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 shadow-2xl rounded-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="relative">
            {/* Top bar controls */}
            <div className="absolute -top-2 right-2 z-10 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-foreground/70 hover:text-foreground bg-background/80 backdrop-blur-sm rounded-full"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/ai-assistant");
                }}
                title="Open full-page assistant"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-foreground/70 hover:text-foreground bg-background/80 backdrop-blur-sm rounded-full"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <AIAssistantChat />
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistantWidget;
