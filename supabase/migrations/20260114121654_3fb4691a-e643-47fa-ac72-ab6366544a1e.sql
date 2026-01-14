UPDATE festival_sections 
SET content_json = jsonb_build_object(
  'content', jsonb_build_object(
    'title', 'Hvem er vi?',
    'text', '<div class="space-y-8 text-center max-w-2xl mx-auto">
  <p class="text-xl md:text-2xl leading-relaxed text-foreground/90">
    <strong>GIGGEN</strong> startet med et sterkt ønske om å spille mer musikk live. Etter hvert vokste det til et større engasjement – for alle som vil skape flere scener, eller løfte fram de som allerede finnes.
  </p>
  
  <div class="py-4">
    <p class="text-2xl md:text-3xl font-display text-accent mb-3">GIGGEN er et tankesett.</p>
    <p class="text-lg text-foreground/80 leading-relaxed">
      Vi hyller de som tar beslutningene i egne hender. De som ikke venter på at jobber og muligheter skal bli servert, men skaper dem selv.
    </p>
  </div>
  
  <div class="py-4">
    <p class="text-2xl md:text-3xl font-display text-accent mb-3">Samtidig er GIGGEN et produkt.</p>
    <p class="text-lg text-foreground/80 leading-relaxed">
      I dag er det en plattform der du blant annet kan bli kjent med mini-festivalen vår.
    </p>
  </div>
  
  <p class="text-lg text-foreground/70 leading-relaxed">
    Festivalen markerer starten på en ny måte å følge band, artister og musikere på. Du skal ikke trenge stipend, priser eller bransjestempel for å fortelle historien din. Og du skal ikke måtte forstå algoritmer eller kjempe om oppmerksomhet i et evig scroll.
  </p>
  
  <div class="pt-6 border-t border-accent/20">
    <p class="text-2xl md:text-3xl font-display text-foreground">
      Først og fremst er vi <span class="text-accent">GIGGEN</span>.
    </p>
    <p class="text-xl text-foreground/90 mt-2">
      Og vi er klare for å gi musikkbransjen et friskt pust.
    </p>
  </div>
</div>'
  ),
  'presentation', jsonb_build_object(
    'layout_variant', 'editorial',
    'animation', 'subtle'
  )
),
title = 'Hvem er vi?',
updated_at = now()
WHERE id = 'ebaec047-ef9c-432d-9f44-21a4d0f55ac8'