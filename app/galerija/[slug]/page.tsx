import { notFound } from 'next/navigation'
import { getGalleryBySlug } from '@/db/queries/galleries'
import GalleryClient from './GalleryClient'
import './gallery.css'

export const dynamic = 'force-dynamic'

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const gallery = await getGalleryBySlug(slug)

  if (!gallery) {
    notFound()
  }

  return (
    <GalleryClient
      slug={gallery.slug}
      title={gallery.title}
      eventDate={gallery.event_date}
      isPublic={gallery.is_public}
    />
  )
}
