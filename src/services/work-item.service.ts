import type { Logger } from 'pino';
import { createWorkItem, type WorkItemId, type WorkItem } from '../domain/work-item.js';
import { fail, ok, type Result } from '../domain/errors.js';
import type { IWorkItemRepository } from '../repositories/work-item.repository.interface.js';
import type { IWorkItemService } from './work-item.service.interface.js';

export class WorkItemService implements IWorkItemService {
  constructor(
    private readonly repository: IWorkItemRepository,
    private readonly log: Logger,
  ) {}

  async listAll(): Promise<readonly WorkItem[]> {
    this.log.debug('Listing all work items');
    return this.repository.findAll();
  }

  async getById(id: WorkItemId): Promise<Result<WorkItem>> {
    const item = await this.repository.findById(id);

    if (!item) {
      this.log.warn({ workItemId: id }, 'Work item not found');
      return fail({ kind: 'NotFound', id });
    }

    return ok(item);
  }

  async create(title: string): Promise<Result<WorkItem>> {
    if (!title.trim()) {
      return fail({ kind: 'ValidationError', message: 'Title must not be blank.' });
    }

    const item = createWorkItem(title);
    await this.repository.save(item);

    this.log.info({ workItemId: item.id, title: item.title }, 'Work item created');
    return ok(item);
  }

  async delete(id: WorkItemId): Promise<Result<true>> {
    const deleted = await this.repository.deleteById(id);

    if (!deleted) {
      this.log.warn({ workItemId: id }, 'Delete failed — work item not found');
      return fail({ kind: 'NotFound', id });
    }

    this.log.info({ workItemId: id }, 'Work item deleted');
    return ok(true);
  }
}
