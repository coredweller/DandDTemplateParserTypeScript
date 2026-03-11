import { eq } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../db.js';
import {
  reconstituteWorkItem,
  type WorkItem,
  type WorkItemId,
} from '../domain/work-item.js';
import { workItems } from '../schema/work-items.schema.js';
import type { IWorkItemRepository } from './work-item.repository.interface.js';

export class DrizzleWorkItemRepository implements IWorkItemRepository {
  constructor(
    private readonly db: Db,
    private readonly log: Logger,
  ) {}

  async findAll(): Promise<readonly WorkItem[]> {
    this.log.debug('Fetching all work items');
    const rows = await this.db
      .select()
      .from(workItems)
      .orderBy(workItems.createdAt);
    return rows.map((r) => reconstituteWorkItem(r.id, r.title, r.createdAt));
  }

  async findById(id: WorkItemId): Promise<WorkItem | null> {
    const rows = await this.db
      .select()
      .from(workItems)
      .where(eq(workItems.id, id))
      .limit(1);

    const row = rows[0];
    return row ? reconstituteWorkItem(row.id, row.title, row.createdAt) : null;
  }

  async save(item: WorkItem): Promise<WorkItem> {
    this.log.debug({ workItemId: item.id }, 'Saving work item');
    await this.db.insert(workItems).values({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
    });
    return item;
  }

  async deleteById(id: WorkItemId): Promise<boolean> {
    const deleted = await this.db
      .delete(workItems)
      .where(eq(workItems.id, id))
      .returning({ id: workItems.id });
    return deleted.length > 0;
  }
}
