import type { WorkItem, WorkItemId } from '../domain/work-item.js';

export interface IWorkItemRepository {
  findAll(): Promise<readonly WorkItem[]>;
  findById(id: WorkItemId): Promise<WorkItem | null>;
  save(item: WorkItem): Promise<WorkItem>;
  deleteById(id: WorkItemId): Promise<boolean>;
}
