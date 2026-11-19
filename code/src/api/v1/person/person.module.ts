import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PersonRepository } from './repository/person.repository';
import { PersonService } from './service/person.service';
import { PersonController } from './controller/person.controller';

import { PersonModel } from './person.model';

@Module({
  imports: [TypeOrmModule.forFeature([PersonModel])],
  controllers: [PersonController],
  providers: [PersonService, PersonRepository],
  exports: [PersonService, PersonRepository],
})
export class PersonModule {}
