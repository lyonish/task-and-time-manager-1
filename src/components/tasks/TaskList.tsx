"use client";

import { useState } from "react";
import { TaskRow } from "./TaskRow";
import { QuickAddTask } from "./QuickAddTask";
import { TaskDetailPanel } from "./TaskDetailPanel";

interface Status {
  id: string;
  name: string;
  color: string | null;
  isCompleted: boolean | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  statusId: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
  priority: "None" | "Low" | "Medium" | "High" | "Urgent";
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  status?: Status | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TaskListProps {
  projectId: string;
  statuses: Status[];
  tasks: Task[];
  members: Member[];
  currentUserId: string;
}

export function TaskList({ projectId, statuses, tasks, members, currentUserId }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="p-6 space-y-1">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            statuses={statuses}
            members={members}
            onClick={() => handleTaskClick(task)}
          />
        ))}
        <QuickAddTask projectId={projectId} />
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        statuses={statuses}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}
