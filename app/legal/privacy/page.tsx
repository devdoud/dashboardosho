import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/legal-page'
import { CONTACT_EMAIL, LOCATION } from '@/components/landing/site'

// Texte rédigé d'après les données réellement traitées par l'app et le
// dashboard (types/database.ts). À faire relire par un juriste avant le
// lancement, notamment pour les lois des États où Osho vend.

export const metadata: Metadata = {
  title: { absolute: 'Privacy policy · Osho' },
  description: 'What personal data Osho collects, why, who processes it, and how to exercise your rights.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 26, 2026">
      <p>
        Osho (&ldquo;we&rdquo;) makes made-to-measure clothing, based in {LOCATION}. This policy
        explains what personal data we collect through the Osho app and website, why we use it, and
        the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your name, email address and phone number.</li>
        <li>
          <strong>Measurements:</strong> the height, weight and body measurements saved in each
          measurement profile you create, including profiles you create for someone else.
        </li>
        <li>
          <strong>Front photo:</strong> if you choose to add one, it is used only to estimate your
          measurements. What we keep in your profile are the resulting measurements.
        </li>
        <li><strong>Orders:</strong> the designs you order, your options, and the delivery address.</li>
        <li>
          <strong>Payments:</strong> handled by Stripe. We receive the payment status and a payment
          reference, never your full card number.
        </li>
        <li><strong>Reviews:</strong> the rating and comment you leave for a tailor.</li>
        <li><strong>Notifications:</strong> a device token, if you allow push notifications.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To cut and sew your outfit to your measurements and deliver it to you.</li>
        <li>To take payment and keep the records the law requires.</li>
        <li>To tell you about your order (confirmation, progress, delivery).</li>
        <li>To answer your questions and handle any problem with an order.</li>
      </ul>
      <p>We do not sell your personal data, and we do not use it for third-party advertising.</p>

      <h2>Who processes it</h2>
      <p>
        The tailor assigned to your order sees the measurements and options needed to sew it. We
        also rely on service providers who process data on our behalf: Supabase (database and
        account login), Stripe (payments), Google Firebase (push notifications) and Vercel (website
        hosting).
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account data while your account is open. Order and payment records are kept
        as long as tax and accounting rules require. You can ask us to delete a measurement profile
        at any time.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete your personal data, or to close your account, by
        writing to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We answer within 30
        days.
      </p>

      <h2>Children</h2>
      <p>
        Osho accounts are for adults. A parent or guardian may create a measurement profile for
        their child from their own account.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we update the date at the top of this page and tell you in the app
        when the change matters.
      </p>
    </LegalPage>
  )
}
