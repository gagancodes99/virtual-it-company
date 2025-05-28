'use client';

import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Clock,
  AlertCircle,
  ChevronRight,
  ListChecks
} from 'lucide-react';

interface TaskStatusProps {
  tasks: number;
  completedTasks: number;
  progress: number;
  showDetails?: boolean;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
}

interface TaskDetail {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  assignee?: string;
  dueDate?: string;
}

const mockTaskDetails: TaskDetail[] = [
  { id: 'AI-001', title: 'Create LLM Client Interface', status: 'completed', priority: 'P0' },
  { id: 'AI-002', title: 'Implement Multi-LLM Router', status: 'in-progress', priority: 'P0' },
  { id: 'AI-003', title: 'Build Prompt Template System', status: 'pending', priority: 'P1' },
  { id: 'AGENT-001', title: 'Create Base Agent Class', status: 'pending', priority: 'P0' },
  { id: 'WORK-001', title: 'Setup n8n Integration', status: 'blocked', priority: 'P1' }
];

const priorityColors = {
  P0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  P1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  P2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  P3: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

const statusIcons = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'in-progress': <Clock className="h-4 w-4 text-blue-500" />,
  pending: <Circle className="h-4 w-4 text-gray-400" />,
  blocked: <AlertCircle className="h-4 w-4 text-red-500" />
};

export default function TaskStatus({ 
  tasks, 
  completedTasks, 
  progress, 
  showDetails = false,
  priority 
}: TaskStatusProps) {
  const remainingTasks = tasks - completedTasks;
  const inProgressTasks = showDetails ? mockTaskDetails.filter(t => t.status === 'in-progress').length : 0;
  const blockedTasks = showDetails ? mockTaskDetails.filter(t => t.status === 'blocked').length : 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <ListChecks className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Task Progress</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {completedTasks}/{tasks} completed
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Task Stats */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-gray-600 dark:text-gray-400">{completedTasks}</span>
        </div>
        
        {showDetails && inProgressTasks > 0 && (
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">{inProgressTasks}</span>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <Circle className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">{remainingTasks}</span>
        </div>
        
        {showDetails && blockedTasks > 0 && (
          <div className="flex items-center space-x-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-gray-600 dark:text-gray-400">{blockedTasks}</span>
          </div>
        )}

        {priority && (
          <Badge className={`${priorityColors[priority]} text-xs`}>
            {priority}
          </Badge>
        )}
      </div>

      {/* Detailed Task List */}
      {showDetails && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Recent Tasks
          </h4>
          {mockTaskDetails.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {statusIcons[task.status]}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {task.id} • {task.dueDate || 'No due date'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className={`${priorityColors[task.priority]} text-xs`}>
                  {task.priority}
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completion Estimate */}
      {progress > 0 && progress < 100 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            At current velocity, estimated completion in{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.ceil(remainingTasks / (completedTasks / 7))} weeks
            </span>
          </p>
        </div>
      )}
    </div>
  );
}