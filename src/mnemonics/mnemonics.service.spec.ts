import { Test, TestingModule } from '@nestjs/testing';
import { MnemonicsService } from './mnemonics.service';

describe('MnemonicsService', () => {
  let service: MnemonicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MnemonicsService],
    }).compile();

    service = module.get<MnemonicsService>(MnemonicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
