import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY ?? '',
    fluxModel: process.env.NVIDIA_FLUX_MODEL ?? 'black-forest-labs/flux.1-schnell',
    chatterboxModel: process.env.NVIDIA_CHATTERBOX_MODEL ?? 'nvidia/chatterbox-tts',
    // Premium tier. Stronger reasoning model, gated behind an active trial/subscription.
    scriptModelPremium: process.env.NVIDIA_SCRIPT_MODEL_PREMIUM ?? 'deepseek-ai/deepseek-v4-pro',
    // Free tier. Solid general-purpose model, available to everyone with no subscription.
    scriptModelFree: process.env.NVIDIA_SCRIPT_MODEL_FREE ?? 'nvidia/nemotron-3-super-120b-a12b',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER as 's3' | 'cloudinary') ?? 's3',
    s3: {
      bucket: process.env.S3_BUCKET ?? '',
      region: process.env.S3_REGION ?? '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      endpoint: process.env.S3_ENDPOINT ?? '',
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    },
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
    planCode: process.env.PAYSTACK_PLAN_CODE ?? '',
    // Paystack wants amounts in the smallest currency unit (kobo for NGN, cents for USD).
    // This is the main-unit price. E.g. 10 for ₦10 or $10. Converted at request time.
    amount: Number(process.env.PAYSTACK_AMOUNT ?? 10),
    currency: process.env.PAYSTACK_CURRENCY ?? 'NGN',
  },

  // Both tiers use the same commercially-safe FLUX.1 Schnell model (Apache 2.0). FLUX.1
  // Dev was considered for a "better model" premium tier but its NVIDIA hosting is
  // explicitly non-commercial-use only, which would create a real licensing problem on a
  // paid product. Premium's differentiator is variety instead: more options to choose from.
  imagesPerSceneFree: Number(process.env.IMAGES_PER_SCENE_FREE ?? 1),
  imagesPerScenePremium: Number(process.env.IMAGES_PER_SCENE_PREMIUM ?? 2),

  isProduction: process.env.NODE_ENV === 'production',

  // Vercel sets VERCEL=1 on every deployment (serverless functions). Used to switch
  // connection-pool behavior in config/database.ts. See the comment there.
  isServerless: process.env.VERCEL === '1',
};
