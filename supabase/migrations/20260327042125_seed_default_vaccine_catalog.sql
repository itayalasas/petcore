/*
  # Seed Default Vaccine Catalog

  This creates a function to seed default vaccines for a tenant.
  Vaccines are seeded per-tenant when they access the catalog.

  Common vaccines for dogs and cats included.
*/

CREATE OR REPLACE FUNCTION seed_tenant_vaccines(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO vaccine_catalog (tenant_id, name, description, species, manufacturer, price, interval_days, required_doses, is_required, min_age_weeks)
  SELECT 
    p_tenant_id,
    v.name,
    v.description,
    v.species::text[],
    v.manufacturer,
    v.price,
    v.interval_days,
    v.required_doses,
    v.is_required,
    v.min_age_weeks
  FROM (VALUES
    ('Rabia', 'Vacuna antirabica obligatoria', '{perro,gato}', 'Varios', 250.00, 365, 1, true, 12),
    ('Polivalente Canina (DHPPI)', 'Distemper, Hepatitis, Parvovirus, Parainfluenza', '{perro}', 'Nobivac/Vanguard', 350.00, 365, 3, true, 6),
    ('Parvovirus', 'Vacuna contra parvovirus canino', '{perro}', 'Varios', 280.00, 365, 2, true, 6),
    ('Leptospirosis', 'Vacuna contra leptospira', '{perro}', 'Varios', 300.00, 365, 2, false, 8),
    ('Bordetella (Tos de las perreras)', 'Vacuna contra tos de las perreras', '{perro}', 'Varios', 250.00, 180, 1, false, 8),
    ('Triple Felina', 'Rinotraqueitis, Calicivirus, Panleucopenia', '{gato}', 'Felocell/Purevax', 320.00, 365, 2, true, 8),
    ('Leucemia Felina (FeLV)', 'Vacuna contra leucemia felina', '{gato}', 'Purevax', 380.00, 365, 2, false, 9),
    ('Giardia', 'Vacuna contra giardia', '{perro,gato}', 'Varios', 220.00, 365, 2, false, 8),
    ('Influenza Canina', 'Vacuna contra influenza canina H3N8/H3N2', '{perro}', 'Varios', 300.00, 365, 2, false, 8),
    ('PIF (Peritonitis Infecciosa Felina)', 'Vacuna intranasal contra PIF', '{gato}', 'Primucell', 400.00, 365, 2, false, 16)
  ) AS v(name, description, species, manufacturer, price, interval_days, required_doses, is_required, min_age_weeks)
  WHERE NOT EXISTS (
    SELECT 1 FROM vaccine_catalog vc WHERE vc.tenant_id = p_tenant_id AND vc.name = v.name
  );
END;
$$;
