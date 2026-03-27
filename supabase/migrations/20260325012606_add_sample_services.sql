/*
  # Agregar servicios de ejemplo

  1. Descripción
    - Agrega servicios de ejemplo para cada tenant
    - Incluye diferentes categorías: veterinaria, estética, guardería, etc.

  2. Servicios de ejemplo
    - Consulta veterinaria
    - Vacunación
    - Baño y peluquería
    - Corte de uñas
    - Guardería diaria
    - Adiestramiento básico
*/

-- Insertar servicios de ejemplo para cada tenant existente
INSERT INTO services (tenant_id, name, description, category, price, duration_minutes, is_active)
SELECT 
  t.id as tenant_id,
  s.name,
  s.description,
  s.category,
  s.price,
  s.duration_minutes,
  true as is_active
FROM tenants t
CROSS JOIN (
  VALUES 
    ('Consulta veterinaria', 'Consulta general con veterinario', 'Veterinaria', 350.00, 30),
    ('Vacunación', 'Aplicación de vacunas y desparasitación', 'Veterinaria', 250.00, 15),
    ('Baño completo', 'Baño, secado y perfumado', 'Estética', 400.00, 60),
    ('Baño y peluquería', 'Baño completo + corte de pelo', 'Estética', 600.00, 90),
    ('Corte de uñas', 'Corte y limado de uñas', 'Estética', 150.00, 15),
    ('Limpieza dental', 'Limpieza y profilaxis dental', 'Veterinaria', 800.00, 45),
    ('Guardería diaria', 'Cuidado y supervisión durante el día', 'Guardería', 300.00, 480),
    ('Guardería nocturna', 'Hospedaje con supervisión nocturna', 'Guardería', 450.00, 720),
    ('Adiestramiento básico', 'Sesión de entrenamiento de obediencia básica', 'Adiestramiento', 500.00, 60),
    ('Paseo', 'Paseo supervisado', 'Cuidado', 200.00, 30)
) AS s(name, description, category, price, duration_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM services 
  WHERE services.tenant_id = t.id 
  AND services.name = s.name
);
