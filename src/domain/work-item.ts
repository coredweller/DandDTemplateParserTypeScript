// ── Branded ID — prevents passing a raw string where WorkItemId is expected ──
export type WorkItemId = string & { readonly _brand: 'WorkItemId' };

export function newWorkItemId(): WorkItemId {
  return crypto.randomUUID() as WorkItemId;
}

export function workItemIdFrom(value: string): WorkItemId {
  return value as WorkItemId;
}

// ── Aggregate root ─────────────────────────────────────────────────────────
export interface WorkItem {
  readonly id: WorkItemId;
  readonly title: string;
  readonly createdAt: Date;
}

// Factory — only valid WorkItems can be constructed
export function createWorkItem(title: string): WorkItem {
  return {
    id: newWorkItemId(),
    title: title.trim(),
    createdAt: new Date(),
  };
}

// Reconstitute from persistence (no business rules applied)
export function reconstituteWorkItem(
  id: string,
  title: string,
  createdAt: Date,
): WorkItem {
  return { id: workItemIdFrom(id), title, createdAt };
}
