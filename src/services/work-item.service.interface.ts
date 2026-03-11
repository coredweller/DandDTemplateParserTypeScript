import type { WorkItem, WorkItemId } from '../domain/work-item.js';
import type { Result } from '../domain/errors.js';

export interface IWorkItemService {
  listAll(): Promise<readonly WorkItem[]>;
  getById(id: WorkItemId): Promise<Result<WorkItem>>;
  create(title: string): Promise<Result<WorkItem>>;
  delete(id: WorkItemId): Promise<Result<true>>;
}
