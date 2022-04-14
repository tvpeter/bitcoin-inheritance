import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MnemonicsController } from './mnemonics/mnemonics.controller';
import { MnemonicsService } from './mnemonics/mnemonics.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, MnemonicsController],
  providers: [AppService, MnemonicsService],
})
export class AppModule {}
