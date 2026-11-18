import { Logger } from '@nestjs/common';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { ArmyListEntity, ListProductEntity } from 'src/domain/database';
import { ListPricing } from 'src/domain/shop';

export class UpdatePrices extends Command<UpdatePricesResult> {
  constructor(public readonly eventId?: number) {
    super();
  }
}

export class UpdatePricesResult {
  constructor(public readonly lists: number) {}
}

@CommandHandler(UpdatePrices)
export class UpdatePricesHandler implements ICommandHandler<UpdatePrices, UpdatePricesResult> {
  private readonly logger = new Logger(UpdatePricesHandler.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pricing: ListPricing,
  ) {}

  async execute({ eventId }: UpdatePrices): Promise<UpdatePricesResult> {
    const lists = await this.dataSource.getRepository(ArmyListEntity).find({
      where: eventId ? { eventId } : {},
      select: { id: true },
    });
    if (lists.length === 0) {
      return new UpdatePricesResult(0);
    }

    const listIds = lists.map(({ id }) => id);
    const selections = await this.pricing.priceLists(listIds);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ListProductEntity, { listId: In(listIds) });

      for (const [listId, { price, products: selected, unpricedModels }] of selections) {
        await manager.update(ArmyListEntity, listId, { price, unpricedModels });

        if (selected.length > 0) {
          await manager.insert(
            ListProductEntity,
            selected.map(({ id: productId, quantity }) => ({ listId, productId, quantity })),
          );
        }
      }
    });

    this.logger.log(`Updated the prices of ${listIds.length} lists.`);
    return new UpdatePricesResult(listIds.length);
  }
}
