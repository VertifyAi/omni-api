import { Test, TestingModule } from '@nestjs/testing';
import { VeraiService } from './verai.service';

describe('VeraiService', () => {
  let service: VeraiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VeraiService],
    }).compile();

    service = module.get<VeraiService>(VeraiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
