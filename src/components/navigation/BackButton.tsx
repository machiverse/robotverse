import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
}

export default function BackButton({
  fallbackPath = "/",
  label = "Back",
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <div className="container mx-auto px-4 py-3 border-b border-border bg-card/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
