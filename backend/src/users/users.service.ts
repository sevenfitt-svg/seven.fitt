import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {

  create(data: any) {
    return {
      message: 'User creation service ready',
      data
    };
  }

}
