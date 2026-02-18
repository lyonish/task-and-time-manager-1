import { db } from "@/lib/db";
import { taskLayers, tasks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface CreateLayerInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateLayerInput {
  name?: string;
  description?: string;
  color?: string;
}

export class LayerService {
  static async getLayers(projectId: string) {
    return db.query.taskLayers.findMany({
      where: eq(taskLayers.projectId, projectId),
      orderBy: [asc(taskLayers.position)],
    });
  }

  static async getLayerById(id: string) {
    return db.query.taskLayers.findFirst({
      where: eq(taskLayers.id, id),
    });
  }

  static async createLayer(projectId: string, data: CreateLayerInput) {
    const existing = await this.getLayers(projectId);
    const maxPosition = Math.max(...existing.map((l) => l.position), -1);

    const layerId = crypto.randomUUID();
    await db.insert(taskLayers).values({
      id: layerId,
      projectId,
      name: data.name,
      description: data.description,
      color: data.color || "#6366f1",
      position: maxPosition + 1,
    });

    return this.getLayerById(layerId);
  }

  static async updateLayer(id: string, data: UpdateLayerInput) {
    const layer = await this.getLayerById(id);
    if (!layer) throw new Error("Layer not found");

    await db
      .update(taskLayers)
      .set({
        name: data.name ?? layer.name,
        description: data.description ?? layer.description,
        color: data.color ?? layer.color,
      })
      .where(eq(taskLayers.id, id));

    return this.getLayerById(id);
  }

  static async deleteLayer(id: string) {
    const layer = await this.getLayerById(id);
    if (!layer) throw new Error("Layer not found");

    // Remove layer from tasks (set to null)
    await db
      .update(tasks)
      .set({ layerId: null })
      .where(eq(tasks.layerId, id));

    await db.delete(taskLayers).where(eq(taskLayers.id, id));
  }

  static async reorderLayers(projectId: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(taskLayers)
        .set({ position: i })
        .where(eq(taskLayers.id, orderedIds[i]));
    }

    return this.getLayers(projectId);
  }

  static readonly PRESETS = {
    default: [
      { name: "Layer 1", color: "#8b5cf6", description: "Top level" },
      { name: "Layer 2", color: "#3b82f6", description: "Second level" },
      { name: "Layer 3", color: "#22c55e", description: "Third level" },
      { name: "Layer 4", color: "#9ca3af", description: "Fourth level" },
    ],
    size: [
      { name: "Large", color: "#8b5cf6", description: "Large scope items" },
      { name: "Medium", color: "#3b82f6", description: "Medium scope items" },
      { name: "Small", color: "#22c55e", description: "Small scope items" },
      { name: "Tiny", color: "#9ca3af", description: "Tiny scope items" },
    ],
    birds: [
      { name: "Condor", color: "#8b5cf6", description: "Largest initiatives" },
      { name: "Eagle", color: "#3b82f6", description: "Major features" },
      { name: "Pigeon", color: "#22c55e", description: "Regular tasks" },
      { name: "Sparrow", color: "#9ca3af", description: "Small tasks" },
    ],
    agile: [
      { name: "Epic", color: "#8b5cf6", description: "Large initiatives" },
      { name: "Story", color: "#3b82f6", description: "User stories" },
      { name: "Task", color: "#22c55e", description: "Individual work items" },
      { name: "Subtask", color: "#9ca3af", description: "Small pieces of work" },
    ],
    software: [
      { name: "Epic", color: "#8b5cf6", description: "Large initiatives" },
      { name: "Feature", color: "#3b82f6", description: "Deliverable features" },
      { name: "Task", color: "#22c55e", description: "Individual work items" },
      { name: "Subtask", color: "#9ca3af", description: "Small pieces of work" },
    ],
    traditional: [
      { name: "Phase", color: "#8b5cf6", description: "Project phases" },
      { name: "Deliverable", color: "#3b82f6", description: "Deliverables" },
      { name: "Work Package", color: "#22c55e", description: "Work packages" },
      { name: "Activity", color: "#9ca3af", description: "Activities" },
    ],
  } as const;

  static async createDefaultLayers(projectId: string, preset: keyof typeof LayerService.PRESETS = "default") {
    const layers = LayerService.PRESETS[preset];

    for (let i = 0; i < layers.length; i++) {
      await db.insert(taskLayers).values({
        id: crypto.randomUUID(),
        projectId,
        name: layers[i].name,
        description: layers[i].description,
        color: layers[i].color,
        position: i,
      });
    }
  }

  static async applyPreset(projectId: string, preset: keyof typeof LayerService.PRESETS) {
    // Delete existing layers
    const existing = await this.getLayers(projectId);
    for (const layer of existing) {
      await this.deleteLayer(layer.id);
    }

    // Create new layers from preset
    await this.createDefaultLayers(projectId, preset);
    return this.getLayers(projectId);
  }
}
