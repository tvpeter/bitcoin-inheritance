import { Test, TestingModule } from '@nestjs/testing';
import { MnemonicsController } from './mnemonics.controller';

describe('MnemonicsController', () => {
  let controller: MnemonicsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MnemonicsController],
    }).compile();

    controller = module.get<MnemonicsController>(MnemonicsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
