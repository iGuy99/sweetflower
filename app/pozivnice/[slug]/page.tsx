import { getInvitationBySlug } from '@/db/queries/invitations'
import { notFound } from 'next/navigation'
import AmilaEmir from '@/components/pozivnice/AmilaEmir'
import ZaraRodjendan from '@/components/pozivnice/ZaraRodjendan'
import type { Invitation } from '@/db/queries/invitations'
import type { ComponentType } from 'react'

const COMPONENTS: Record<string, ComponentType<{ invitation: Invitation }>> = {
  AmilaEmir,
  ZaraRodjendan,
}

export default async function PozivnicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const invitation = await getInvitationBySlug(slug)
  if (!invitation) return notFound()

  const Component = COMPONENTS[invitation.component_name]
  if (!Component) return notFound()

  return <Component invitation={invitation} />
}
