// src/capabilities/registry.ts

import { Capability } from "./types";

export class CapabilityRegistry {
  private capabilities: Capability[] = [];

  register(capability: Capability): void {
    this.capabilities.push(capability);
  }

  getAll(): Capability[] {
    return [...this.capabilities];
  }

  getById(id: string): Capability | undefined {
    return this.capabilities.find(
      (capability) => capability.id === id
    );
  }
}