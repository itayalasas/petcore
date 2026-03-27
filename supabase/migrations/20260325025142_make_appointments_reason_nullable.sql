/*
  # Hacer la columna reason opcional en appointments

  1. Descripción
    - Cambia la columna reason de appointments para que acepte NULL
    - El motivo de la cita es opcional ya que el servicio lo describe

  2. Cambios
    - ALTER COLUMN reason DROP NOT NULL
*/

-- Hacer que la columna reason acepte valores NULL
ALTER TABLE appointments 
ALTER COLUMN reason DROP NOT NULL;

-- Agregar valor por defecto vacío para nuevas citas
ALTER TABLE appointments 
ALTER COLUMN reason SET DEFAULT '';
