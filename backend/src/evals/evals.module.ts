import { Module } from '@nestjs/common';
import { EvalsService } from './evals.service';
import { EvalsController } from './evals.controller';
import { SuitesController } from './suites.controller';
import { SuitesService } from './suites.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [EvalsController, SuitesController],
  providers: [EvalsService, SuitesService],
})
export class EvalsModule {}
