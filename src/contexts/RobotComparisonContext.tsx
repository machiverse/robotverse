import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ComparisonRobot {
  id: string;
  name: string;
  model?: string;
  brand?: string;
  robot_type: string;
  price?: number;
  currency?: string;
  payload_capacity?: number;
  reach?: number;
  repeatability?: number;
  images?: string[];
  applications?: string[];
  technical_specifications?: Record<string, any>;
  condition?: string;
  location?: string;
  profiles?: {
    company_name?: string;
    full_name?: string;
  };
}

interface RobotComparisonContextType {
  selectedRobots: ComparisonRobot[];
  addRobot: (robot: ComparisonRobot) => boolean;
  removeRobot: (robotId: string) => void;
  clearComparison: () => void;
  isSelected: (robotId: string) => boolean;
  canAddMore: boolean;
  maxRobots: number;
}

const MAX_ROBOTS = 3;

const RobotComparisonContext = createContext<RobotComparisonContextType | undefined>(undefined);

export function RobotComparisonProvider({ children }: { children: ReactNode }) {
  const [selectedRobots, setSelectedRobots] = useState<ComparisonRobot[]>([]);
  const { toast } = useToast();

  const addRobot = useCallback((robot: ComparisonRobot): boolean => {
    // Check if already selected
    if (selectedRobots.some(r => r.id === robot.id)) {
      toast({
        title: "Already Selected",
        description: `${robot.name} is already in your comparison.`,
        variant: "default",
      });
      return false;
    }

    // Check max limit
    if (selectedRobots.length >= MAX_ROBOTS) {
      toast({
        title: "Maximum Reached",
        description: `You can compare up to ${MAX_ROBOTS} robots only. Remove one to add another.`,
        variant: "destructive",
      });
      return false;
    }

    setSelectedRobots(prev => [...prev, robot]);
    toast({
      title: "Added to Comparison",
      description: `${robot.name} added. ${MAX_ROBOTS - selectedRobots.length - 1} more can be added.`,
    });
    return true;
  }, [selectedRobots, toast]);

  const removeRobot = useCallback((robotId: string) => {
    setSelectedRobots(prev => {
      const robot = prev.find(r => r.id === robotId);
      if (robot) {
        toast({
          title: "Removed from Comparison",
          description: `${robot.name} has been removed.`,
        });
      }
      return prev.filter(r => r.id !== robotId);
    });
  }, [toast]);

  const clearComparison = useCallback(() => {
    setSelectedRobots([]);
    toast({
      title: "Comparison Cleared",
      description: "All robots have been removed from comparison.",
    });
  }, [toast]);

  const isSelected = useCallback((robotId: string) => {
    return selectedRobots.some(r => r.id === robotId);
  }, [selectedRobots]);

  const canAddMore = selectedRobots.length < MAX_ROBOTS;

  return (
    <RobotComparisonContext.Provider
      value={{
        selectedRobots,
        addRobot,
        removeRobot,
        clearComparison,
        isSelected,
        canAddMore,
        maxRobots: MAX_ROBOTS,
      }}
    >
      {children}
    </RobotComparisonContext.Provider>
  );
}

export function useRobotComparison() {
  const context = useContext(RobotComparisonContext);
  if (context === undefined) {
    throw new Error('useRobotComparison must be used within a RobotComparisonProvider');
  }
  return context;
}
