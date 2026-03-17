import { Test, TestingModule } from '@nestjs/testing';
import { EvalsService } from './evals.service';

describe('EvalsService', () => {
  let service: EvalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvalsService],
    }).compile();

    service = module.get<EvalsService>(EvalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
