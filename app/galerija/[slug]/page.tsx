import { notFound } from 'next/navigation'
import { getGalleryBySlug } from '@/db/queries/galleries'
import { resolveTheme, parseThemeColumn } from '@/lib/gallery-themes'
import GalleryClient from './GalleryClient'
import './gallery.css'

export const dynamic = 'force-dynamic'

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams
  const gallery = await getGalleryBySlug(slug)

  if (!gallery) {
    notFound()
  }

  const resolved = resolveTheme(parseThemeColumn(gallery.theme))

  return (
    <GalleryClient
      slug={gallery.slug}
      title={gallery.title}
      eventDate={gallery.event_date}
      isPublic={gallery.is_public}
      theme={resolved}
      isPreview={preview === '1'}
    />
  )
}
