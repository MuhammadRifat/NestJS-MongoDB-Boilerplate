import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImageLibraryModule } from './image-library/image-library.module';

@Module({
  imports: [ImageLibraryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
