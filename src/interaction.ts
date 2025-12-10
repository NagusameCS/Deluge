import { AbstractMesh } from "@babylonjs/core";
import type { DamageCategory } from "./state";
import { GameState } from "./state";

export type ResourceType = "wood" | "stone" | "generic";
type DamageableKind = "resource" | "mob" | "animal";

interface DamageableState {
    hp: number;
    kind: DamageableKind;
    resourceType?: ResourceType;
    reward?: Record<string, number>;
    skillPoints?: number;
}

export class InteractionSystem {
    private targets = new Map<string, DamageableState>();
    private state: GameState;

    constructor(state: GameState) {
        this.state = state;
    }

    register(mesh: AbstractMesh, config: DamageableState) {
        mesh.metadata = {
            ...(mesh.metadata || {}),
            damageable: true,
            kind: config.kind,
            resourceType: config.resourceType,
        };
        this.targets.set(mesh.uniqueId.toString(), config);
    }

    handleHit(mesh: AbstractMesh, baseDamage: number, overrideCategory?: DamageCategory) {
        const state = this.targets.get(mesh.uniqueId.toString());
        if (!state) return;

        const damage = this.getDamage(baseDamage, state, overrideCategory);
        state.hp -= damage;

        if (state.hp <= 0) {
            mesh.dispose();
            this.targets.delete(mesh.uniqueId.toString());
            if (state.reward) {
                for (const [item, qty] of Object.entries(state.reward)) {
                    this.state.addResource(item, qty);
                }
            }
            if (state.skillPoints) {
                this.state.addSkillPoints(state.skillPoints);
            }
        } else {
            this.targets.set(mesh.uniqueId.toString(), state);
        }
    }

    private getDamage(baseDamage: number, state: DamageableState, overrideCategory?: DamageCategory) {
        const category: DamageCategory = overrideCategory || state.resourceType || (state.kind === "mob" ? "mob" : state.kind === "animal" ? "animal" : "generic");
        const bonus = this.state.getDamageBonus(category);
        // Light weighting for softer resources
        if (state.kind === "resource") {
            return baseDamage * 0.7 + bonus;
        }
        return baseDamage + bonus;
    }
}
