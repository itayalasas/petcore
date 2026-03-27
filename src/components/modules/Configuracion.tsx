import { Save, Sliders, Globe, Mail, Bell, Shield, Database, Palette, Zap, DollarSign, Building2, MapPin, Clock, Plus, CreditCard as Edit2, Trash2, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { FormField, Input, Textarea } from '../ui/FormField';
import Select from '../ui/Select';
import SubscriptionCard from '../ui/SubscriptionCard';
import ModuleLicensingCard from '../ui/ModuleLicensingCard';
import SystemParameters from './SystemParameters';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('general');

  const [sucursales, setSucursales] = useState([
    {
      id: 1,
      nombre: 'Sucursal Centro',
      direccion: 'Av. Reforma 123, Col. Centro, CDMX',
      telefono: '555-0100',
      email: 'centro@petcare.com',
      horario: '9:00 - 18:00',
      esPrincipal: true,
      activa: true,
    },
    {
      id: 2,
      nombre: 'Sucursal Sur',
      direccion: 'Periférico Sur 456, Col. Jardines, CDMX',
      telefono: '555-0200',
      email: 'sur@petcare.com',
      horario: '8:00 - 20:00',
      esPrincipal: false,
      activa: true,
    },
  ]);

  const tabs = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'parametros', label: 'Parametros', icon: Settings2 },
    { id: 'licencias', label: 'Licencias', icon: Shield },
    { id: 'empresa', label: 'Empresa', icon: Globe },
    { id: 'sucursales', label: 'Sucursales', icon: Building2 },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'pagos', label: 'Pagos', icon: DollarSign },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
    { id: 'integraciones', label: 'Integraciones', icon: Zap },
    { id: 'avanzado', label: 'Avanzado', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuración del sistema</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los parámetros y configuraciones de la plataforma
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
          <Save className="w-5 h-5" />
          Guardar cambios
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Nombre de la aplicación" required>
                  <Input defaultValue="PetCare Pro" placeholder="Nombre del sistema" />
                </FormField>

                <FormField label="Idioma predeterminado" required>
                  <Select
                    options={[
                      { value: 'es', label: 'Español' },
                      { value: 'en', label: 'English' },
                      { value: 'pt', label: 'Português' },
                    ]}
                    defaultValue="es"
                  />
                </FormField>

                <FormField label="Zona horaria" required>
                  <Select
                    options={[
                      { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
                      { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
                      { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
                      { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
                    ]}
                    defaultValue="America/Mexico_City"
                  />
                </FormField>

                <FormField label="Moneda" required>
                  <Select
                    options={[
                      { value: 'MXN', label: 'Peso Mexicano (MXN)' },
                      { value: 'USD', label: 'Dólar (USD)' },
                      { value: 'EUR', label: 'Euro (EUR)' },
                    ]}
                    defaultValue="MXN"
                  />
                </FormField>

                <FormField label="Formato de fecha">
                  <Select
                    options={[
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                    ]}
                    defaultValue="DD/MM/YYYY"
                  />
                </FormField>

                <FormField label="Formato de hora">
                  <Select
                    options={[
                      { value: '12h', label: '12 horas (AM/PM)' },
                      { value: '24h', label: '24 horas' },
                    ]}
                    defaultValue="12h"
                  />
                </FormField>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Opciones del sistema</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Modo de mantenimiento</span>
                      <p className="text-xs text-gray-500">Deshabilitar acceso temporal al sistema</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Registro de usuarios habilitado</span>
                      <p className="text-xs text-gray-500">Permitir que nuevos usuarios se registren</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Modo debug</span>
                      <p className="text-xs text-gray-500">Mostrar información de depuración en logs</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parametros' && (
            <SystemParameters />
          )}

          {activeTab === 'licencias' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-900">Vista informativa</p>
                <p className="text-sm text-blue-700 mt-1">
                  La suscripción y las licencias modulares de esta empresa se administran desde la consola de plataforma y se validan al iniciar sesión.
                </p>
              </div>
              <SubscriptionCard />
              <ModuleLicensingCard />
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Nombre de la empresa" required>
                  <Input defaultValue="PetCare Services S.A." placeholder="Razón social" />
                </FormField>

                <FormField label="RFC / Tax ID" required>
                  <Input defaultValue="PCS890123ABC" placeholder="Identificador fiscal" />
                </FormField>

                <FormField label="Teléfono principal" required>
                  <Input type="tel" defaultValue="555-0123" placeholder="Teléfono de contacto" />
                </FormField>

                <FormField label="Email de contacto" required>
                  <Input type="email" defaultValue="contacto@petcare.com" placeholder="Email principal" />
                </FormField>

                <FormField label="Sitio web">
                  <Input type="url" defaultValue="https://petcare.com" placeholder="URL del sitio web" />
                </FormField>

                <FormField label="País" required>
                  <Select
                    options={[
                      { value: 'MX', label: 'México' },
                      { value: 'US', label: 'Estados Unidos' },
                      { value: 'ES', label: 'España' },
                    ]}
                    defaultValue="MX"
                  />
                </FormField>
              </div>

              <FormField label="Dirección completa" required>
                <Textarea defaultValue="Av. Insurgentes Sur 1234, Col. Del Valle, CDMX" placeholder="Dirección fiscal" />
              </FormField>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Logo y branding</h3>
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Logo principal">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <Palette className="w-8 h-8 text-gray-400" />
                      </div>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                        Subir logo
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Color primario">
                    <div className="flex items-center gap-3">
                      <input type="color" defaultValue="#059669" className="w-12 h-10 rounded border border-gray-300" />
                      <Input defaultValue="#059669" placeholder="#000000" />
                    </div>
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sucursales' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Sucursales activas</h3>
                  <p className="text-xs text-gray-500 mt-1">Gestiona las ubicaciones de tu negocio</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  Nueva sucursal
                </button>
              </div>

              <div className="grid gap-4">
                {sucursales.map((sucursal) => (
                  <div key={sucursal.id} className="border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          sucursal.esPrincipal ? 'bg-primary-100' : 'bg-gray-100'
                        }`}>
                          <Building2 className={`w-6 h-6 ${
                            sucursal.esPrincipal ? 'text-primary-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{sucursal.nombre}</h4>
                            {sucursal.esPrincipal && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                                Principal
                              </span>
                            )}
                            {!sucursal.activa && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              {sucursal.direccion}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 flex-shrink-0" />
                                {sucursal.telefono}
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                {sucursal.email}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              Horario: {sucursal.horario}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!sucursal.esPrincipal && (
                          <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                        Ver detalles y configuración →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Agregar nueva sucursal</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Nombre de la sucursal" required>
                      <Input placeholder="Ej: Sucursal Norte" />
                    </FormField>

                    <FormField label="Código interno">
                      <Input placeholder="Ej: SUC-001" />
                    </FormField>

                    <FormField label="Teléfono" required>
                      <Input type="tel" placeholder="555-1234" />
                    </FormField>

                    <FormField label="Email de contacto" required>
                      <Input type="email" placeholder="sucursal@petcare.com" />
                    </FormField>

                    <FormField label="Horario de atención" required>
                      <Input placeholder="Ej: Lun-Vie 9:00-18:00" />
                    </FormField>

                    <FormField label="Capacidad máxima">
                      <Input type="number" placeholder="Mascotas por día" />
                    </FormField>
                  </div>

                  <FormField label="Dirección completa" required>
                    <Textarea placeholder="Calle, número, colonia, código postal, ciudad" />
                  </FormField>

                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Ciudad" required>
                      <Input placeholder="Ciudad de México" />
                    </FormField>

                    <FormField label="Estado" required>
                      <Select
                        options={[
                          { value: 'CDMX', label: 'Ciudad de México' },
                          { value: 'MEX', label: 'Estado de México' },
                          { value: 'JAL', label: 'Jalisco' },
                          { value: 'NL', label: 'Nuevo León' },
                        ]}
                        placeholder="Selecciona estado"
                      />
                    </FormField>

                    <FormField label="Código postal" required>
                      <Input placeholder="12345" />
                    </FormField>

                    <FormField label="País" required>
                      <Select
                        options={[
                          { value: 'MX', label: 'México' },
                          { value: 'US', label: 'Estados Unidos' },
                          { value: 'ES', label: 'España' },
                        ]}
                        defaultValue="MX"
                      />
                    </FormField>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Servicios disponibles</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                        <span className="text-sm text-gray-700">Consulta veterinaria</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                        <span className="text-sm text-gray-700">Peluquería</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                        <span className="text-sm text-gray-700">Guardería</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                        <span className="text-sm text-gray-700">Hotel</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                        <span className="text-sm text-gray-700">Cirugía</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                        <span className="text-sm text-gray-700">Emergencias 24h</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Opciones</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                        <div>
                          <span className="text-sm text-gray-700 font-medium">Establecer como sucursal principal</span>
                          <p className="text-xs text-gray-500">Esta será la ubicación predeterminada</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                        <div>
                          <span className="text-sm text-gray-700 font-medium">Sucursal activa</span>
                          <p className="text-xs text-gray-500">Visible para clientes y disponible para reservas</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                        <div>
                          <span className="text-sm text-gray-700 font-medium">Permitir reservas en línea</span>
                          <p className="text-xs text-gray-500">Los clientes pueden agendar citas desde la app</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Cancelar
                    </button>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                      Guardar sucursal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notificaciones' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Notificaciones por email</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Nuevas reservas</span>
                      <p className="text-xs text-gray-500">Notificar cuando se crea una nueva reserva</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Nuevos clientes</span>
                      <p className="text-xs text-gray-500">Notificar cuando se registra un nuevo cliente</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Pagos recibidos</span>
                      <p className="text-xs text-gray-500">Notificar cuando se recibe un pago</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Recordatorios de citas</span>
                      <p className="text-xs text-gray-500">Enviar recordatorio 24h antes de cada cita</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">WhatsApp Business</h3>
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Número de WhatsApp Business">
                    <Input type="tel" placeholder="+52 55 1234 5678" />
                  </FormField>
                  <FormField label="API Token">
                    <Input type="password" placeholder="Token de acceso a API" />
                  </FormField>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Habilitar mensajes por WhatsApp</span>
                      <p className="text-xs text-gray-500">Enviar confirmaciones y recordatorios por WhatsApp</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pagos' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Métodos de pago</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <span className="text-sm text-gray-700 font-medium">Efectivo</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <span className="text-sm text-gray-700 font-medium">Tarjeta de crédito/débito</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <span className="text-sm text-gray-700 font-medium">Transferencia bancaria</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                    <span className="text-sm text-gray-700 font-medium">PayPal</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Stripe</h3>
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Publishable Key">
                    <Input placeholder="pk_live_..." />
                  </FormField>
                  <FormField label="Secret Key">
                    <Input type="password" placeholder="sk_live_..." />
                  </FormField>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                    <span className="text-sm text-gray-700 font-medium">Activar modo de prueba</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Configuración de facturación</h3>
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Impuesto por defecto (%)">
                    <Input type="number" defaultValue="16" placeholder="16" />
                  </FormField>
                  <FormField label="Política de cancelación (horas)">
                    <Input type="number" defaultValue="24" placeholder="24" />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Servidor SMTP" required>
                  <Input defaultValue="smtp.gmail.com" placeholder="smtp.ejemplo.com" />
                </FormField>

                <FormField label="Puerto SMTP" required>
                  <Input type="number" defaultValue="587" placeholder="587" />
                </FormField>

                <FormField label="Usuario SMTP" required>
                  <Input type="email" defaultValue="notificaciones@petcare.com" placeholder="usuario@ejemplo.com" />
                </FormField>

                <FormField label="Contraseña SMTP" required>
                  <Input type="password" placeholder="••••••••" />
                </FormField>

                <FormField label="Remitente por defecto" required>
                  <Input defaultValue="PetCare <noreply@petcare.com>" placeholder="Nombre <email@ejemplo.com>" />
                </FormField>

                <FormField label="Email de respuesta">
                  <Input type="email" defaultValue="soporte@petcare.com" placeholder="soporte@ejemplo.com" />
                </FormField>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Opciones de email</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <span className="text-sm text-gray-700 font-medium">Usar SSL/TLS</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <span className="text-sm text-gray-700 font-medium">Verificar certificado SSL</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Enviar email de prueba
                </button>
              </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Políticas de contraseña</h3>
                <div className="space-y-4">
                  <FormField label="Longitud mínima de contraseña">
                    <Input type="number" defaultValue="8" />
                  </FormField>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                      <span className="text-sm text-gray-700 font-medium">Requerir mayúsculas</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                      <span className="text-sm text-gray-700 font-medium">Requerir números</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                      <span className="text-sm text-gray-700 font-medium">Requerir caracteres especiales</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Autenticación de dos factores (2FA)</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Requerir 2FA para administradores</span>
                      <p className="text-xs text-gray-500">Obligatorio para usuarios con permisos de administrador</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Permitir 2FA opcional para todos los usuarios</span>
                      <p className="text-xs text-gray-500">Los usuarios pueden habilitar 2FA en su perfil</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Sesiones</h3>
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Tiempo de expiración de sesión (minutos)">
                    <Input type="number" defaultValue="120" />
                  </FormField>
                  <FormField label="Máximo de sesiones simultáneas por usuario">
                    <Input type="number" defaultValue="3" />
                  </FormField>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Seguridad avanzada</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Bloquear después de intentos fallidos</span>
                      <p className="text-xs text-gray-500">Bloquear cuenta después de 5 intentos fallidos de login</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Registro de actividad</span>
                      <p className="text-xs text-gray-500">Mantener registro de todas las acciones importantes</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integraciones' && (
            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                        <p className="text-sm text-gray-500 mt-1">Sincroniza citas con Google Calendar</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                      Conectar
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Bell className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">WhatsApp Business API</h3>
                        <p className="text-sm text-gray-500 mt-1">Envía mensajes automáticos por WhatsApp</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Configurar
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Stripe</h3>
                        <p className="text-sm text-gray-500 mt-1">Procesa pagos con tarjeta</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-2">
                          Conectado
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Gestionar
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">SendGrid</h3>
                        <p className="text-sm text-gray-500 mt-1">Servicio de email transaccional</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                      Conectar
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Zapier</h3>
                        <p className="text-sm text-gray-500 mt-1">Conecta con miles de aplicaciones</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                      Conectar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'avanzado' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Configuración avanzada</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Estas configuraciones son para usuarios avanzados. Cambios incorrectos pueden afectar el funcionamiento del sistema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField label="Límite de API requests por minuto">
                  <Input type="number" defaultValue="100" />
                </FormField>

                <FormField label="Tamaño máximo de archivos (MB)">
                  <Input type="number" defaultValue="10" />
                </FormField>

                <FormField label="Nivel de logs">
                  <Select
                    options={[
                      { value: 'error', label: 'Error' },
                      { value: 'warning', label: 'Warning' },
                      { value: 'info', label: 'Info' },
                      { value: 'debug', label: 'Debug' },
                    ]}
                    defaultValue="info"
                  />
                </FormField>

                <FormField label="Retención de logs (días)">
                  <Input type="number" defaultValue="30" />
                </FormField>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Base de datos</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900">Backup automático</span>
                      <p className="text-xs text-gray-500">Última copia: Hace 2 horas</p>
                    </div>
                    <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white text-sm font-medium">
                      Crear backup ahora
                    </button>
                  </div>

                  <FormField label="Frecuencia de backups">
                    <Select
                      options={[
                        { value: 'hourly', label: 'Cada hora' },
                        { value: 'daily', label: 'Diario' },
                        { value: 'weekly', label: 'Semanal' },
                      ]}
                      defaultValue="daily"
                    />
                  </FormField>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Caché</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900">Limpiar caché del sistema</span>
                      <p className="text-xs text-gray-500">Elimina todos los datos en caché</p>
                    </div>
                    <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                      Limpiar caché
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
