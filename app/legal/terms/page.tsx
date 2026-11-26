import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/legal-page'
import { CONTACT_EMAIL, LOCATION } from '@/components/landing/site'

// À faire relire par un juriste avant le lancement.

export const metadata: Metadata = {
  title: { absolute: 'Terms of sale · Osho' },
  description: 'The terms that apply when you order a made-to-measure outfit from Osho.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of sale" updated="November 26, 2026">
      <p>
        These terms apply to every order placed with Osho, based in {LOCATION}, through the Osho
        app. By placing an order, you accept them.
      </p>

      <h2>Made-to-measure orders</h2>
      <p>
        Each outfit is cut and sewn for you, from the measurement profile you select when you order.
        Please check your measurements before ordering: the outfit is made from them exactly.
      </p>

      <h2>Prices and payment</h2>
      <p>
        The price of each design is shown in the app before you order. Payment is taken by card
        through Stripe when you confirm the order.
      </p>

      <h2>Tailoring and delivery time</h2>
      <p>
        Each design shows its tailoring time. Delivery time comes on top of it. These times are
        estimates; we keep you informed in the app if anything changes.
      </p>

      <h2>Cancellations</h2>
      <p>
        Because each outfit is made for you, an order can be cancelled only before tailoring starts.
        Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> as soon as possible.
      </p>

      <h2>Fit and defects</h2>
      <p>
        If your outfit has a defect, or does not match the measurements in the profile you used,
        write to us with photos. We review it with your tailor and offer an alteration, a remake or a
        refund depending on the case.
      </p>

      <h2>Contact</h2>
      <p>
        For any question about an order: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  )
}
