import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {

  constructor(
    private usersService: UsersService
  ) {}

  @Post()
  createUser(@Body() data: any) {
    return this.usersService.create(data);
  }

}
