import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from 'src/auth/dto';

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
      return pactum
        .spec()
        .post('/auth/signup')
        .withBody(dto)
        .expectStatus(400)
        .inspect();
    });

    it('Should fail sign up if password empty', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: '',
      };
      return pactum
        .spec()
        .post('/auth/signup')
        .withBody(dto)
        .expectStatus(400)
        .inspect();
    });

    it('Should signup', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: 'somePassword',
      };
      return pactum
        .spec()
        .post('/auth/signup')
        .withBody(dto)
        .expectStatus(201)
        .inspect();
    });

    it('Should fail login if email empty', () => {
      const dto: AuthDto = {
        email: 'test@gmail.com',
        password: '',
      };
      return pactum
        .spec()
        .post('/auth/login')
        .withBody(dto)
        .expectStatus(400)
        .inspect();
    });

    it('Should fail login if password empty', () => {
      const dto: AuthDto = {
        email: '',
        password: 'somePassword',
      };
      return pactum
        .spec()
        .post('/auth/login')
        .withBody(dto)
        .expectStatus(400)
        .inspect();
    });

    it('Should fail login if user does not exist', () => {
      const dto: AuthDto = {
        email: 'someOtherUser@gmail.com',
        password: '1234',
      };
      return pactum
        .spec()
        .post('/auth/login')
        .withBody(dto)
        .expectStatus(400)
        .inspect();
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
        .inspect();
    });
  });

  describe('User', () => {
    it.todo('Should test user');
  });

  describe('Bookmarks', () => {
    it.todo('Should test bookmarks');
  });
});
