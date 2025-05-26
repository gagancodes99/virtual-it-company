"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { useUIStore } from "@/stores/useUIStore";
import { Plus, X } from "lucide-react";

const agentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  model: z.object({
    provider: z.enum(["openai", "anthropic", "custom"]),
    model: z.string().min(1, "Model is required"),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(100).max(8000),
  }),
  capabilities: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    specializations: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  settings: z.object({
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
      timezone: z.string(),
    }),
    responseTime: z.number().min(1),
    maxConcurrentTasks: z.number().min(1).max(10),
    autoAssign: z.boolean(),
  }),
});

type AgentFormData = z.infer<typeof agentSchema>;

const agentTypes = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
  "DevOps Engineer",
  "QA Tester",
  "Project Manager",
  "Technical Writer",
];

const modelOptions = {
  openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-sonnet", "claude-3-haiku", "claude-3-opus"],
  custom: ["custom-model"],
};

export function CreateAgentDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");
  const { addNotification } = useUIStore();
  
  const createAgent = trpc.agent.create.useMutation({
    onSuccess: () => {
      addNotification({
        title: "Agent Created",
        message: "AI agent has been successfully created and is now training.",
        type: "success",
      });
      setOpen(false);
      reset();
    },
    onError: (error) => {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      skills: [],
      model: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
      },
      capabilities: {
        languages: [],
        frameworks: [],
        specializations: [],
        tools: [],
      },
      settings: {
        workingHours: {
          start: "09:00",
          end: "17:00",
          timezone: "UTC",
        },
        responseTime: 300,
        maxConcurrentTasks: 3,
        autoAssign: false,
      },
    },
  });

  const watchedProvider = watch("model.provider");
  const watchedSkills = watch("skills");

  const addSkill = () => {
    if (currentSkill.trim() && !watchedSkills.includes(currentSkill.trim())) {
      setValue("skills", [...watchedSkills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setValue("skills", watchedSkills.filter(skill => skill !== skillToRemove));
  };

  const onSubmit = (data: AgentFormData) => {
    createAgent.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create AI Agent</DialogTitle>
          <DialogDescription>
            Configure a new AI agent to assist with your projects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Alex Frontend Developer"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Agent Type</Label>
              <Select onValueChange={(value) => setValue("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  {agentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe what this agent specializes in..."
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div>
            <Label>Skills</Label>
            <div className="flex space-x-2 mt-2">
              <Input
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                placeholder="Add a skill"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button type="button" onClick={addSkill} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {watchedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
            {errors.skills && (
              <p className="text-sm text-destructive">{errors.skills.message}</p>
            )}
          </div>

          {/* Model Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Model Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Provider</Label>
                <Select 
                  defaultValue="openai"
                  onValueChange={(value) => setValue("model.provider", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Model</Label>
                <Select onValueChange={(value) => setValue("model.model", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions[watchedProvider]?.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  {...register("model.temperature", { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="100"
                  max="8000"
                  {...register("model.maxTokens", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responseTime">Response Time (seconds)</Label>
                <Input
                  id="responseTime"
                  type="number"
                  min="1"
                  {...register("settings.responseTime", { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="maxTasks">Max Concurrent Tasks</Label>
                <Input
                  id="maxTasks"
                  type="number"
                  min="1"
                  max="10"
                  {...register("settings.maxConcurrentTasks", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAgent.isPending}>
              {createAgent.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}