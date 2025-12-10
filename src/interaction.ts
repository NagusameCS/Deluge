import { AbstractMesh } from "@babylonjs/core";
import type { ToolType } from "./tools";

export type ResourceType = "tree" | "rock" | "generic";

interface ResourceState {
    hp: number;
    type: ResourceType;
}

export class InteractionSystem {
    private resources = new Map<string, ResourceState>();

    register(mesh: AbstractMesh, type: ResourceType, hp: number) {
        mesh.metadata = { ...(mesh.metadata || {}), interactable: true, resourceType: type };
        this.resources.set(mesh.uniqueId.toString(), { hp, type });
    }

    handleHit(mesh: AbstractMesh, tool: ToolType) {
        const state = this.resources.get(mesh.uniqueId.toString());
        if (!state) return;

        const damage = this.getDamage(tool, state.type);
        state.hp -= damage;
        if (state.hp <= 0) {
            mesh.dispose();
            this.resources.delete(mesh.uniqueId.toString());
        } else {
            this.resources.set(mesh.uniqueId.toString(), state);
        }
    }

    private getDamage(tool: ToolType, type: ResourceType) {
        if (type === "tree") {
            if (tool === "Axe") return 25;
            if (tool === "Sword") return 5;
            return 2;
        }
        if (type === "rock") {
            if (tool === "Pickaxe") return 25;
            if (tool === "Sword") return 3;
            return 2;
        }
        return 5;
    }
}
