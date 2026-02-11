
-- Festival team med "Se billettstatistikk" skal kunne lese tickets
CREATE POLICY "Festival team with ticket stats can read tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (public.can_see_ticket_stats_any());
