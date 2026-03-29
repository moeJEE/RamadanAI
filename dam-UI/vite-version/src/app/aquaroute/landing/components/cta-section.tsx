"use client"

import { ArrowRight, Waves, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function CTASection() {
  const navigate = useNavigate()

  return (
    <section id="cta" className="py-16 lg:py-24 bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Commencez l'analyse maintenant
          </h2>

          <p className="text-muted-foreground text-lg leading-relaxed">
            Accédez au dashboard interactif, consultez les prévisions météo,
            lancez des simulations de scénarios et dialoguez avec l'agent IA.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row pt-2">
            <Button size="lg" className="cursor-pointer" onClick={() => navigate('/dashboard')}>
              <Waves className="me-2 size-4" />
              Accéder au Dashboard
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
