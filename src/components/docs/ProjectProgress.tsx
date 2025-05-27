'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Target,
  Calendar,
  Users
} from 'lucide-react';

interface ProjectProgressProps {
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'completed' | 'current' | 'upcoming';
  tasks: number;
}

const milestones: Milestone[] = [
  { id: 'ai-foundation', title: 'AI Foundation', date: 'Week 1-2', status: 'current', tasks: 13 },
  { id: 'workflow-engine', title: 'Workflow Engine', date: 'Week 3-4', status: 'upcoming', tasks: 11 },
  { id: 'integrations', title: 'External Integrations', date: 'Week 5-6', status: 'upcoming', tasks: 10 },
  { id: 'mvp-launch', title: 'MVP Launch', date: 'Week 8', status: 'upcoming', tasks: 5 }
];

export default function ProjectProgress({ totalTasks, completedTasks, progress }: ProjectProgressProps) {
  const remainingDays = 56; // 8 weeks
  const averageVelocity = completedTasks > 0 ? Math.round(completedTasks / 7) : 0; // tasks per week
  const estimatedCompletion = averageVelocity > 0 
    ? Math.ceil((totalTasks - completedTasks) / averageVelocity) 
    : remainingDays / 7;

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Project Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Virtual IT Company Platform Implementation
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {progress}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {completedTasks} of {totalTasks} tasks
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {remainingDays}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Days Remaining</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {averageVelocity}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Tasks/Week</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {estimatedCompletion}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Weeks to Complete</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                5
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">AI Agents</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Milestones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
          Implementation Milestones
        </h3>
        
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="relative">
              {index < milestones.length - 1 && (
                <div className="absolute top-8 left-5 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
              )}
              
              <div className="flex items-start space-x-4">
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${milestone.status === 'completed' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : milestone.status === 'current'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-2 ring-indigo-500'
                    : 'bg-gray-100 dark:bg-gray-800'
                  }
                `}>
                  {milestone.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : milestone.status === 'current' ? (
                    <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {milestone.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {milestone.date} • {milestone.tasks} tasks
                      </p>
                    </div>
                    {milestone.status === 'current' && (
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-indigo-600" />
          Weekly Activity
        </h3>
        
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, i) => {
            const intensity = Math.random();
            return (
              <div
                key={i}
                className={`
                  h-8 rounded
                  ${intensity > 0.8 
                    ? 'bg-indigo-600 dark:bg-indigo-400' 
                    : intensity > 0.6
                    ? 'bg-indigo-400 dark:bg-indigo-500'
                    : intensity > 0.3
                    ? 'bg-indigo-200 dark:bg-indigo-700'
                    : 'bg-gray-100 dark:bg-gray-800'
                  }
                `}
                title={`Day ${i + 1}`}
              />
            );
          })}
        </div>
        
        <div className="flex items-center justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>4 weeks ago</span>
          <span>Today</span>
        </div>
      </Card>
    </div>
  );
}