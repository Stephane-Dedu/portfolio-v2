import type { Lang } from '../i18n/ui';

type Localized = Record<Lang, string>;
export type CertIconName = 'aws' | 'terraform' | 'kubernetes';

export const site = {
  name: 'Stéphane Dedu',
  domain: 'sdedu.cloud',
  role: 'DevOps · SRE · Cloud Engineer',
  pitch: {
    en: 'I got into infrastructure from the application side. After a year shipping Python microservices to Kubernetes, I now work on reliability, platform tooling and Kubernetes security.',
    fr: 'Je suis arrivé à l’infra par le côté applicatif : après un an à livrer des microservices Python sur Kubernetes, je travaille maintenant sur la fiabilité, l’outillage plateforme et la sécurité Kubernetes.',
  } as Localized,
  pitchEmphasis: {
    en: 'reliability, platform tooling and Kubernetes security',
    fr: 'la fiabilité, l’outillage plateforme et la sécurité Kubernetes',
  } as Localized,
  github: 'https://github.com/Stephane-Dedu',
  linkedin: 'https://www.linkedin.com/in/st%C3%A9phane-dedu-14579a266/',
  cv: '/CV_DEDU_STEPHANE_DEVOPS_ALTERNANCE.pdf',
  experience: [
    {
      role: { en: 'SRE (apprentice)', fr: 'SRE (alternance)' },
      company: 'Welcome to the Jungle',
      period: { en: 'Sep 2026 → present', fr: 'sept. 2026 → aujourd’hui' },
      current: true,
    },
    {
      role: { en: 'Backend & Agentic developer (apprentice)', fr: 'Développeur Backend & Agentic (alternance)' },
      company: 'Swapn',
      period: { en: 'Oct 2025 → Sep 2026', fr: 'oct. 2025 → sept. 2026' },
      details: {
        en: 'Async FastAPI microservices, PostgreSQL/pgvector, Redis, Celery and LLM agents on AWS Bedrock, deployed to Kubernetes with Helm, CI/CD and Prometheus monitoring. Bedrock costs cut by 40% (prompt caching, ElastiCache).',
        fr: 'Microservices FastAPI async, PostgreSQL/pgvector, Redis, Celery et agents LLM sur AWS Bedrock, déployés sur Kubernetes avec Helm, CI/CD et monitoring Prometheus. Coûts Bedrock réduits de 40 % (prompt caching, ElastiCache).',
      },
    },
  ] as { role: Localized; company: string; period: Localized; details?: Localized; current?: boolean }[],
  education: [
    {
      degree: { en: 'Master’s in DevOps, Cloud & Infrastructure', fr: 'Mastère DevOps, Cloud & Infrastructure' },
      school: 'Sup de Vinci',
      period: '2026 → 2028',
    },
  ] as { degree: Localized; school: string; period: string }[],
  // Newest first. verify: public Credly page
  certs: [
    {
      code: 'CKS',
      name: 'Certified Kubernetes Security Specialist',
      issuer: 'Linux Foundation',
      issued: { en: 'Jul 2026', fr: 'juil. 2026' },
      icon: 'kubernetes',
      verify: 'https://www.credly.com/badges/ed54f617-6eb1-499a-8fcc-968e5a9b1686',
    },
    {
      code: 'CKA',
      name: 'Certified Kubernetes Administrator',
      issuer: 'Linux Foundation',
      issued: { en: 'Mar 2026', fr: 'mars 2026' },
      icon: 'kubernetes',
      verify: 'https://www.credly.com/badges/38edcc44-ba5c-4762-8b19-335f286b3a96',
    },
    {
      code: 'SAA',
      name: 'AWS Solutions Architect – Associate',
      issuer: 'AWS',
      issued: { en: 'Jan 2026', fr: 'janv. 2026' },
      icon: 'aws',
      verify: 'https://www.credly.com/badges/393932de-9587-40b5-96c7-9cdc582aebe1',
    },
    {
      code: 'TFA',
      name: 'HashiCorp Terraform Associate (004)',
      issuer: 'HashiCorp',
      issued: { en: 'Jan 2026', fr: 'janv. 2026' },
      icon: 'terraform',
      verify: 'https://www.credly.com/badges/99d7c8f1-d7e1-4326-abe1-4d5f0916b8a5',
    },
  ] as { code: string; name: string; issuer: string; issued: Localized; icon: CertIconName; verify: string }[],
};

