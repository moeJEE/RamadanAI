"use client"

import { useState } from 'react'
import { Menu, LayoutDashboard, X, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { ModeToggle } from '@/components/mode-toggle'
import { useNavigate } from 'react-router-dom'

const navigationItems = [
  { name: 'Accueil', href: '#hero' },
  { name: 'Fonctionnalités', href: '#features' },
  { name: 'Architecture', href: '#architecture' },
  { name: 'Contact', href: '#contact' },
]

const smoothScrollTo = (targetId: string) => {
  if (targetId.startsWith('#')) {
    const element = document.querySelector(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <a href="#hero" onClick={(e) => { e.preventDefault(); smoothScrollTo('#hero') }} className="flex items-center space-x-2 cursor-pointer">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Waves className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">AquaRoute AI</span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {navigationItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={(e) => { e.preventDefault(); smoothScrollTo(item.href) }}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden xl:flex items-center space-x-2">
          <ModeToggle variant="ghost" />
          <Button variant="outline" className="cursor-pointer" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button className="cursor-pointer" onClick={() => navigate('/dashboard')}>
            Commencer →
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col">
            <div className="flex flex-col h-full">
              <SheetHeader className="space-y-0 p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Waves className="h-4 w-4 text-primary" />
                  </div>
                  <SheetTitle className="text-lg font-semibold">AquaRoute AI</SheetTitle>
                  <div className="ml-auto flex items-center gap-2">
                    <ModeToggle variant="ghost" />
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="cursor-pointer h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <nav className="p-6 space-y-1">
                  {navigationItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      onClick={(e) => {
                        setIsOpen(false)
                        e.preventDefault()
                        setTimeout(() => smoothScrollTo(item.href), 100)
                      }}
                    >
                      {item.name}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="border-t p-6 space-y-3">
                <Button variant="outline" size="lg" className="w-full cursor-pointer" onClick={() => { setIsOpen(false); navigate('/dashboard') }}>
                  <LayoutDashboard className="size-4 mr-2" />
                  Dashboard
                </Button>
                <Button size="lg" className="w-full cursor-pointer" onClick={() => { setIsOpen(false); navigate('/dashboard') }}>
                  Commencer →
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
