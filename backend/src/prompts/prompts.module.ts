import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
  controllers: [PromptsController, VersionsController],
  providers: [PromptsService, VersionsService],
})
export class PromptsModule {}
