import { Module } from '@nestjs/common';
import { ImageLibraryService } from './image-library.service';
import { ImageLibraryController } from './image-library.controller';

@Module({
  controllers: [ImageLibraryController],
  providers: [ImageLibraryService],
})
export class ImageLibraryModule {}
