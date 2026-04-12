import type { FastifyBaseLogger } from 'fastify';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppError } from '../domain/errors.js';
import { abilityModifier, monsterIdFrom } from '../domain/monster.js';
import type { IMonsterService } from '../services/monster.service.interface.js';

// ── HTTP translation — maps domain errors to status codes ──────────────────────
function statusFor(error: AppError, log: FastifyBaseLogger): 400 | 404 | 409 | 500 {
  switch (error.kind) {
    case 'NotFound':        return 404;
    case 'ValidationError': return 400;
    case 'Conflict':        return 409;
    case 'InternalError':   return 500;
    default: {
      const _exhaustive: never = error;
      log.error({ kind: (_exhaustive as AppError).kind }, 'Unhandled AppError kind');
      return 500;
    }
  }
}

// ── Zod schemas ────────────────────────────────────────────────────────────────
const AbilityScoreSchema = z
  .object({ Score: z.number().int().min(1, 'Ability score must be between 1 and 30.').max(30, 'Ability score must be between 1 and 30.') })
  .transform(({ Score }) => ({ Score, Modifier: abilityModifier(Score) }));
const AbilityScoresSchema = z.object({
  Strength: AbilityScoreSchema,
  Dexterity: AbilityScoreSchema,
  Constitution: AbilityScoreSchema,
  Intelligence: AbilityScoreSchema,
  Wisdom: AbilityScoreSchema,
  Charisma: AbilityScoreSchema,
});
const EquipmentSchema = z.object({ Armor: z.string(), Weapons: z.string(), Other: z.string() });

const GeneralMonsterBodySchema = z.object({
  CharacterName: z.string().min(1, 'CharacterName is required'),
  Level: z.number().int(),
  Race: z.string(),
  Class: z.string(),
  Alignment: z.string(),
  HP: z.string(),
  AC: z.number().int(),
  Speed: z.string(),
  AbilityScores: AbilityScoresSchema,
  SavingThrows: z.record(z.string(), z.string()),
  Skills: z.record(z.string(), z.string()),
  Senses: z.string(),
  Languages: z.string(),
  SpecialTraits: z.record(z.string(), z.string()),
  Actions: z.record(z.string(), z.string()),
  Equipment: EquipmentSchema,
  Notes: z.string(),
});

const LegendaryActionsSchema = z.object({
  'Legendary Action Uses': z.string().regex(/^\d+$/, 'Legendary Action Uses must be a whole number'),
  Options: z.record(z.string(), z.string()),
});
const MythicTraitSchema = z.object({ Name: z.string(), Description: z.string() });

const LegendaryMonsterBodySchema = GeneralMonsterBodySchema.extend({
  DamageResistances: z.string(),
  DamageImmunities: z.string(),
  ConditionImmunities: z.string(),
  ChallengeRating: z.string(),
  ProficiencyBonus: z.string(),
  BonusActions: z.record(z.string(), z.string()),
  Reactions: z.record(z.string(), z.string()),
  LegendaryTraits: z.record(z.string(), z.string()),
  LegendaryActions: LegendaryActionsSchema,
  MythicTrait: MythicTraitSchema,
  LairActions: z.record(z.string(), z.string()),
  RegionalEffects: z.array(z.string()),
});

const MonsterResponseSchema = z.object({ id: z.string().uuid(), html: z.string() });
const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  instance: z.string(),
});
const MonsterIdParamSchema = z.object({ id: z.string().uuid('Invalid monster ID format') });

const MonsterQuerySchema = z
  .object({
    type: z.enum(['general', 'legendary']).optional(),
    levelMin: z.coerce.number().int().nonnegative().optional(),
    levelMax: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
  })
  .refine(
    ({ levelMin, levelMax }) =>
      levelMin === undefined || levelMax === undefined || levelMin <= levelMax,
    { message: 'levelMin must not exceed levelMax', path: ['levelMin'] },
  );

const MonsterPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.enum(['general', 'legendary']),
      characterName: z.string(),
      level: z.number().int().nullable(),
      createdAt: z.string(),
    }),
  ),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

// ── Factory — injects service dependency, returns a Fastify plugin ─────────────
export function monstersPlugin(service: IMonsterService): FastifyPluginCallbackZod {
  return function (app, _opts, done) {
    // POST /monsters/general
    app.post(
      '/monsters/general',
      {
        schema: {
          body: GeneralMonsterBodySchema,
          response: {
            201: MonsterResponseSchema,
            400: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.createGeneral(request.body);

        if (!result.ok) {
          const code = statusFor(result.error, request.log);
          return reply.status(code as 400).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: result.error.kind === 'ValidationError' ? result.error.message : 'Bad Request',
            status: code,
            instance: request.url,
          });
        }

        return reply.status(201).send({ id: result.value.id, html: result.value.html });
      },
    );

    // POST /monsters/legendary
    app.post(
      '/monsters/legendary',
      {
        schema: {
          body: LegendaryMonsterBodySchema,
          response: {
            201: MonsterResponseSchema,
            400: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.createLegendary(request.body);

        if (!result.ok) {
          const code = statusFor(result.error, request.log);
          return reply.status(code as 400).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: result.error.kind === 'ValidationError' ? result.error.message : 'Bad Request',
            status: code,
            instance: request.url,
          });
        }

        return reply.status(201).send({ id: result.value.id, html: result.value.html });
      },
    );

    // GET /monsters
    app.get(
      '/monsters',
      {
        schema: {
          querystring: MonsterQuerySchema,
          response: {
            200: MonsterPageSchema,
            400: ProblemDetailsSchema,
            500: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.query(request.query);

        if (!result.ok) {
          const code = statusFor(result.error, request.log);
          return reply.status(code as 500).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: result.error.kind === 'ValidationError' ? result.error.message : 'Internal Server Error',
            status: code,
            instance: request.url,
          });
        }

        return {
          ...result.value,
          items: result.value.items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          })),
        };
      },
    );

    // GET /monsters/:id
    app.get(
      '/monsters/:id',
      {
        schema: {
          params: MonsterIdParamSchema,
          response: {
            200: MonsterResponseSchema,
            404: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.getById(monsterIdFrom(request.params.id));

        if (!result.ok) {
          const code = statusFor(result.error, request.log);
          return reply.status(code as 404).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: `Monster ${request.params.id} not found.`,
            status: code,
            instance: request.url,
          });
        }

        return { id: result.value.id, html: result.value.html };
      },
    );

    done();
  };
}
