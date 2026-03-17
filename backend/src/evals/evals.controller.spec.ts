import { Test, TestingModule } from '@nestjs/testing';
import { EvalsController } from './evals.controller';
import { EvalsService } from './evals.service';

describe('EvalsController', () => {
  let controller: EvalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvalsController],
      providers: [EvalsService],
    }).compile();

    controller = module.get<EvalsController>(EvalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
