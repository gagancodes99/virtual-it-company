'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Activity,
  GitBranch,
  Globe,
  FileCode,
  TestTube,
  Rocket,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string;
  agentType: 'pm' | 'developer' | 'tester' | 'devops';
  startedAt?: Date;
  completedAt?: Date;
  estimatedTime?: number;
  actualTime?: number;
}

interface ProjectMilestone {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  tasks: ProjectTask[];
  dueDate: Date;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  progress: number;
  startDate: Date;
  estimatedCompletion: Date;
  budget: number;
  spent: number;
  client: {
    name: string;
    email: string;
    avatar?: string;
  };
  milestones: ProjectMilestone[];
  activeAgents: {
    id: string;
    name: string;
    type: string;
    status: 'idle' | 'working' | 'completed';
    currentTask?: string;
  }[];
  metrics: {
    tasksCompleted: number;
    tasksTotal: number;
    codeQuality: number;
    testCoverage: number;
    deploymentReadiness: number;
  };
  recentActivity: {
    id: string;
    agent: string;
    action: string;
    timestamp: Date;
    details?: string;
  }[];
}

interface ProjectProgressProps {
  projectId: string;
  initialData?: ProjectData;
}

export function ProjectProgress({ projectId, initialData }: ProjectProgressProps) {
  const [projectData, setProjectData] = useState<ProjectData | null>(initialData || null);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData) {
      // Fetch project data
      fetchProjectData();
    }

    // Set up real-time updates
    const eventSource = new EventSource(`/api/projects/${projectId}/stream`);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      handleProjectUpdate(update);
    };

    return () => {
      eventSource.close();
    };
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      setProjectData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
      setIsLoading(false);
    }
  };

  const handleProjectUpdate = (update: any) => {
    setProjectData((prev) => {
      if (!prev) return prev;
      // Update project data based on the update type
      return {
        ...prev,
        ...update,
      };
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Circle className="h-5 w-5 text-gray-400" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'pm':
        return <Users className="h-4 w-4" />;
      case 'developer':
        return <FileCode className="h-4 w-4" />;
      case 'tester':
        return <TestTube className="h-4 w-4" />;
      case 'devops':
        return <Rocket className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  if (isLoading || !projectData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{projectData.name}</CardTitle>
              <CardDescription>Project ID: {projectData.id}</CardDescription>
            </div>
            <Badge variant={projectData.status === 'completed' ? 'default' : 'secondary'}>
              {projectData.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span className="font-medium">{projectData.progress}%</span>
              </div>
              <Progress value={projectData.progress} className="h-3" />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {new Date(projectData.startDate).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Est. Completion</p>
                <p className="font-medium">
                  {new Date(projectData.estimatedCompletion).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-medium">${projectData.budget.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="font-medium text-green-600">
                  ${projectData.spent.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Client Info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar>
                <AvatarImage src={projectData.client.avatar} />
                <AvatarFallback>{projectData.client.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{projectData.client.name}</p>
                <p className="text-sm text-muted-foreground">{projectData.client.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Progress Tabs */}
      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="agents">Active Agents</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="space-y-4">
          {projectData.milestones.map((milestone) => (
            <Card key={milestone.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedMilestone(milestone.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(milestone.status)}
                    <div>
                      <CardTitle className="text-lg">{milestone.name}</CardTitle>
                      <CardDescription>
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{milestone.progress}%</div>
                    <div className="text-sm text-muted-foreground">
                      {milestone.tasks.filter(t => t.status === 'completed').length} / {milestone.tasks.length} tasks
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={milestone.progress} className="h-2" />
                {selectedMilestone === milestone.id && (
                  <div className="mt-4 space-y-2">
                    {milestone.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getAgentIcon(task.agentType)}
                              <span className="text-sm text-muted-foreground">
                                {task.assignedTo}
                              </span>
                            </div>
                          </div>
                        </div>
                        {task.status === 'in_progress' && (
                          <Badge variant="secondary" className="animate-pulse">
                            In Progress
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectData.activeAgents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getAgentIcon(agent.type)}
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                    </div>
                    <Badge variant={agent.status === 'working' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {agent.currentTask ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Task:</p>
                      <p className="text-sm text-muted-foreground">{agent.currentTask}</p>
                      {agent.status === 'working' && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Activity className="h-3 w-3 animate-pulse" />
                          Working...
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Idle</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed Tasks</span>
                    <span className="font-medium">
                      {projectData.metrics.tasksCompleted} / {projectData.metrics.tasksTotal}
                    </span>
                  </div>
                  <Progress 
                    value={(projectData.metrics.tasksCompleted / projectData.metrics.tasksTotal) * 100} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Code Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quality Score</span>
                    <span className="font-medium">{projectData.metrics.codeQuality}%</span>
                  </div>
                  <Progress value={projectData.metrics.codeQuality} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Coverage</span>
                    <span className="font-medium">{projectData.metrics.testCoverage}%</span>
                  </div>
                  <Progress value={projectData.metrics.testCoverage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deployment Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Readiness</span>
                    <span className="font-medium">{projectData.metrics.deploymentReadiness}%</span>
                  </div>
                  <Progress value={projectData.metrics.deploymentReadiness} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Real-time updates from AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{activity.agent}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{activity.action}</p>
                      {activity.details && (
                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" className="flex-1">
          <MessageSquare className="mr-2 h-4 w-4" />
          Contact Team
        </Button>
        <Button variant="outline" className="flex-1">
          <GitBranch className="mr-2 h-4 w-4" />
          View Repository
        </Button>
        <Button variant="outline" className="flex-1">
          <Globe className="mr-2 h-4 w-4" />
          Preview Site
        </Button>
      </div>
    </div>
  );
}