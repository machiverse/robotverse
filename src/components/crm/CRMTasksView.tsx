import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Search, Clock, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import type { useCRM } from "@/hooks/useCRM";

interface CRMTasksViewProps {
  crmData: ReturnType<typeof useCRM>;
}

const CRMTasksView = ({ crmData }: CRMTasksViewProps) => {
  const { tasks, updateTask } = crmData;
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("pending");

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || task.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleComplete = async (taskId: string, completed: boolean) => {
    await updateTask(taskId, { 
      status: completed ? 'completed' : 'pending',
      completed_at: completed ? new Date().toISOString() : null 
    });
  };

  const getUrgencyBadge = (dueDate: string | null, status: string) => {
    if (status === 'completed') return <Badge variant="secondary">Completed</Badge>;
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return <Badge variant="destructive">Overdue</Badge>;
    if (isToday(date)) return <Badge>Today</Badge>;
    return <Badge variant="outline">{format(date, 'dd MMM')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks ({tasks.length})</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button><Plus className="mr-2 h-4 w-4" />Add Task</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['pending', 'completed', 'all'].map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <Checkbox 
                checked={task.status === 'completed'} 
                onCheckedChange={(checked) => handleComplete(task.id, checked as boolean)}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.subject}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize">{task.task_type}</Badge>
                  <span className="capitalize">{task.priority} priority</span>
                </div>
              </div>
              {getUrgencyBadge(task.due_date, task.status)}
            </CardContent>
          </Card>
        ))}
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mb-2 opacity-50" />
            <p>No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMTasksView;
