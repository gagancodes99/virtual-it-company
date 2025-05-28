"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentCard } from "@/components/agents/AgentCard";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import { useUIStore } from "@/shared/stores/useUIStore";
import { Plus, Search } from "lucide-react";
import { AgentStatus } from "@/shared/types";

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const { addNotification } = useUIStore();

  // Get agents - this would be real data in implementation
    // const { data: agents = [], refetch } = trpc.agent.getAll.useQuery();
  
  const updateAgentStatus = trpc.agent.updateStatus.useMutation({
    onSuccess: () => {
      addNotification({
        title: "Status Updated",
        message: "Agent status has been updated successfully.",
        type: "success",
      });
      refetch();
    },
    onError: (error) => {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      });
    },
  });

  const deleteAgent = trpc.agent.delete.useMutation({
    onSuccess: () => {
      addNotification({
        title: "Agent Deleted",
        message: "AI agent has been deleted successfully.",
        type: "success",
      });
      refetch();
    },
    onError: (error) => {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      });
    },
  });

  // Sample agents for demonstration
  const sampleAgents = [
    {
      _id: "1",
      name: "Alex Frontend Developer",
      type: "Frontend Developer",
      description: "Specialized in React, TypeScript, and modern frontend frameworks. Excellent at creating responsive UIs and optimizing performance.",
      skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "JavaScript"],
      status: AgentStatus.ACTIVE,
      avatar: "",
      performance: {
        tasksCompleted: 45,
        averageRating: 4.8,
        reliability: 95,
        responseTimeMs: 2500,
        lastActive: new Date(),
      },
      model: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
      },
      capabilities: {
        languages: ["JavaScript", "TypeScript"],
        frameworks: ["React", "Next.js", "Vue.js"],
        specializations: ["Frontend Development", "UI/UX", "Performance Optimization"],
        tools: ["VS Code", "Figma", "Chrome DevTools"],
      },
      settings: {
        workingHours: {
          start: "09:00",
          end: "17:00",
          timezone: "UTC",
        },
        responseTime: 300,
        maxConcurrentTasks: 3,
        autoAssign: true,
      },
      tenantId: "tenant1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "2",
      name: "Sam Backend Engineer", 
      type: "Backend Developer",
      description: "Expert in Node.js, Python, and database design. Handles API development, server architecture, and DevOps tasks.",
      skills: ["Node.js", "Python", "PostgreSQL", "Docker", "AWS"],
      status: AgentStatus.TRAINING,
      avatar: "",
      performance: {
        tasksCompleted: 12,
        averageRating: 4.6,
        reliability: 88,
        responseTimeMs: 3200,
        lastActive: new Date(),
      },
      model: {
        provider: "anthropic",
        model: "claude-3-sonnet",
        temperature: 0.5,
        maxTokens: 3000,
      },
      capabilities: {
        languages: ["JavaScript", "Python", "SQL"],
        frameworks: ["Express.js", "FastAPI", "Django"],
        specializations: ["Backend Development", "API Design", "Database Optimization"],
        tools: ["VS Code", "Docker", "Postman"],
      },
      settings: {
        workingHours: {
          start: "08:00",
          end: "16:00",
          timezone: "UTC",
        },
        responseTime: 450,
        maxConcurrentTasks: 2,
        autoAssign: false,
      },
      tenantId: "tenant1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const displayAgents = sampleAgents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = (agent: any) => {
    const newStatus = agent.status === AgentStatus.ACTIVE ? AgentStatus.INACTIVE : AgentStatus.ACTIVE;
    updateAgentStatus.mutate({ id: agent._id, status: newStatus });
  };

  const handleDeleteAgent = (agent: any) => {
    if (confirm(`Are you sure you want to delete ${agent.name}?`)) {
      deleteAgent.mutate({ id: agent._id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI workforce and configure their capabilities.
          </p>
        </div>
        <CreateAgentDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </CreateAgentDialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {sampleAgents.filter(a => a.status === AgentStatus.ACTIVE).length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium">Training</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {sampleAgents.filter(a => a.status === AgentStatus.TRAINING).length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-sm font-medium">Inactive</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {sampleAgents.filter(a => a.status === AgentStatus.INACTIVE).length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Total Tasks</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {sampleAgents.reduce((sum, agent) => sum + agent.performance.tasksCompleted, 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={AgentStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={AgentStatus.INACTIVE}>Inactive</SelectItem>
            <SelectItem value={AgentStatus.TRAINING}>Training</SelectItem>
            <SelectItem value={AgentStatus.MAINTENANCE}>Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agents Grid */}
      {displayAgents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No agents found matching your criteria.</p>
          <CreateAgentDialog>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Agent
            </Button>
          </CreateAgentDialog>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayAgents.map((agent) => (
            <AgentCard
              key={agent._id}
              agent={agent as any}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteAgent}
              onEdit={(agent) => {
                // TODO: Implement edit dialog
                console.log("Edit agent:", agent);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}