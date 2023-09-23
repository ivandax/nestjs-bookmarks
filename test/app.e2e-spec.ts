import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';
import { CreateBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        // Removes unknown properties not defined on the DTOs
        whitelist: true,
      }),
    );

    await app.init();
    await app.listen(3334);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3334');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    it('Should fail sign up if email empty', () => {
      const dto: AuthDto = {
        email: '',
        password: 'somePassword',
      };
      return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(400);
    });

    it('Should fail sign up if password empty', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: '',
      };
      return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(400);
    });

    it('Should signup', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: 'somePassword',
      };
      return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201);
    });

    it('Should signup 2nd user', () => {
      const dto: AuthDto = {
        email: 'test2@gmail.com',
        password: 'somePassword',
      };
      return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201);
    });

    it('Should fail login if email empty', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: '',
      };
      return pactum.spec().post('/auth/login').withBody(dto).expectStatus(400);
    });

    it('Should fail login if password empty', () => {
      const dto: AuthDto = {
        email: '',
        password: 'somePassword',
      };
      return pactum.spec().post('/auth/login').withBody(dto).expectStatus(400);
    });

    it('Should fail login if user does not exist', () => {
      const dto: AuthDto = {
        email: 'someOtherUser@gmail.com',
        password: '1234',
      };
      return pactum.spec().post('/auth/login').withBody(dto).expectStatus(400);
    });

    it('Should login', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: 'somePassword',
      };
      return pactum
        .spec()
        .post('/auth/login')
        .withBody(dto)
        .expectStatus(200)
        .stores('userAccessToken', 'access_token');
    });

    it('Should login 2nd User', () => {
      const dto: AuthDto = {
        email: 'test2@gmail.com',
        password: 'somePassword',
      };
      return pactum
        .spec()
        .post('/auth/login')
        .withBody(dto)
        .expectStatus(200)
        .stores('userAccessToken2', 'access_token');
    });
  });

  describe('User', () => {
    it('Should fail to get current user', () => {
      return pactum.spec().get('/users/me').expectStatus(401);
    });

    it('Should get current user', () => {
      return pactum
        .spec()
        .get('/users/me')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .expectStatus(200)
        .expectBodyContains('test@gmail.com');
    });

    it('Should fail to update current user without auth', () => {
      const dto: EditUserDto = {
        firstName: 'Bruce',
        lastName: 'Wayne',
      };
      return pactum.spec().patch('/users/me').withBody(dto).expectStatus(401);
    });

    it('Should update current user', () => {
      const dto: EditUserDto = {
        firstName: 'Bruce',
        lastName: 'Wayne',
      };
      return pactum
        .spec()
        .patch('/users/me')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .withBody(dto)
        .expectStatus(200)
        .expectBodyContains('test@gmail.com')
        .expectBodyContains('Bruce')
        .expectBodyContains('Wayne');
    });
  });

  describe('Bookmarks', () => {
    it('Should get empty bookmarks', () => {
      return pactum
        .spec()
        .get('/bookmarks')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .expectStatus(200)
        .expectBody([]);
    });

    it('Should create bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'Epic Bookmark',
        description: 'Wayne',
        link: 'some link',
      };
      return pactum
        .spec()
        .post('/bookmarks')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .withBody(dto)
        .expectStatus(201)
        .expectBodyContains('Epic Bookmark')
        .stores('storedBookmarkId', 'id');
    });

    it('Should retrieve bookmarks with length 1', () => {
      return pactum
        .spec()
        .get('/bookmarks')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .expectStatus(200)
        .expectJsonLength(1);
    });

    it('Should retrieve bookmark by id', () => {
      return pactum
        .spec()
        .get('/bookmarks')
        .withPathParams('id', '$S{storedBookmarkId}')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .expectStatus(200)
        .expectBodyContains('Epic Bookmark');
    });

    it('Should edit bookmark by id', () => {
      const dto: CreateBookmarkDto = {
        title: 'Changed Title',
        description: 'Wayne',
        link: 'some link',
      };
      return pactum
        .spec()
        .patch('/bookmarks/{id}')
        .withPathParams('id', '$S{storedBookmarkId}')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .withBody(dto)
        .expectStatus(200)
        .expectBodyContains('Changed Title');
    });

    it('Should fail to edit bookmark if does not belong to user', () => {
      const dto: CreateBookmarkDto = {
        title: 'Changed Title',
        description: 'Wayne',
        link: 'some link',
      };
      return pactum
        .spec()
        .patch('/bookmarks/{id}')
        .withPathParams('id', '$S{storedBookmarkId}')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken2}' })
        .withBody(dto)
        .expectStatus(403)
        .expectBodyContains('Access denied to this resource');
    });

    it('Should delete bookmark', () => {
      return pactum
        .spec()
        .delete('/bookmarks/{id}')
        .withPathParams('id', '$S{storedBookmarkId}')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .expectStatus(204);
    });

    it('Should get empty bookmarks after delete', () => {
      return pactum
        .spec()
        .get('/bookmarks')
        .withHeaders({ Authorization: 'Bearer $S{userAccessToken}' })
        .expectStatus(200)
        .expectBody([]);
    });
  });
});
