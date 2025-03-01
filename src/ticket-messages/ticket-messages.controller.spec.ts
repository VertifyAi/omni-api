import { Test, TestingModule } from '@nestjs/testing';
import { TicketMessagesController } from './ticket-messages.controller';

describe('TicketMessagesController', () => {
  let controller: TicketMessagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketMessagesController],
    }).compile();

    controller = module.get<TicketMessagesController>(TicketMessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
