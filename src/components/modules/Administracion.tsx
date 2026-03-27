import { Plus, Users, Shield, Settings, Bell, Key, Database, Mail, Phone, Calendar, Clock, MapPin, UserCog, Lock, Activity, FileText, Eye, Save, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { useState } from 'react';
import Table from '../ui/Table';
import Badge from '../ui/Badge';
import Tabs from '../ui/Tabs';
import Modal from '../ui/Modal';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import Autocomplete from '../ui/Autocomplete';
import RolesPermissions from './RolesPermissions';

const mockUsers = [
  {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan@petcore.com',
    role: 'Administrador',
    status: 'Activo',
    lastLogin: '2024-03-24 10:30',
  },
  {
    id: 2,
    name: 'María García',
    email: 'maria@petcore.com',
    role: 'Veterinario',
    status: 'Activo',
    lastLogin: '2024-03-24 09:15',
  },
  {
    id: 3,
    name: 'Carlos Ruiz',
    email: 'carlos@petcore.com',
    role: 'Aliado',
    status: 'Activo',
    lastLogin: '2024-03-23 16:45',
  },
];

export default function Administracion() {
  const [activeSection, setActiveSection] = useState('users');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userModalTab, setUserModalTab] = useState('general');

  const roleOptions = [
    { value: 'admin', label: 'Administrador', subtitle: 'Acceso total al sistema' },
    { value: 'vet', label: 'Veterinario', subtitle: 'Gestión de salud y consultas' },
    { value: 'partner', label: 'Aliado', subtitle: 'Gestión de su negocio' },
    { value: 'driver', label: 'Repartidor', subtitle: 'Entregas y logística' },
    { value: 'staff', label: 'Personal', subtitle: 'Operaciones básicas' },
  ];

  const locationOptions = [
    { value: 'center', label: 'Sucursal Centro' },
    { value: 'north', label: 'Sucursal Norte' },
    { value: 'south', label: 'Sucursal Sur' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Usuario',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: (value: string) => {
        const variants: any = {
          'Administrador': 'error',
          'Veterinario': 'info',
          'Aliado': 'warning',
          'Cliente': 'default',
        };
        return <Badge variant={variants[value] || 'default'}>{value}</Badge>;
      },
    },
    { key: 'lastLogin', label: 'Último acceso' },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => <Badge variant="success">{value}</Badge>,
    },
  ];

  const settingSections = [
    { icon: Settings, title: 'Configuración general', description: 'Nombre, logo, información del negocio' },
    { icon: Bell, title: 'Notificaciones', description: 'Configurar alertas y recordatorios automáticos' },
    { icon: Key, title: 'Seguridad', description: 'Autenticación, contraseñas y accesos' },
    { icon: Database, title: 'Respaldos', description: 'Copias de seguridad y restauración' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500 mt-1">
            Usuarios, roles, permisos y configuración del sistema
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: 'users',
            label: 'Usuarios',
            icon: Users,
            content: (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Gestiona los usuarios y sus permisos de acceso
                  </p>
                  <button
                    onClick={() => setShowNewUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Nuevo usuario
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">48</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Total usuarios</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">5</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Administradores</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">23</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Aliados</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">42</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Activos hoy</p>
                  </div>
                </div>

                <Table
                  columns={columns}
                  data={mockUsers}
                  onRowClick={(user) => setSelectedUser(user)}
                />
              </div>
            ),
          },
          {
            id: 'roles',
            label: 'Roles y permisos',
            icon: Shield,
            content: <RolesPermissions />,
          },
          {
            id: 'settings',
            label: 'Configuración',
            icon: Settings,
            content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settingSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <div key={section.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                            <p className="text-sm text-gray-500">{section.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-6">Información del negocio</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Nombre del negocio">
                      <Input defaultValue="PetCore" />
                    </FormField>
                    <FormField label="Email de contacto">
                      <Input type="email" defaultValue="contacto@petcore.com" />
                    </FormField>
                    <FormField label="Teléfono">
                      <Input type="tel" defaultValue="555-0123" />
                    </FormField>
                    <FormField label="Zona horaria">
                      <Select
                        options={[
                          { value: 'utc-6', label: 'UTC-6 (México)' },
                          { value: 'utc-5', label: 'UTC-5 (Colombia)' },
                          { value: 'utc-3', label: 'UTC-3 (Argentina)' },
                        ]}
                      />
                    </FormField>
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
                      Cancelar
                    </button>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
        title="Nuevo usuario"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowNewUserModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Crear usuario
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Nombre completo" required>
              <Input placeholder="Ej: Juan Pérez García" />
            </FormField>

            <FormField label="Email" required>
              <Input type="email" placeholder="usuario@petcore.com" />
            </FormField>

            <FormField label="Rol" required>
              <Autocomplete
                options={roleOptions}
                placeholder="Seleccionar rol..."
              />
            </FormField>

            <FormField label="Teléfono" required>
              <Input type="tel" placeholder="555-0123" />
            </FormField>

            <FormField label="Contraseña temporal" required>
              <Input type="password" placeholder="Mínimo 8 caracteres" />
            </FormField>

            <FormField label="Confirmar contraseña" required>
              <Input type="password" placeholder="Repetir contraseña" />
            </FormField>

            <FormField label="Sucursal asignada">
              <Autocomplete
                options={locationOptions}
                placeholder="Seleccionar sucursal..."
              />
            </FormField>

            <FormField label="Fecha de inicio">
              <Input type="date" />
            </FormField>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Permisos de acceso</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                <div>
                  <p className="text-sm font-medium text-gray-900">Ver dashboard</p>
                  <p className="text-xs text-gray-500">Acceso al panel principal</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" defaultChecked />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gestionar mascotas</p>
                  <p className="text-xs text-gray-500">Crear, editar y ver mascotas</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Acceso a finanzas</p>
                  <p className="text-xs text-gray-500">Ver reportes financieros</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gestionar usuarios</p>
                  <p className="text-xs text-gray-500">Administrar otros usuarios</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>Nota:</strong> El usuario recibirá un correo con las instrucciones para activar su cuenta y cambiar su contraseña.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null);
          setUserModalTab('general');
        }}
        title={selectedUser ? `Gestionar usuario: ${selectedUser.name}` : ''}
        size="xl"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 pb-6 border-b border-gray-200">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {selectedUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedUser.email}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant={selectedUser.role === 'Administrador' ? 'error' : 'info'}>
                        {selectedUser.role}
                      </Badge>
                      <Badge variant="success">{selectedUser.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200">
              <div className="flex gap-1">
                {[
                  { id: 'general', label: 'Información general', icon: UserCog },
                  { id: 'permissions', label: 'Permisos', icon: Shield },
                  { id: 'activity', label: 'Actividad', icon: Activity },
                  { id: 'settings', label: 'Configuración', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setUserModalTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        userModalTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {userModalTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Nombre completo" required>
                    <Input defaultValue={selectedUser.name} />
                  </FormField>

                  <FormField label="Email" required>
                    <Input type="email" defaultValue={selectedUser.email} />
                  </FormField>

                  <FormField label="Teléfono">
                    <Input type="tel" placeholder="555-0123" />
                  </FormField>

                  <FormField label="Rol" required>
                    <Select
                      options={[
                        { value: 'admin', label: 'Administrador' },
                        { value: 'vet', label: 'Veterinario' },
                        { value: 'partner', label: 'Aliado' },
                        { value: 'driver', label: 'Repartidor' },
                        { value: 'staff', label: 'Personal' },
                      ]}
                      defaultValue={selectedUser.role === 'Administrador' ? 'admin' : 'vet'}
                    />
                  </FormField>

                  <FormField label="Sucursal asignada">
                    <Select
                      options={locationOptions}
                      placeholder="Seleccionar sucursal..."
                    />
                  </FormField>

                  <FormField label="Departamento">
                    <Select
                      options={[
                        { value: 'admin', label: 'Administración' },
                        { value: 'health', label: 'Salud' },
                        { value: 'logistics', label: 'Logística' },
                        { value: 'sales', label: 'Ventas' },
                      ]}
                      placeholder="Seleccionar departamento..."
                    />
                  </FormField>

                  <FormField label="Fecha de ingreso">
                    <Input type="date" defaultValue="2024-01-15" />
                  </FormField>

                  <FormField label="Horario de trabajo">
                    <Input placeholder="Ej: Lun-Vie 9:00-18:00" />
                  </FormField>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Información adicional</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Dirección">
                      <Textarea placeholder="Dirección completa" />
                    </FormField>

                    <FormField label="Notas internas">
                      <Textarea placeholder="Comentarios sobre el usuario" />
                    </FormField>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                  <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Último acceso: {selectedUser.lastLogin}</p>
                    <p className="text-blue-700 mt-1">Sesión activa desde hace 2 horas</p>
                  </div>
                </div>
              </div>
            )}

            {userModalTab === 'permissions' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <strong>Rol actual:</strong> {selectedUser.role} - Los permisos se configuran según el rol asignado
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Permisos del sistema</h4>
                  <div className="space-y-4">
                    {[
                      {
                        category: 'Dashboard y reportes',
                        permissions: [
                          { id: 'view_dashboard', label: 'Ver dashboard principal', enabled: true },
                          { id: 'view_reports', label: 'Ver reportes y estadísticas', enabled: true },
                          { id: 'export_data', label: 'Exportar datos', enabled: false },
                        ],
                      },
                      {
                        category: 'Gestión de mascotas',
                        permissions: [
                          { id: 'view_pets', label: 'Ver mascotas', enabled: true },
                          { id: 'create_pets', label: 'Crear mascotas', enabled: true },
                          { id: 'edit_pets', label: 'Editar mascotas', enabled: true },
                          { id: 'delete_pets', label: 'Eliminar mascotas', enabled: false },
                        ],
                      },
                      {
                        category: 'Servicios y órdenes',
                        permissions: [
                          { id: 'view_orders', label: 'Ver órdenes', enabled: true },
                          { id: 'create_orders', label: 'Crear órdenes', enabled: true },
                          { id: 'modify_prices', label: 'Modificar precios', enabled: false },
                          { id: 'cancel_orders', label: 'Cancelar órdenes', enabled: false },
                        ],
                      },
                      {
                        category: 'Finanzas y pagos',
                        permissions: [
                          { id: 'view_payments', label: 'Ver pagos', enabled: true },
                          { id: 'process_refunds', label: 'Procesar reembolsos', enabled: false },
                          { id: 'view_financial_reports', label: 'Ver reportes financieros', enabled: false },
                        ],
                      },
                      {
                        category: 'Administración',
                        permissions: [
                          { id: 'manage_users', label: 'Gestionar usuarios', enabled: selectedUser.role === 'Administrador' },
                          { id: 'manage_roles', label: 'Gestionar roles y permisos', enabled: selectedUser.role === 'Administrador' },
                          { id: 'system_settings', label: 'Configuración del sistema', enabled: selectedUser.role === 'Administrador' },
                        ],
                      },
                    ].map((group) => (
                      <div key={group.category} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">{group.category}</h5>
                        <div className="space-y-3">
                          {group.permissions.map((permission) => (
                            <label key={permission.id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{permission.label}</span>
                              <div className="flex items-center gap-2">
                                {permission.enabled ? (
                                  <ToggleRight className="w-10 h-5 text-green-600 cursor-pointer" />
                                ) : (
                                  <ToggleLeft className="w-10 h-5 text-gray-400 cursor-pointer" />
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {userModalTab === 'activity' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">234</p>
                        <p className="text-xs text-gray-500">Acciones totales</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">42h</p>
                        <p className="text-xs text-gray-500">Tiempo activo</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">15</p>
                        <p className="text-xs text-gray-500">Días activo</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Actividad reciente</h4>
                  <div className="space-y-3">
                    {[
                      { action: 'Inició sesión', time: 'Hace 2 horas', icon: Key, color: 'green' },
                      { action: 'Actualizó perfil de mascota #1234', time: 'Hace 3 horas', icon: FileText, color: 'blue' },
                      { action: 'Creó nueva orden #5678', time: 'Hace 5 horas', icon: Plus, color: 'primary' },
                      { action: 'Procesó pago de $450', time: 'Ayer a las 16:30', icon: Activity, color: 'green' },
                      { action: 'Modificó configuración de usuario', time: 'Ayer a las 14:20', icon: Settings, color: 'gray' },
                      { action: 'Exportó reporte mensual', time: '2 días atrás', icon: FileText, color: 'blue' },
                    ].map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-8 h-8 bg-${item.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 text-${item.color}-600`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Historial de sesiones</h4>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {[
                      { device: 'Chrome en Windows', location: 'Ciudad de México, MX', ip: '192.168.1.100', time: selectedUser.lastLogin },
                      { device: 'Safari en iPhone', location: 'Ciudad de México, MX', ip: '192.168.1.101', time: '2024-03-23 08:15' },
                      { device: 'Chrome en Windows', location: 'Ciudad de México, MX', ip: '192.168.1.100', time: '2024-03-22 14:30' },
                    ].map((session, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{session.device}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {session.location}
                              </p>
                              <p className="text-xs text-gray-500">IP: {session.ip}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">{session.time}</p>
                          {index === 0 && (
                            <Badge variant="success" className="mt-1">Activa</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {userModalTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Estado de la cuenta</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Cuenta activa</p>
                          <p className="text-xs text-gray-500">El usuario puede acceder al sistema</p>
                        </div>
                      </div>
                      <ToggleRight className="w-10 h-5 text-green-600 cursor-pointer" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email verificado</p>
                          <p className="text-xs text-gray-500">Confirmado el 15 de enero, 2024</p>
                        </div>
                      </div>
                      <Badge variant="success">Verificado</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Bell className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Notificaciones</p>
                          <p className="text-xs text-gray-500">Recibe notificaciones por email</p>
                        </div>
                      </div>
                      <ToggleRight className="w-10 h-5 text-green-600 cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Seguridad</h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Lock className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">Restablecer contraseña</p>
                          <p className="text-xs text-gray-500">Enviar enlace de recuperación al usuario</p>
                        </div>
                      </div>
                      <span className="text-sm text-primary-600 font-medium">Enviar →</span>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Key className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">Cerrar todas las sesiones</p>
                          <p className="text-xs text-gray-500">Forzar cierre de sesión en todos los dispositivos</p>
                        </div>
                      </div>
                      <span className="text-sm text-primary-600 font-medium">Cerrar →</span>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">Ver registro de auditoría</p>
                          <p className="text-xs text-gray-500">Historial completo de acciones</p>
                        </div>
                      </div>
                      <span className="text-sm text-primary-600 font-medium">Ver →</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-red-900 mb-4">Zona de peligro</h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-red-900">Suspender cuenta</p>
                          <p className="text-xs text-red-600">El usuario no podrá acceder temporalmente</p>
                        </div>
                      </div>
                      <span className="text-sm text-red-600 font-medium">Suspender</span>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-red-900">Eliminar usuario</p>
                          <p className="text-xs text-red-600">Acción irreversible, se eliminarán todos los datos</p>
                        </div>
                      </div>
                      <span className="text-sm text-red-600 font-medium">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
