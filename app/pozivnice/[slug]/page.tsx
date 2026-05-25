import { getInvitationBySlug } from '@/db/queries/invitations'
import { notFound } from 'next/navigation'
import AmilaEmir from '@/components/pozivnice/AmilaEmir'
import ZaraRodjendan from '@/components/pozivnice/ZaraRodjendan'
import AmarRodjendan from '@/components/pozivnice/AmarRodjendan'
import type { Invitation } from '@/db/queries/invitations'
import type { ComponentType } from 'react'
import type { Metadata } from 'next'

const COMPONENTS: Record<string, ComponentType<{ invitation: Invitation }>> = {
  AmilaEmir,
  ZaraRodjendan,
  AmarRodjendan,
}

const BASE_URL = 'https://sweetflowerevents.com'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const invitation = await getInvitationBySlug(slug)
  if (!invitation) return {}

  const names = [invitation.bride_name, invitation.groom_name].filter(Boolean).join(' & ')
  const title = `${names} — Pozivnica`
  const imageUrl = `${BASE_URL}/pozivnice/${slug}/hero.jpg`

  return {
    title,
    openGraph: {
      title,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      url: `${BASE_URL}/pozivnice/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [imageUrl],
    },
  }
}

export default async function PozivnicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const invitation = await getInvitationBySlug(slug)
  if (!invitation) return notFound()

  const Component = COMPONENTS[invitation.component_name]
  if (!Component) return notFound()

  return <Component invitation={invitation} />
}
