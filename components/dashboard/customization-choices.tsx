import Image from 'next/image'
import { Scissors, Sparkles, Layers, type LucideIcon } from 'lucide-react'

interface CustomizationDetails {
  tissu?: string
  tissu_image?: string
  etape2?: string
  etape2_image?: string
  etape3?: string
  etape3_image?: string
  category?: string
  // ancienne structure (rétrocompatibilité)
  broderie?: string
  finition?: string
  [key: string]: unknown
}

interface ChoiceCardProps {
  label: string
  name: string
  imageUrl?: string
  icon: LucideIcon
}

function ChoiceCard({ label, name, imageUrl, icon: Icon }: ChoiceCardProps) {
  if (!name) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2.5">
      <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{name}</p>
      </div>
    </div>
  )
}

interface CustomizationChoicesProps {
  details: CustomizationDetails | null | undefined
}

export function CustomizationChoices({ details }: CustomizationChoicesProps) {
  if (!details) return null

  // Normalise pour prendre en charge l'ancienne et la nouvelle structure
  const tissu    = details.tissu
  const tissuImg = details.tissu_image

  const etape2    = details.etape2 ?? details.broderie
  const etape2Img = details.etape2_image

  const etape3    = details.etape3 ?? details.finition
  const etape3Img = details.etape3_image

  if (!tissu && !etape2 && !etape3) return null

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <ChoiceCard label="Tissu choisi"   name={tissu  ?? ''} imageUrl={tissuImg}  icon={Layers} />
      <ChoiceCard label="Broderie"       name={etape2 ?? ''} imageUrl={etape2Img} icon={Scissors} />
      <ChoiceCard label="Finition"       name={etape3 ?? ''} imageUrl={etape3Img} icon={Sparkles} />
    </div>
  )
}
