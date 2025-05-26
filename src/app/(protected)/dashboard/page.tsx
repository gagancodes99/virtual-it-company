"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { trpc } from "@/lib/trpc/client";
import {
  FolderOpen,
  Users,
  Bot,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuthStore();
  
  // Example data - would come from tRPC in real implementation
  const stats = {
    activeProjects: 3,
    teamMembers: 5,
    activeAgents: 2,
    completedTasks: 24,
  };

  const recentProjects = [
    {
      id: "1",
      name: "E-commerce Platform",
      status: "active",
      progress: 75,
      deadline: "2024-02-15",
    },
    {
      id: "2", 
      name: "Mobile App Redesign",
      status: "review",
      progress: 90,
      deadline: "2024-02-10",
    },
    {
      id: "3",
      name: "API Integration",
      status: "active",
      progress: 45,
      deadline: "2024-02-20",
    },
  ];

  const recentActivity = [
    {
      id: "1",
      type: "task_completed",
      message: "AI Agent Alex completed 'Setup authentication'",
      time: "2 hours ago",
    },
    {
      id: "2",
      type: "project_update",
      message: "E-commerce Platform progress updated to 75%",
      time: "4 hours ago",
    },
    {
      id: "3",
      type: "team_join",
      message: "New team member Sarah joined the Mobile App project",
      time: "1 day ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}! Here's what's happening with your projects.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dashboard/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              +1 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              2 active, 1 training
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center space-x-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {project.name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={project.status === "active" ? "default" : "secondary"}
                    >
                      {project.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {project.progress}% complete
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Due {project.deadline}
                  </p>
                </div>
              </div>
            ))}
            <Link href="/dashboard/projects">
              <Button variant="outline" className="w-full">
                View All Projects
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {activity.type === "task_completed" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {activity.type === "project_update" && (
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  )}
                  {activity.type === "team_join" && (
                    <Users className="h-4 w-4 text-purple-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/agents">
              <Button variant="outline" className="w-full h-20 flex-col">
                <Bot className="h-6 w-6 mb-2" />
                Manage AI Agents
              </Button>
            </Link>
            <Link href="/dashboard/team">
              <Button variant="outline" className="w-full h-20 flex-col">
                <Users className="h-6 w-6 mb-2" />
                Invite Team Member
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full h-20 flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                View Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}