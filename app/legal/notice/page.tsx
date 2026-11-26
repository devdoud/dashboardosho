import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/legal-page'
import { CONTACT_EMAIL, LOCATION } from '@/components/landing/site'

export const metadata: Metadata = {
  title: { absolute: 'Legal notice · Osho' },
  description: 'Publisher, hosting and credits for the Osho website.',
}

export default function NoticePage() {
  return (
    <LegalPage title="Legal notice" updated="November 26, 2026">
      <h2>Publisher</h2>
      <p>
        Osho, {LOCATION}, United States.
        <br />
        Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>Hosting</h2>
      <p>Vercel Inc., United States (website). Supabase Inc., United States (database).</p>

      <h2>Photo credits</h2>
      <p>
        The photos on this website come from Unsplash and are used under the Unsplash License. They
        illustrate styles and fabrics; they are not photos of Osho products. Screens of the Osho
        app are our own.
      </p>

      <h2>Trademarks</h2>
      <p>
        Vlisco is a trademark of its owner. App Store is a trademark of Apple Inc. Google Play is a
        trademark of Google LLC.
      </p>
    </LegalPage>
  )
}
